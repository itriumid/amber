// The list on screen: the records, kept in step with this device's storage, and the history that
// lets the last actions be undone.

import { prefersReducedMotion } from 'svelte/motion';
import { NEWER_FORMAT_PROBLEM, NEWER_TAB_PROBLEM, SAVE_PROBLEM } from './content';
import { Clock } from './model/clock';
import { FORMAT_VERSION, migrate, readEntity } from './model/format';
import { updates } from './updates.svelte';
import {
	merge,
	restore,
	undo as undoChanges,
	type Change,
	type Context,
	type Entity,
	type Records
} from './model/list';
import {
	askToKeepStorage,
	keepDailySnapshot,
	keepSnapshot,
	NewerFormatError,
	openList,
	watchStorage,
	writeRecords,
	type Snapshot
} from './storage';

export interface Undoable {
	/** What happened, for the message that offers to undo it: "Task deleted". */
	message: string;
	changes: Change[];
}

class Amber {
	records = $state<Records>({});
	ready = $state(false);
	readOnly = $state(false);
	// Raw, not deeply reactive: they're replaced whole, and the notice offers Undo only while it's
	// the very same entry as the last one in history.
	/** The last few actions, newest last, for undo. */
	history = $state.raw<Undoable[]>([]);
	/** The message on screen right now, if any. */
	notice = $state.raw<Undoable | undefined>(undefined);
	problem = $state<string | undefined>(undefined);
	/** True while changes on screen may not be saved: the problem then offers to download a copy. */
	unsaved = $state(false);

	private clock = new Clock('local');
	private keepAsked = false;
	private recovering: Promise<boolean> | undefined;

	get reducedMotion() {
		return prefersReducedMotion.current;
	}

	async open() {
		watchStorage({
			changed: (records, format) => this.received(records, format),
			lost: () => void this.recover(),
			newer: () => this.stopWriting(NEWER_TAB_PROBLEM)
		});
		try {
			const opened = await openList();
			this.clock = new Clock(opened.device);
			const records: Records = {};
			for (const record of opened.records) {
				records[record.identifier] = record;
				for (const register of Object.values(record.fields as Record<string, { stamp: string }>))
					this.clock.observe(register.stamp);
			}
			// Another tab may have saved something while this one was reading.
			merge({ records, clock: this.clock }, Object.values($state.snapshot(this.records)));
			this.records = records;
			if (!opened.readOnly)
				keepDailySnapshot(opened.records).catch(() => {
					// A missed copy isn't worth interrupting anyone for; tomorrow's will be kept.
				});
			if (opened.readOnly) this.stopWriting(NEWER_FORMAT_PROBLEM);
			else if (opened.unreadable)
				this.problem = `${opened.unreadable} saved items couldn't be read. They're kept as they were, not deleted.`;
		} catch (error) {
			this.problem = `Amber couldn't open its storage in this browser: ${error instanceof Error ? error.message : error}`;
		} finally {
			this.ready = true;
		}
	}

	/**
	 * Runs an action on the list, saves what it changed, and offers to undo it. `message` is said
	 * aloud by screen readers too.
	 */
	act<T extends { changes: Change[] } | Change[] | undefined>(
		message: string,
		action: (context: Context) => T
	): T | undefined {
		if (this.readOnly) return undefined;
		const result = action({ records: this.records, clock: this.clock });
		const changes: Change[] = Array.isArray(result) ? result : (result?.changes ?? []);
		if (!changes.length) return result;
		const entry = { message, changes };
		this.history = [...this.history.slice(-49), entry];
		// Said only once it's saved: a change that wasn't saved shows the problem instead.
		void this.save(changes).then((saved) => {
			if (saved) this.notice = entry;
		});
		if (!this.keepAsked) {
			// Asked once, after the first real change: by then there's something worth keeping.
			this.keepAsked = true;
			void askToKeepStorage();
		}
		return result;
	}

	/** Brings in records from a file or link, after keeping a copy of the list as it was. */
	async mergeIn(incoming: Entity[], message: string) {
		if (this.readOnly) return;
		await keepSnapshot('Before bringing in a list', Object.values($state.snapshot(this.records)));
		this.act(message, (context) => merge(context, incoming).changes);
	}

	/** Puts the list back as a copy had it, after keeping a copy of the list as it is now. */
	async restoreSnapshot(snapshot: Snapshot) {
		if (this.readOnly) return;
		await keepSnapshot('Before putting back a copy', Object.values($state.snapshot(this.records)));
		this.act('Copy put back', (context) => restore(context, snapshot.records));
	}

	undo() {
		const last = this.history.at(-1);
		if (!last || this.readOnly) return;
		this.history = this.history.slice(0, -1);
		const changes = undoChanges({ records: this.records, clock: this.clock }, last.changes);
		const message = `Undone: “${last.message}”`;
		void this.save(changes).then((saved) => {
			if (saved) this.notice = { message, changes: [] };
		});
	}

	/** Downloads the list on screen as a file, for when it can't be saved here. */
	async downloadCopy() {
		const { fileName, toFile } = await import('./transfer');
		const text = await toFile($state.snapshot(this.records));
		const url = URL.createObjectURL(new File([text], fileName(), { type: 'application/json' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = fileName();
		anchor.click();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	/** Saves the records changes touched. True once they're saved, here or by writing everything back. */
	private async save(changes: Change[]): Promise<boolean> {
		const identifiers = [...new Set(changes.map((change) => change.identifier))];
		const records = identifiers
			.map((identifier) => $state.snapshot(this.records[identifier]) as Entity)
			.filter(Boolean);
		try {
			this.catchUp(await writeRecords(records));
			// Storage works again: write back what an earlier failure left unsaved.
			if (this.unsaved) return this.recover();
			return true;
		} catch (error) {
			if (error instanceof NewerFormatError) {
				this.unsaved = true;
				this.stopWriting(NEWER_FORMAT_PROBLEM);
				return false;
			}
			// Most often the database was closed under the page; opening it again and writing the whole
			// list back saves this change too.
			return this.recover();
		}
	}

	/**
	 * Writes every record on screen back to storage, opening it again first: after the database was
	 * closed or cleared under the page, what's on screen is the only copy. True when it's all saved.
	 */
	private recover(): Promise<boolean> {
		// One at a time, each after the last: a later one also writes what changed since the last began.
		const attempt = (this.recovering ?? Promise.resolve(true)).then(() => this.writeBack());
		this.recovering = attempt;
		void attempt.finally(() => {
			if (this.recovering === attempt) this.recovering = undefined;
		});
		return attempt;
	}

	private async writeBack(): Promise<boolean> {
		if (this.readOnly) return false;
		try {
			this.catchUp(await writeRecords(Object.values($state.snapshot(this.records))));
			if (this.problem === SAVE_PROBLEM) this.problem = undefined;
			this.unsaved = false;
			keepDailySnapshot(Object.values($state.snapshot(this.records))).catch(() => {
				// As when opening: a missed copy isn't worth interrupting anyone for.
			});
			return true;
		} catch (error) {
			this.unsaved = true;
			if (error instanceof NewerFormatError) this.stopWriting(NEWER_FORMAT_PROBLEM);
			else this.problem = SAVE_PROBLEM;
			return false;
		}
	}

	/** Takes in what storage holds for records just saved, which can include another tab's changes. */
	private catchUp(saved: Entity[]) {
		merge({ records: this.records, clock: this.clock }, saved);
	}

	/** Takes in records another tab saved. */
	private received(raw: unknown[], format: number) {
		if (format > FORMAT_VERSION) {
			this.stopWriting(NEWER_FORMAT_PROBLEM);
			return;
		}
		let usable: unknown[];
		try {
			usable = format < FORMAT_VERSION ? migrate(raw, format) : raw;
		} catch {
			return;
		}
		const records = usable.map(readEntity).filter((entity): entity is Entity => !!entity);
		merge({ records: this.records, clock: this.clock }, records);
	}

	/** Shows the list but changes nothing more: a newer Amber has, or is about to, take it over. */
	private stopWriting(problem: string) {
		this.readOnly = true;
		this.problem = problem;
		updates.check();
	}
}

export const amber = new Amber();
