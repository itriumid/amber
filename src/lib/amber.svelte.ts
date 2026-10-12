// The list on screen: the records, kept in step with this device's storage, and the history that
// lets the last actions be undone.

import { prefersReducedMotion } from 'svelte/motion';
import { Clock } from './model/clock';
import {
	undo as undoChanges,
	type Change,
	type Context,
	type Entity,
	type Records
} from './model/list';
import { askToKeepStorage, openList, writeRecords } from './storage';

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

	private clock = new Clock('local');
	private keepAsked = false;

	get reducedMotion() {
		return prefersReducedMotion.current;
	}

	async open() {
		try {
			const opened = await openList();
			this.clock = new Clock(opened.device);
			const records: Records = {};
			for (const record of opened.records) {
				records[record.identifier] = record;
				for (const register of Object.values(record.fields as Record<string, { stamp: string }>))
					this.clock.observe(register.stamp);
			}
			this.records = records;
			this.readOnly = opened.readOnly;
			if (opened.readOnly)
				this.problem =
					'This list was saved by a newer version of Amber. Reload to update; until then it can be read but not changed.';
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
		this.save(changes);
		const entry = { message, changes };
		this.history = [...this.history.slice(-49), entry];
		this.notice = entry;
		if (!this.keepAsked) {
			// Asked once, after the first real change: by then there's something worth keeping.
			this.keepAsked = true;
			void askToKeepStorage();
		}
		return result;
	}

	undo() {
		const last = this.history.at(-1);
		if (!last || this.readOnly) return;
		this.history = this.history.slice(0, -1);
		const changes = undoChanges({ records: this.records, clock: this.clock }, last.changes);
		this.save(changes);
		this.notice = { message: `Undone: ${last.message.toLocaleLowerCase()}`, changes: [] };
	}

	private save(changes: Change[]) {
		const identifiers = [...new Set(changes.map((change) => change.identifier))];
		const records = identifiers
			.map((identifier) => $state.snapshot(this.records[identifier]) as Entity)
			.filter(Boolean);
		writeRecords(records).catch((error) => {
			this.problem = `The last change couldn't be saved: ${error instanceof Error ? error.message : error}. Export your list to keep a copy.`;
		});
	}
}

export const amber = new Amber();
