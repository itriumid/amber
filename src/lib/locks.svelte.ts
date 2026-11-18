// Locked lists while the page is open (docs/locked-lists.md): which ones are open, their keys, and
// what their sealed fields say. A key is held only in memory, as one the browser won't export, and
// is dropped when its list closes: by its Lock button, when the page is hidden, after five minutes
// without use, or on a reload. What's opened is held only in memory too, and only for open lists.
// Nothing here is ever written anywhere in plain text: every change goes through the actions,
// sealed first.

import { amber } from './amber.svelte';
import {
	addCategory,
	addSealedStep,
	addSealedTask,
	everyStepOf,
	everyTaskIn,
	lockList,
	lockedListOf,
	moveIntoLocked,
	moveOutOfLocked,
	setSealedStep,
	setSealedTask,
	unlockList,
	updateCategory,
	type SealedTask
} from './model/actions';
import { newIdentifier } from './model/identifiers';
import { get, value, type Category, type Records, type Step, type Task } from './model/list';
import { checksPassphrase, createLock, openLock, seal, unseal, type Sealed } from './sealing';
import { deleteSnapshots } from './storage';

/** How long an open locked list waits for the next touch, click or key before closing itself. */
export const IDLE_LIMIT = 5 * 60 * 1000;

/** How long a copied entry stays on the clipboard, when Amber can clear it. */
export const CLIPBOARD_LIMIT = 30 * 1000;

const field = (identifier: string, name: string) => `${identifier}:${name}`;

class Locks {
	/** The keys of the lists that are open, by category. */
	keys = $state.raw(new Map<string, CryptoKey>());
	/** What open lists' sealed fields say, by record and field. */
	plain = $state.raw(new Map<string, string>());
	/**
	 * Sealed fields of open lists that didn't open: sealed under a key this list's lock doesn't
	 * hold, as after a lock came in from elsewhere. Said as such, rather than shown empty.
	 */
	unreadable = $state.raw(new Set<string>());
	/** The one task whose title shows instead of dots: one at a time, as the design says. */
	revealed = $state<string>();
	private lastUse = Date.now();
	private watching = false;
	private generation = 0;
	/** Counts every closing, so a list being opened while the page was hidden stays closed. */
	private closings = 0;

	isOpen(categoryIdentifier: string | null): boolean {
		return !!categoryIdentifier && this.keys.has(categoryIdentifier);
	}

	/** A task's title as it reads: opened when its list is open, empty when it's closed. */
	title(task: Task): string {
		return value(task, 'sealedTitle')
			? (this.plain.get(field(task.identifier, 'sealedTitle')) ?? '')
			: value(task, 'title');
	}

	notes(task: Task): string {
		return value(task, 'sealedNotes')
			? (this.plain.get(field(task.identifier, 'sealedNotes')) ?? '')
			: value(task, 'notes');
	}

	stepText(step: Step): string {
		return value(step, 'sealedText')
			? (this.plain.get(field(step.identifier, 'sealedText')) ?? '')
			: value(step, 'text');
	}

	/** Opens a list with its passphrase or recovery code. False when neither fits. */
	async open(category: Category, secret: string): Promise<boolean> {
		const lock = value(category, 'lock');
		if (!lock) return false;
		const closings = this.closings;
		const key = await openLock(lock, secret);
		if (!key) return false;
		// Hidden while the passphrase was being checked (it takes a moment): it stays closed.
		if (!this.admit(category.identifier, key, closings)) return true;
		await this.refresh(amber.records);
		await this.sealStragglers(category);
		return true;
	}

	/** Holds an open list's key, unless something closed the lists since `closings` was read. */
	private admit(categoryIdentifier: string, key: CryptoKey, closings: number): boolean {
		if (closings !== this.closings) return false;
		this.keys = new Map([...this.keys, [categoryIdentifier, key]]);
		this.used();
		this.watch();
		return true;
	}

	/** The identifiers of a list and of everything in it, deleted records too. */
	private recordsOf(categoryIdentifier: string): Set<string> {
		const identifiers = [categoryIdentifier];
		for (const task of everyTaskIn(amber.records, categoryIdentifier)) {
			identifiers.push(task.identifier);
			for (const step of everyStepOf(amber.records, task.identifier))
				identifiers.push(step.identifier);
		}
		return new Set(identifiers);
	}

	/**
	 * What closing leaves behind: nothing opened in memory, and nothing Undo could put back in
	 * plain text. Undo's history for the list holds what it said before it was locked.
	 */
	private forget(categoryIdentifier: string) {
		const identifiers = this.recordsOf(categoryIdentifier);
		this.plain = new Map(
			[...this.plain].filter(([name]) => !identifiers.has(name.slice(0, name.indexOf(':'))))
		);
		amber.forget(identifiers);
	}

	close(categoryIdentifier: string) {
		this.closings++;
		if (!this.keys.has(categoryIdentifier)) return;
		this.generation++;
		this.keys = new Map([...this.keys].filter(([identifier]) => identifier !== categoryIdentifier));
		this.revealed = undefined;
		this.forget(categoryIdentifier);
		void this.refresh(amber.records);
	}

	closeAll() {
		this.closings++;
		if (!this.keys.size) return;
		// A refresh still working mustn't put opened text back after it's dropped.
		this.generation++;
		const closing = [...this.keys.keys()];
		this.keys = new Map();
		this.plain = new Map();
		this.unreadable = new Set();
		this.revealed = undefined;
		for (const categoryIdentifier of closing) this.forget(categoryIdentifier);
	}

	reveal(identifier: string) {
		this.revealed = this.revealed === identifier ? undefined : identifier;
	}

	/**
	 * Copies an opened entry, and tries to clear the clipboard 30 seconds later. A page can only
	 * write to the clipboard while it has focus, so it's cleared only if Amber still has it.
	 */
	async copy(text: string) {
		await navigator.clipboard.writeText(text);
		setTimeout(() => {
			if (document.hasFocus()) void navigator.clipboard.writeText('').catch(() => {});
		}, CLIPBOARD_LIMIT);
	}

	/** Something was touched, clicked or typed: the open lists stay open a while longer. */
	used() {
		this.lastUse = Date.now();
	}

	/**
	 * Opens every sealed field of the open lists, again. Called whenever the list changes; a later
	 * call wins over an earlier one still working, so an edit never shows an older value. What to
	 * open is gathered before anything is awaited, so an effect calling this sees every field it
	 * read, and runs again when one changes.
	 */
	async refresh(records: Records) {
		const generation = ++this.generation;
		const work: { key: CryptoKey; identifier: string; name: string; sealed: Sealed }[] = [];
		for (const [categoryIdentifier, key] of this.keys)
			for (const task of everyTaskIn(records, categoryIdentifier)) {
				for (const name of ['sealedTitle', 'sealedNotes'] as const) {
					const sealed = value(task, name);
					if (sealed) work.push({ key, identifier: task.identifier, name, sealed });
				}
				for (const step of everyStepOf(records, task.identifier)) {
					const sealed = value(step, 'sealedText');
					if (sealed) work.push({ key, identifier: step.identifier, name: 'sealedText', sealed });
				}
			}
		// Built as entries and made into a map at the end: the map is replaced whole, never changed.
		const plain: [string, string][] = [];
		const unreadable: string[] = [];
		for (const { key, identifier, name, sealed } of work) {
			const text = await unseal(key, identifier, name, sealed);
			if (text !== undefined) plain.push([field(identifier, name), text]);
			else unreadable.push(identifier);
		}
		if (generation !== this.generation) return;
		this.plain = new Map(plain);
		this.unreadable = new Set(unreadable);
	}

	private watch() {
		if (this.watching || typeof window === 'undefined') return;
		this.watching = true;
		const used = () => this.used();
		for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'])
			window.addEventListener(event, used, { capture: true, passive: true });
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') this.closeAll();
		});
		setInterval(() => {
			if (this.keys.size && Date.now() - this.lastUse > IDLE_LIMIT) this.closeAll();
		}, 15_000);
	}

	private keyFor(categoryIdentifier: string | null): CryptoKey | undefined {
		return categoryIdentifier ? this.keys.get(categoryIdentifier) : undefined;
	}

	/**
	 * Seals what came into an open list in plain text, as one change: tasks and steps from a device
	 * that didn't know it was locked yet, an edit it made after, tasks moved in from a deleted
	 * subcategory, and tags. Run when a list opens, and after it's locked.
	 */
	private async sealStragglers(category: Category) {
		const key = this.keyFor(category.identifier);
		const lock = value(category, 'lock');
		if (!key || !lock) return;
		const { tasks, steps, plain } = await this.sealAll(key, category, false);
		if (!this.isOpen(category.identifier)) return;
		amber.act(
			plain
				? `Locked ${plain} new in ${value(category, 'name')}`
				: `Took the tags off ${value(category, 'name')}`,
			(context) => lockList(context, category, lock, tasks, steps)
		);
	}

	/**
	 * The sealed values for every task and step in a list, deleted ones too. A plain value is sealed
	 * when it's newer than the sealed one (an edit from a device that didn't know the list was
	 * locked); otherwise the sealed one stays, or, with `rekey`, is sealed again under `key`. Also
	 * counts the tasks that had anything plain.
	 */
	private async sealAll(key: CryptoKey, category: Category, rekey: boolean) {
		const sealedTasks: [string, SealedTask][] = [];
		const sealedSteps: [string, Sealed][] = [];
		let plain = 0;
		const sealField = async (
			entity: Task | Step,
			plainName: 'title' | 'notes' | 'text',
			sealedName: 'sealedTitle' | 'sealedNotes' | 'sealedText'
		): Promise<{ sealed: Sealed; plain: boolean }> => {
			const fields = entity.fields as unknown as Record<
				string,
				{ value: string | Sealed | null; stamp: string }
			>;
			const text = fields[plainName].value as string;
			const sealed = fields[sealedName].value as Sealed | null;
			if (text && (!sealed || fields[plainName].stamp > fields[sealedName].stamp))
				return { sealed: await seal(key, entity.identifier, sealedName, text), plain: true };
			const opened = this.plain.get(field(entity.identifier, sealedName));
			if (sealed && (!rekey || opened === undefined)) return { sealed, plain: false };
			return { sealed: await seal(key, entity.identifier, sealedName, opened ?? ''), plain: false };
		};
		for (const task of everyTaskIn(amber.records, category.identifier)) {
			const title = await sealField(task, 'title', 'sealedTitle');
			const notes = await sealField(task, 'notes', 'sealedNotes');
			let anyPlain = title.plain || notes.plain;
			sealedTasks.push([task.identifier, { sealedTitle: title.sealed, sealedNotes: notes.sealed }]);
			for (const step of everyStepOf(amber.records, task.identifier)) {
				const text = await sealField(step, 'text', 'sealedText');
				anyPlain ||= text.plain;
				sealedSteps.push([step.identifier, text.sealed]);
			}
			if (anyPlain) plain++;
		}
		return { tasks: new Map(sealedTasks), steps: new Map(sealedSteps), plain };
	}

	private async sealTask(
		key: CryptoKey,
		identifier: string,
		title: string,
		notes: string
	): Promise<SealedTask> {
		return {
			sealedTitle: await seal(key, identifier, 'sealedTitle', title),
			sealedNotes: await seal(key, identifier, 'sealedNotes', notes)
		};
	}

	/**
	 * Locks a list, new or existing: a new data key, wrapped by the passphrase and a recovery code,
	 * and everything in the list sealed with it, in one change. The list is left open. Returns the
	 * recovery code, to show once.
	 */
	async lock(category: Category, passphrase: string, deleteCopies: boolean): Promise<string> {
		const closings = this.closings;
		const { lock, key, recoveryCode } = await createLock(passphrase);
		const { tasks, steps } = await this.sealAll(key, category, false);
		amber.act(
			`Locked ${value(category, 'name')}`,
			(context) => lockList(context, category, lock, tasks, steps),
			{ notice: false }
		);
		// What this device kept before still has the list in plain text, if the person wants it gone.
		if (deleteCopies) await deleteSnapshots();
		// Hidden while it was being locked: it's locked, and stays closed.
		if (!this.admit(category.identifier, key, closings)) return recoveryCode;
		await this.refresh(amber.records);
		// Anything that arrived while it was being sealed.
		const locked = get(amber.records, category.identifier, 'category');
		if (locked) await this.sealStragglers(locked);
		return recoveryCode;
	}

	/**
	 * Makes a new list that's locked from the start, in one change, so it never exists unlocked.
	 * Returns its identifier and the recovery code, to show once.
	 */
	async lockNew(name: string, passphrase: string) {
		const closings = this.closings;
		const { lock, key, recoveryCode } = await createLock(passphrase);
		const made = amber.act(
			`Made ${name.trim()}, locked`,
			(context) => {
				const added = addCategory(context, name);
				if (!added) return undefined;
				return {
					category: added.category,
					changes: [
						...added.changes,
						...lockList(context, added.category, lock, new Map(), new Map())
					]
				};
			},
			{ notice: false }
		);
		if (!made) return undefined;
		this.admit(made.category.identifier, key, closings);
		return { identifier: made.category.identifier, recoveryCode };
	}

	/** Makes an open locked list an ordinary one again, in plain text: a to-do or a bucket list. */
	unlockForGood(category: Category, bucket = false) {
		if (!this.isOpen(category.identifier)) return;
		const tasks = new Map(
			everyTaskIn(amber.records, category.identifier).map((task) => [
				task.identifier,
				{ title: this.title(task), notes: this.notes(task) }
			])
		);
		const steps = new Map(
			everyTaskIn(amber.records, category.identifier).flatMap((task) =>
				everyStepOf(amber.records, task.identifier).map(
					(step) => [step.identifier, this.stepText(step)] as const
				)
			)
		);
		amber.act(`${value(category, 'name')} is an ordinary list again`, (context) => [
			...unlockList(context, category, tasks, steps),
			...(bucket ? updateCategory(context, category, { keepDone: true }) : [])
		]);
		this.close(category.identifier);
	}

	/**
	 * A new passphrase for an open locked list, from the current one or the recovery code. Like a
	 * new recovery code, everything is sealed again under a new key, so neither the old passphrase
	 * nor the old code opens anything written from now on, even with an older copy of the lock; so
	 * it comes with a new recovery code too. Undefined when the current secret doesn't fit.
	 */
	async changePassphrase(
		category: Category,
		current: string,
		next: string
	): Promise<string | undefined> {
		const lock = value(category, 'lock');
		if (!lock || !this.isOpen(category.identifier)) return undefined;
		if (!(await openLock(lock, current))) return undefined;
		return this.rekey(category, next, 'Passphrase changed');
	}

	/** A new key and recovery code for an open list, with everything in it sealed again. */
	private async rekey(
		category: Category,
		passphrase: string,
		message: string
	): Promise<string | undefined> {
		const closings = this.closings;
		const made = await createLock(passphrase);
		await this.refresh(amber.records);
		if (closings !== this.closings) return undefined;
		const { tasks, steps } = await this.sealAll(made.key, category, true);
		if (closings !== this.closings) return undefined;
		amber.act(message, (context) => lockList(context, category, made.lock, tasks, steps), {
			notice: false
		});
		this.keys = new Map([...this.keys, [category.identifier, made.key]]);
		// Undone, it would bring back the old key, which the list open now can't read: it can't be.
		amber.forget(this.recordsOf(category.identifier));
		await this.refresh(amber.records);
		return made.recoveryCode;
	}

	/**
	 * A new recovery code in place of a lost one, for an open list, from its passphrase. Everything
	 * is sealed again under a new key, so the old code can't open anything written from now on,
	 * even with an older copy of the lock. Undefined when the passphrase doesn't fit.
	 */
	async newRecoveryCode(category: Category, passphrase: string): Promise<string | undefined> {
		const lock = value(category, 'lock');
		if (!lock || !this.isOpen(category.identifier)) return undefined;
		if (!(await checksPassphrase(lock, passphrase))) return undefined;
		return this.rekey(category, passphrase, 'New recovery code made');
	}

	async addTask(categoryIdentifier: string, title: string): Promise<boolean> {
		const key = this.keyFor(categoryIdentifier);
		const category = get(amber.records, categoryIdentifier, 'category');
		if (!key || !category || !title.trim()) return false;
		const identifier = newIdentifier();
		const sealed = await this.sealTask(key, identifier, title.trim(), '');
		amber.act(`Added to ${value(category, 'name')}`, (context) =>
			addSealedTask(context, identifier, categoryIdentifier, sealed)
		);
		return true;
	}

	async setTitle(task: Task, title: string) {
		const key = this.keyFor(lockedListOf(amber.records, task)?.identifier ?? null);
		if (!key || !title.trim()) return;
		const sealedTitle = await seal(key, task.identifier, 'sealedTitle', title.trim());
		amber.act('Renamed', (context) => setSealedTask(context, task, { sealedTitle }));
	}

	async setNotes(task: Task, notes: string) {
		const key = this.keyFor(lockedListOf(amber.records, task)?.identifier ?? null);
		if (!key) return;
		const sealedNotes = await seal(key, task.identifier, 'sealedNotes', notes);
		amber.act('Notes saved', (context) => setSealedTask(context, task, { sealedNotes }));
	}

	async addStep(task: Task, text: string): Promise<boolean> {
		const key = this.keyFor(lockedListOf(amber.records, task)?.identifier ?? null);
		if (!key || !text.trim()) return false;
		const identifier = newIdentifier();
		const sealedText = await seal(key, identifier, 'sealedText', text.trim());
		amber.act('Step added', (context) => addSealedStep(context, task, identifier, sealedText));
		return true;
	}

	async setStepText(task: Task, step: Step, text: string) {
		const key = this.keyFor(lockedListOf(amber.records, task)?.identifier ?? null);
		if (!key || !text.trim()) return;
		const sealedText = await seal(key, step.identifier, 'sealedText', text.trim());
		amber.act('Step renamed', (context) => setSealedStep(context, step, sealedText));
	}

	/**
	 * Moves a task between lists, sealing it on the way into an open locked list and opening it on
	 * the way out of one. False when a locked list it needs is closed.
	 */
	async move(task: Task, to: string | null): Promise<boolean> {
		const from = lockedListOf(amber.records, task);
		const toKey = this.keyFor(to);
		const into = to ? get(amber.records, to, 'category') : undefined;
		const intoLocked = !!into && !!value(into, 'lock');
		if ((from && !this.isOpen(from.identifier)) || (intoLocked && !toKey)) return false;
		if (intoLocked && toKey) {
			const sealed = await this.sealTask(
				toKey,
				task.identifier,
				this.title(task),
				this.notes(task)
			);
			const sealedSteps: [string, Sealed][] = [];
			for (const step of everyStepOf(amber.records, task.identifier))
				sealedSteps.push([
					step.identifier,
					await seal(toKey, step.identifier, 'sealedText', this.stepText(step))
				]);
			const steps = new Map(sealedSteps);
			amber.act(`Moved to ${value(into!, 'name')}`, (context) =>
				moveIntoLocked(context, task, to!, sealed, steps)
			);
			return true;
		}
		const plain = { title: this.title(task), notes: this.notes(task) };
		const steps = new Map(
			everyStepOf(amber.records, task.identifier).map(
				(step) => [step.identifier, this.stepText(step)] as const
			)
		);
		amber.act('Moved out, in plain text', (context) =>
			moveOutOfLocked(context, task, to, plain, steps)
		);
		return true;
	}
}

export const locks = new Locks();
