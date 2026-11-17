// Everything a person can do to a list, as plain functions over a document. Each returns the
// changes it made, so the interface can offer to undo it, and saving knows what to write.

import {
	LIMITS,
	alive,
	COLORS,
	create,
	endOf,
	findTag,
	get,
	stepKey,
	stepsOf,
	update,
	value,
	type Category,
	type Change,
	type Color,
	type Context,
	type Records,
	type Step,
	type Tag,
	type Task
} from './list';
import { keyBetween } from './order';
import type { Lock, Sealed } from '../sealing';

/** Trims, collapses runs of spaces, and cuts at `limit` characters. */
export function clean(text: string, limit: number): string {
	return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

const keep = (change: Change | undefined): Change[] => (change ? [change] : []);

/* ─── Quick add ─── */

/**
 * What someone typed into quick add: `#words` become tags, the rest is the task. A tag runs until
 * a space and can hold letters in any language, digits, `-` and `_`.
 */
export function parseQuickAdd(text: string): { title: string; tagNames: string[] } {
	const tagNames: string[] = [];
	const title = text.replace(
		/(^|\s)#([\p{L}\p{N}_-]+)/gu,
		(_match, space: string, name: string) => {
			if (!tagNames.some((known) => known.toLocaleLowerCase() === name.toLocaleLowerCase()))
				tagNames.push(name);
			return space;
		}
	);
	return {
		title: clean(title, LIMITS.title),
		tagNames: tagNames.map((name) => clean(name, LIMITS.name))
	};
}

/**
 * A category named in quick add with @: "@Home Fix the gate", or "@Bucket list Learn to sail" for
 * a name with spaces. The longest category name the words after @ begin with wins, ignoring case
 * and accents' case. An @ that names no category is left in the title as typed, so an address or
 * a handle isn't eaten.
 */
export function categoryMention(
	records: Records,
	text: string
): { categoryIdentifier: string; text: string } | undefined {
	const names = alive(records, 'category')
		.map((category) => ({ category, name: value(category, 'name').toLocaleLowerCase() }))
		.sort((a, b) => b.name.length - a.name.length);
	for (const match of text.matchAll(/(^|\s)@/g)) {
		const start = match.index + match[0].length;
		const rest = text.slice(start).toLocaleLowerCase();
		const found = names.find(
			({ name }) => rest.startsWith(name) && /^(\s|$)/.test(rest.slice(name.length))
		);
		if (found)
			return {
				categoryIdentifier: found.category.identifier,
				text: text.slice(0, start - 1) + text.slice(start + found.name.length)
			};
	}
	return undefined;
}

/* ─── Tasks ─── */

/** Which category a task shows in: a deleted subcategory's tasks show in its parent. */
export function shownCategory(records: Records, task: Task): string | null {
	const identifier = value(task, 'categoryIdentifier');
	if (!identifier) return null;
	if (get(records, identifier, 'category')) return identifier;
	const gone = records[identifier];
	if (gone?.kind === 'category') {
		const parent = (gone as Category).fields.parentIdentifier.value;
		if (parent && get(records, parent, 'category')) return parent;
	}
	return null;
}

/** The category a task shows in, as people read it: "Home › Kitchen". */
export function categoryLabel(records: Records, task: Task): string | undefined {
	const identifier = shownCategory(records, task);
	const category = get(records, identifier, 'category');
	if (!category) return undefined;
	const parent = get(records, value(category, 'parentIdentifier'), 'category');
	return parent ? `${value(parent, 'name')} › ${value(category, 'name')}` : value(category, 'name');
}

/** Tasks shown in a category, in order: its own and those of its deleted subcategories. */
export function tasksShownIn(records: Records, categoryIdentifier: string | null): Task[] {
	return alive(records, 'task')
		.filter((task) => shownCategory(records, task) === categoryIdentifier)
		.sort((a, b) =>
			value(a, 'order') < value(b, 'order')
				? -1
				: value(a, 'order') > value(b, 'order')
					? 1
					: a.identifier < b.identifier
						? -1
						: 1
		);
}

export function addTask(
	context: Context,
	text: string,
	categoryIdentifier: string | null
): { task: Task; changes: Change[] } | undefined {
	const mention = categoryMention(context.records, text);
	if (mention) ({ categoryIdentifier, text } = mention);
	const { title, tagNames } = parseQuickAdd(text);
	if (!title) return undefined;
	const siblings = tasksShownIn(context.records, categoryIdentifier);
	const { entity: task, change } = create(context, 'task', {
		title,
		notes: '',
		done: false,
		doneAt: null,
		categoryIdentifier,
		order: endOf(siblings),
		deleted: false,
		sealedTitle: null,
		sealedNotes: null
	});
	const changes = [change, ...tagByName(context, task, tagNames)];
	return { task, changes };
}

export function setTitle(context: Context, task: Task, title: string): Change[] {
	const cleaned = clean(title, LIMITS.title);
	return cleaned ? keep(update(context, task, { title: cleaned })) : [];
}

export function setNotes(context: Context, task: Task, notes: string): Change[] {
	return keep(update(context, task, { notes: notes.slice(0, LIMITS.notes) }));
}

export function setDone(context: Context, task: Task, done: boolean, now = Date.now()): Change[] {
	return keep(update(context, task, { done, doneAt: done ? now : null }));
}

export function deleteTask(context: Context, task: Task): Change[] {
	return keep(update(context, task, { deleted: true }));
}

/** Moves a task one place among the tasks it's shown with that are done, or not done, like it. */
export function moveTask(context: Context, task: Task, direction: -1 | 1): Change[] {
	const done = value(task, 'done');
	const siblings = tasksShownIn(context.records, shownCategory(context.records, task)).filter(
		(other) => value(other, 'done') === done
	);
	const order = stepKey(siblings, task, direction);
	return order ? keep(update(context, task, { order })) : [];
}

/**
 * Puts a task at a place among the tasks it's shown with that are done, or not done, like it:
 * `index` counts those others, so 0 is the top. A key between its new neighbours' is its only
 * change, as with moving one place.
 */
export function placeTask(context: Context, task: Task, index: number): Change[] {
	const done = value(task, 'done');
	const others = tasksShownIn(context.records, shownCategory(context.records, task)).filter(
		(other) => value(other, 'done') === done && other.identifier !== task.identifier
	);
	const place = Math.max(0, Math.min(index, others.length));
	const before = others[place - 1]?.fields.order.value ?? null;
	const after = others[place]?.fields.order.value ?? null;
	if (before !== null && after !== null && before >= after) return [];
	const current = value(task, 'order');
	if ((before === null || current > before) && (after === null || current < after)) return [];
	return keep(update(context, task, { order: keyBetween(before, after) }));
}

export function setCategory(
	context: Context,
	task: Task,
	categoryIdentifier: string | null
): Change[] {
	if (shownCategory(context.records, task) === categoryIdentifier) return [];
	return keep(
		update(context, task, {
			categoryIdentifier,
			order: endOf(tasksShownIn(context.records, categoryIdentifier))
		})
	);
}

/* ─── Tags ─── */

/** A tagging's identifier is made from the task and the tag, so tagging the same task on two devices meets. */
const taggingIdentifier = (taskIdentifier: string, tagIdentifier: string) =>
	`${taskIdentifier}.${tagIdentifier}`;

export function hasTag(records: Records, task: Task, tag: Tag): boolean {
	const tagging = get(records, taggingIdentifier(task.identifier, tag.identifier), 'tagging');
	return !!tagging && value(tagging, 'on');
}

export function setTagged(context: Context, task: Task, tag: Tag, on: boolean): Change[] {
	const identifier = taggingIdentifier(task.identifier, tag.identifier);
	const existing = context.records[identifier];
	if (existing?.kind === 'tagging')
		return keep(update(context, existing as never, { on, deleted: false } as never));
	if (!on) return [];
	return [
		create(
			context,
			'tagging',
			{ taskIdentifier: task.identifier, tagIdentifier: tag.identifier, on: true, deleted: false },
			identifier
		).change
	];
}

/** Tags a task with tags by name, making any that don't exist yet. */
export function tagByName(context: Context, task: Task, names: string[]): Change[] {
	const changes: Change[] = [];
	for (const raw of names) {
		const name = clean(raw, LIMITS.name);
		if (!name) continue;
		let tag = findTag(context.records, name);
		if (!tag) {
			const made = create(context, 'tag', { name, color: null, deleted: false });
			tag = made.entity;
			changes.push(made.change);
		}
		changes.push(...setTagged(context, task, tag, true));
	}
	return changes;
}

export function renameTag(context: Context, tag: Tag, name: string): Change[] {
	const cleaned = clean(name, LIMITS.name).replace(/^#/, '');
	if (!cleaned) return [];
	const other = findTag(context.records, cleaned);
	if (other && other.identifier !== tag.identifier) return [];
	return keep(update(context, tag, { name: cleaned }));
}

export function setTagColor(context: Context, tag: Tag, color: Color | null): Change[] {
	return keep(update(context, tag, { color }));
}

export function deleteTag(context: Context, tag: Tag): Change[] {
	return keep(update(context, tag, { deleted: true }));
}

/* ─── Categories ─── */

/**
 * A new category's color: the first one no other category has yet, then round again. A list
 * starts with color, so its label and its tasks' boxes say which list they're in; "No color" is
 * still a choice in the category's editor.
 */
function nextColor(records: Records): Color {
	const used = new Set(
		alive(records, 'category')
			.filter((category) => !value(category, 'parentIdentifier'))
			.map((category) => value(category, 'color'))
	);
	const count = alive(records, 'category').filter(
		(category) => !value(category, 'parentIdentifier')
	).length;
	return COLORS.find((color) => !used.has(color)) ?? COLORS[count % COLORS.length];
}

export function addCategory(
	context: Context,
	name: string,
	parentIdentifier: string | null = null,
	/** A bucket list, when it's said at the start; a subcategory follows its parent otherwise. */
	bucket?: boolean
): { category: Category; changes: Change[] } | undefined {
	const cleaned = clean(name, LIMITS.name);
	if (!cleaned) return undefined;
	// Only one level deep: a category inside a subcategory goes beside it instead.
	let parent = parentIdentifier ? get(context.records, parentIdentifier, 'category') : undefined;
	if (
		parent &&
		value(parent, 'parentIdentifier') &&
		get(context.records, value(parent, 'parentIdentifier'), 'category')
	) {
		parent = get(context.records, value(parent, 'parentIdentifier'), 'category');
	}
	const siblings = alive(context.records, 'category')
		.filter((other) => value(other, 'parentIdentifier') === (parent?.identifier ?? null))
		.sort((a, b) => (value(a, 'order') < value(b, 'order') ? -1 : 1));
	const { entity: category, change } = create(context, 'category', {
		name: cleaned,
		parentIdentifier: parent?.identifier ?? null,
		color: parent ? value(parent, 'color') : nextColor(context.records),
		keepDone: bucket ?? (parent ? value(parent, 'keepDone') : false),
		order: endOf(siblings),
		deleted: false,
		// Every locked list has its own key: a subcategory doesn't take its parent's lock.
		lock: null
	});
	return { category, changes: [change] };
}

export function updateCategory(
	context: Context,
	category: Category,
	changes: { name?: string; color?: Color | null; keepDone?: boolean }
): Change[] {
	const next: { name?: string; color?: Color | null; keepDone?: boolean } = { ...changes };
	if (next.name !== undefined) {
		next.name = clean(next.name, LIMITS.name);
		if (!next.name) delete next.name;
	}
	return keep(update(context, category, next));
}

export function categorySiblings(records: Records, category: Category): Category[] {
	const parent = value(category, 'parentIdentifier');
	return alive(records, 'category')
		.filter((other) => value(other, 'parentIdentifier') === parent)
		.sort((a, b) =>
			value(a, 'order') < value(b, 'order')
				? -1
				: value(a, 'order') > value(b, 'order')
					? 1
					: a.identifier < b.identifier
						? -1
						: 1
		);
}

export function moveCategory(context: Context, category: Category, direction: -1 | 1): Change[] {
	const order = stepKey(categorySiblings(context.records, category), category, direction);
	return order ? keep(update(context, category, { order })) : [];
}

/**
 * Deletes a category and its subcategories. Their tasks stay: a subcategory's go to its parent, and
 * the rest to no category. Undo brings everything back where it was.
 */
export function deleteCategory(context: Context, category: Category): Change[] {
	const children = alive(context.records, 'category').filter(
		(child) => value(child, 'parentIdentifier') === category.identifier
	);
	return [
		...children.flatMap((child) => keep(update(context, child, { deleted: true }))),
		...keep(update(context, category, { deleted: true }))
	];
}

/* ─── Steps ─── */

export function addStep(context: Context, task: Task, text: string): Change[] {
	const cleaned = clean(text, LIMITS.step);
	if (!cleaned) return [];
	return [
		create(context, 'step', {
			taskIdentifier: task.identifier,
			text: cleaned,
			done: false,
			order: endOf(stepsOf(context.records, task.identifier)),
			deleted: false,
			sealedText: null
		}).change
	];
}

export function setStepText(context: Context, step: Step, text: string): Change[] {
	const cleaned = clean(text, LIMITS.step);
	return cleaned ? keep(update(context, step, { text: cleaned })) : [];
}

export function setStepDone(context: Context, step: Step, done: boolean): Change[] {
	return keep(update(context, step, { done }));
}

export function deleteStep(context: Context, step: Step): Change[] {
	return keep(update(context, step, { deleted: true }));
}

export function moveStep(context: Context, step: Step, direction: -1 | 1): Change[] {
	const order = stepKey(stepsOf(context.records, value(step, 'taskIdentifier')), step, direction);
	return order ? keep(update(context, step, { order })) : [];
}

/** Turns a step into a task of its own, in the same category, with the same tags. */
export function promoteStep(
	context: Context,
	step: Step
): { task: Task; changes: Change[] } | undefined {
	const parent = get(context.records, value(step, 'taskIdentifier'), 'task');
	if (!parent) return undefined;
	const categoryIdentifier = shownCategory(context.records, parent);
	const { entity: task, change } = create(context, 'task', {
		title: value(step, 'text'),
		notes: '',
		done: value(step, 'done'),
		doneAt: value(step, 'done') ? Date.now() : null,
		categoryIdentifier,
		order: endOf(tasksShownIn(context.records, categoryIdentifier)),
		deleted: false,
		sealedTitle: null,
		sealedNotes: null
	});
	const tagChanges = alive(context.records, 'tag')
		.filter((tag) => hasTag(context.records, parent, tag))
		.flatMap((tag) => setTagged(context, task, tag, true));
	return { task, changes: [change, ...tagChanges, ...deleteStep(context, step)] };
}

/* ─── Locked lists (docs/locked-lists.md) ─── */
// Sealing and opening are asynchronous (the browser's encryption is), so these take values already
// sealed or opened, and stay synchronous like every other action: one call, one set of changes,
// one Undo. In a locked list the plain title, notes and step text are empty; the sealed fields
// hold them.

/** A task's title and notes, sealed with its list's key. */
export interface SealedTask {
	sealedTitle: Sealed;
	sealedNotes: Sealed;
}

/** A task's title and notes in plain text, as they are outside a locked list. */
export interface PlainTask {
	title: string;
	notes: string;
}

/** The locked list a task shows in, if it shows in one. */
export function lockedListOf(records: Records, task: Task): Category | undefined {
	const place = shownCategory(records, task);
	const category = place ? get(records, place, 'category') : undefined;
	return category && value(category, 'lock') ? category : undefined;
}

export function isLockedList(records: Records, categoryIdentifier: string | null): boolean {
	const category = categoryIdentifier ? get(records, categoryIdentifier, 'category') : undefined;
	return !!category && !!value(category, 'lock');
}

/** A tag's name shows in other lists, so a task in a locked list has none. */
function untagAll(context: Context, task: Task): Change[] {
	return alive(context.records, 'tag')
		.filter((tag) => hasTag(context.records, task, tag))
		.flatMap((tag) => setTagged(context, task, tag, false));
}

/** A new task in a locked list. The identifier is made first: the sealed values are bound to it. */
export function addSealedTask(
	context: Context,
	identifier: string,
	categoryIdentifier: string,
	sealed: SealedTask
): { task: Task; changes: Change[] } {
	const { entity: task, change } = create(
		context,
		'task',
		{
			title: '',
			notes: '',
			done: false,
			doneAt: null,
			categoryIdentifier,
			order: endOf(tasksShownIn(context.records, categoryIdentifier)),
			deleted: false,
			...sealed
		},
		identifier
	);
	return { task, changes: [change] };
}

export function addSealedStep(
	context: Context,
	task: Task,
	identifier: string,
	sealedText: Sealed
): Change[] {
	return [
		create(
			context,
			'step',
			{
				taskIdentifier: task.identifier,
				text: '',
				done: false,
				order: endOf(stepsOf(context.records, task.identifier)),
				deleted: false,
				sealedText
			},
			identifier
		).change
	];
}

export function setSealedTask(context: Context, task: Task, sealed: Partial<SealedTask>): Change[] {
	return keep(update(context, task, sealed));
}

export function setSealedStep(context: Context, step: Step, sealedText: Sealed): Change[] {
	return keep(update(context, step, { sealedText }));
}

/**
 * Locks a list: its lock is set, and every task and step in it changes from plain to sealed, all
 * in one change, so one Undo puts it back. `tasks` and `steps` hold the sealed values, made for
 * each one the list shows.
 */
export function lockList(
	context: Context,
	category: Category,
	lock: Lock,
	tasks: Map<string, SealedTask>,
	steps: Map<string, Sealed>
): Change[] {
	const changes = keep(update(context, category, { lock, keepDone: false }));
	for (const task of tasksShownIn(context.records, category.identifier)) {
		const sealed = tasks.get(task.identifier);
		if (!sealed) continue;
		changes.push(
			...keep(update(context, task, { title: '', notes: '', ...sealed })),
			...untagAll(context, task)
		);
		for (const step of stepsOf(context.records, task.identifier)) {
			const sealedText = steps.get(step.identifier);
			if (sealedText) changes.push(...keep(update(context, step, { text: '', sealedText })));
		}
	}
	return changes;
}

/** Makes a locked list an ordinary one again: everything in it back in plain text. */
export function unlockList(
	context: Context,
	category: Category,
	tasks: Map<string, PlainTask>,
	steps: Map<string, string>
): Change[] {
	const changes = keep(update(context, category, { lock: null }));
	for (const task of tasksShownIn(context.records, category.identifier)) {
		const plain = tasks.get(task.identifier);
		if (!plain) continue;
		changes.push(
			...keep(
				update(context, task, {
					title: clean(plain.title, LIMITS.title),
					notes: plain.notes.slice(0, LIMITS.notes),
					sealedTitle: null,
					sealedNotes: null
				})
			)
		);
		for (const step of stepsOf(context.records, task.identifier)) {
			const text = steps.get(step.identifier);
			if (text !== undefined)
				changes.push(
					...keep(update(context, step, { text: clean(text, LIMITS.step), sealedText: null }))
				);
		}
	}
	return changes;
}

/** Moves a task into a locked list, sealed: its title, notes and steps, and without its tags. */
export function moveIntoLocked(
	context: Context,
	task: Task,
	categoryIdentifier: string,
	sealed: SealedTask,
	steps: Map<string, Sealed>
): Change[] {
	const changes = [
		...setCategory(context, task, categoryIdentifier),
		...keep(update(context, task, { title: '', notes: '', ...sealed })),
		...untagAll(context, task)
	];
	for (const step of stepsOf(context.records, task.identifier)) {
		const sealedText = steps.get(step.identifier);
		if (sealedText) changes.push(...keep(update(context, step, { text: '', sealedText })));
	}
	return changes;
}

/** Moves a task out of a locked list, into plain text. */
export function moveOutOfLocked(
	context: Context,
	task: Task,
	categoryIdentifier: string | null,
	plain: PlainTask,
	steps: Map<string, string>
): Change[] {
	const changes = [
		...setCategory(context, task, categoryIdentifier),
		...keep(
			update(context, task, {
				title: clean(plain.title, LIMITS.title) || 'Untitled',
				notes: plain.notes.slice(0, LIMITS.notes),
				sealedTitle: null,
				sealedNotes: null
			})
		)
	];
	for (const step of stepsOf(context.records, task.identifier)) {
		const text = steps.get(step.identifier);
		if (text !== undefined)
			changes.push(
				...keep(update(context, step, { text: clean(text, LIMITS.step), sealedText: null }))
			);
	}
	return changes;
}
