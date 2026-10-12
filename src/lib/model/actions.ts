// Everything a person can do to a list, as plain functions over a document. Each returns the
// changes it made, so the interface can offer to undo it, and saving knows what to write.

import {
	LIMITS,
	alive,
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
		deleted: false
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

export function addCategory(
	context: Context,
	name: string,
	parentIdentifier: string | null = null
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
		color: parent ? value(parent, 'color') : null,
		keepDone: parent ? value(parent, 'keepDone') : false,
		order: endOf(siblings),
		deleted: false
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
			deleted: false
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
		deleted: false
	});
	const tagChanges = alive(context.records, 'tag')
		.filter((tag) => hasTag(context.records, parent, tag))
		.flatMap((tag) => setTagged(context, task, tag, true));
	return { task, changes: [change, ...tagChanges, ...deleteStep(context, step)] };
}
