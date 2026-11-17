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
	lockList,
	lockedListOf,
	moveIntoLocked,
	moveOutOfLocked,
	setLock,
	setSealedStep,
	setSealedTask,
	unlockList,
	updateCategory,
	type SealedTask
} from './model/actions';
import { newIdentifier } from './model/identifiers';
import {
	get,
	stepsOf,
	value,
	type Category,
	type Records,
	type Step,
	type Task
} from './model/list';
import { changePassphrase, createLock, openLock, seal, unseal, type Sealed } from './sealing';
import { deleteSnapshots } from './storage';
import { tasksShownIn } from './model/actions';

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
	/** The one task whose title shows instead of dots: one at a time, as the design says. */
	revealed = $state<string>();
	private lastUse = Date.now();
	private watching = false;
	private generation = 0;

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
		const key = await openLock(lock, secret);
		if (!key) return false;
		this.keys = new Map([...this.keys, [category.identifier, key]]);
		this.used();
		this.watch();
		await this.refresh(amber.records);
		await this.sealStragglers(category);
		return true;
	}

	close(categoryIdentifier: string) {
		if (!this.keys.has(categoryIdentifier)) return;
		this.keys = new Map([...this.keys].filter(([identifier]) => identifier !== categoryIdentifier));
		this.revealed = undefined;
		void this.refresh(amber.records);
	}

	closeAll() {
		if (!this.keys.size) return;
		// A refresh still working mustn't put opened text back after it's dropped.
		this.generation++;
		this.keys = new Map();
		this.plain = new Map();
		this.revealed = undefined;
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
			for (const task of tasksShownIn(records, categoryIdentifier)) {
				for (const name of ['sealedTitle', 'sealedNotes'] as const) {
					const sealed = value(task, name);
					if (sealed) work.push({ key, identifier: task.identifier, name, sealed });
				}
				for (const step of stepsOf(records, task.identifier)) {
					const sealed = value(step, 'sealedText');
					if (sealed) work.push({ key, identifier: step.identifier, name: 'sealedText', sealed });
				}
			}
		// Built as entries and made into a map at the end: the map is replaced whole, never changed.
		const plain: [string, string][] = [];
		for (const { key, identifier, name, sealed } of work) {
			const text = await unseal(key, identifier, name, sealed);
			if (text !== undefined) plain.push([field(identifier, name), text]);
		}
		if (generation === this.generation) this.plain = new Map(plain);
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
	 * Tasks that came in plain from a device that didn't know the list was locked yet are sealed
	 * as soon as it's open, as one change.
	 */
	private async sealStragglers(category: Category) {
		const key = this.keyFor(category.identifier)!;
		const plain = tasksShownIn(amber.records, category.identifier).filter(
			(task) => !value(task, 'sealedTitle') && value(task, 'title')
		);
		if (!plain.length) return;
		const { tasks, steps } = await this.sealEach(key, plain);
		amber.act(`Locked ${plain.length} new in ${value(category, 'name')}`, (context) =>
			lockList(context, category, value(category, 'lock')!, tasks, steps)
		);
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

	private async sealEach(key: CryptoKey, tasks: Task[]) {
		const sealedTasks: [string, SealedTask][] = [];
		const sealedSteps: [string, Sealed][] = [];
		for (const task of tasks) {
			sealedTasks.push([
				task.identifier,
				await this.sealTask(key, task.identifier, this.title(task), this.notes(task))
			]);
			for (const step of stepsOf(amber.records, task.identifier))
				sealedSteps.push([
					step.identifier,
					await seal(key, step.identifier, 'sealedText', this.stepText(step))
				]);
		}
		return { tasks: new Map(sealedTasks), steps: new Map(sealedSteps) };
	}

	/**
	 * Locks a list, new or existing: a new data key, wrapped by the passphrase and a recovery code,
	 * and everything in the list sealed with it, in one change. The list is left open. Returns the
	 * recovery code, to show once.
	 */
	async lock(category: Category, passphrase: string, deleteCopies: boolean): Promise<string> {
		const { lock, key, recoveryCode } = await createLock(passphrase);
		const { tasks, steps } = await this.sealEach(
			key,
			tasksShownIn(amber.records, category.identifier)
		);
		amber.act(`Locked ${value(category, 'name')}`, (context) =>
			lockList(context, category, lock, tasks, steps)
		);
		this.keys = new Map([...this.keys, [category.identifier, key]]);
		this.used();
		this.watch();
		// What this device kept before still has the list in plain text, if the person wants it gone.
		if (deleteCopies) await deleteSnapshots();
		await this.refresh(amber.records);
		return recoveryCode;
	}

	/**
	 * Makes a new list that's locked from the start, in one change, so it never exists unlocked.
	 * Returns its identifier and the recovery code, to show once.
	 */
	async lockNew(name: string, passphrase: string) {
		const { lock, key, recoveryCode } = await createLock(passphrase);
		const made = amber.act(`Made ${name.trim()}, locked`, (context) => {
			const added = addCategory(context, name);
			if (!added) return undefined;
			return {
				category: added.category,
				changes: [
					...added.changes,
					...lockList(context, added.category, lock, new Map(), new Map())
				]
			};
		});
		if (!made) return undefined;
		this.keys = new Map([...this.keys, [made.category.identifier, key]]);
		this.used();
		this.watch();
		return { identifier: made.category.identifier, recoveryCode };
	}

	/** Makes an open locked list an ordinary one again, in plain text: a to-do or a bucket list. */
	unlockForGood(category: Category, bucket = false) {
		if (!this.isOpen(category.identifier)) return;
		const tasks = new Map(
			tasksShownIn(amber.records, category.identifier).map((task) => [
				task.identifier,
				{ title: this.title(task), notes: this.notes(task) }
			])
		);
		const steps = new Map(
			tasksShownIn(amber.records, category.identifier).flatMap((task) =>
				stepsOf(amber.records, task.identifier).map(
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

	/** A new passphrase for a locked list; the current one or the recovery code is needed. */
	async changePassphrase(category: Category, current: string, next: string): Promise<boolean> {
		const lock = value(category, 'lock');
		const changed = lock ? await changePassphrase(lock, current, next) : undefined;
		if (!changed) return false;
		amber.act('Passphrase changed', (context) => setLock(context, category, changed));
		return true;
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
			for (const step of stepsOf(amber.records, task.identifier))
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
			stepsOf(amber.records, task.identifier).map(
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
