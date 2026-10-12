// The list itself: categories, tags, tasks and their steps, and every way to change them.
//
// Each record keeps every field as its own small register: the value, and the stamp of the edit that
// set it. Two copies of a list merge field by field (the later stamp wins), so renaming a task on
// one device and ticking it on another keeps both. Nothing is ever removed: deleting sets a field
// too, so a deletion travels to other copies like any other edit, and can be undone.

import { Clock, type Stamp } from './clock';
import { newIdentifier } from './identifiers';
import { keyBetween } from './order';

export const COLORS = ['rose', 'sage', 'sand', 'blue', 'teal', 'lavender'] as const;
export type Color = (typeof COLORS)[number];

export const LIMITS = { title: 500, notes: 20_000, name: 80, step: 500 } as const;

export interface TaskValues {
	title: string;
	notes: string;
	done: boolean;
	/** When it was done, in milliseconds, for "Done 12 March 2027". */
	doneAt: number | null;
	categoryIdentifier: string | null;
	order: string;
	deleted: boolean;
}

export interface CategoryValues {
	name: string;
	/** A category inside another; only one level deep. */
	parentIdentifier: string | null;
	color: Color | null;
	/** Bucket-list style: done tasks stay in view, with their date, instead of tucking away. */
	keepDone: boolean;
	order: string;
	deleted: boolean;
}

export interface TagValues {
	name: string;
	color: Color | null;
	deleted: boolean;
}

/** A small checklist item inside a task. */
export interface StepValues {
	taskIdentifier: string;
	text: string;
	done: boolean;
	order: string;
	deleted: boolean;
}

/** A tag on a task. Its own record, so tagging on one device and untagging on another merge. */
export interface TaggingValues {
	taskIdentifier: string;
	tagIdentifier: string;
	on: boolean;
	deleted: boolean;
}

export interface ValuesByKind {
	task: TaskValues;
	category: CategoryValues;
	tag: TagValues;
	step: StepValues;
	tagging: TaggingValues;
}
export type Kind = keyof ValuesByKind;
export const KINDS: Kind[] = ['category', 'tag', 'task', 'step', 'tagging'];

export interface Register<T> {
	value: T;
	stamp: Stamp;
}

export type Fields<K extends Kind> = { [F in keyof ValuesByKind[K]]: Register<ValuesByKind[K][F]> };

export interface Entity<K extends Kind = Kind> {
	identifier: string;
	kind: K;
	fields: Fields<K>;
}

export type Task = Entity<'task'>;
export type Category = Entity<'category'>;
export type Tag = Entity<'tag'>;
export type Step = Entity<'step'>;
export type Tagging = Entity<'tagging'>;

/** Every record in a list, by identifier. */
export type Records = Record<string, Entity>;

/** What one action changed, so it can be undone: each field's value before and after. */
export interface Change {
	identifier: string;
	before: Record<string, unknown>;
	after: Record<string, unknown>;
	/** True when the action created the record. */
	created: boolean;
}

export interface Context {
	records: Records;
	clock: Clock;
}

/* ─── Reading ─── */

export function value<K extends Kind, F extends keyof ValuesByKind[K]>(
	entity: Entity<K>,
	field: F
): ValuesByKind[K][F] {
	return entity.fields[field].value;
}

export function isKind<K extends Kind>(entity: Entity | undefined, kind: K): entity is Entity<K> {
	return entity?.kind === kind;
}

export function isDeleted(entity: Entity): boolean {
	return (entity.fields as Record<string, Register<unknown>>).deleted?.value === true;
}

/** Records of a kind that haven't been deleted. */
export function alive<K extends Kind>(records: Records, kind: K): Entity<K>[] {
	const found: Entity<K>[] = [];
	for (const entity of Object.values(records)) {
		if (isKind(entity, kind) && !isDeleted(entity)) found.push(entity);
	}
	return found;
}

function byOrder(
	a: { identifier: string; fields: { order: Register<string> } },
	b: { identifier: string; fields: { order: Register<string> } }
) {
	const left = a.fields.order.value;
	const right = b.fields.order.value;
	// Two devices can put things in the same place at once: the identifier settles a tie, the same way everywhere.
	return left < right ? -1 : left > right ? 1 : a.identifier < b.identifier ? -1 : 1;
}

export function get<K extends Kind>(
	records: Records,
	identifier: string | null,
	kind: K
): Entity<K> | undefined {
	if (!identifier) return undefined;
	const entity = records[identifier];
	return isKind(entity, kind) && !isDeleted(entity) ? entity : undefined;
}

/** Top-level categories, in order, each with its subcategories. */
export function categoryTree(records: Records): { category: Category; children: Category[] }[] {
	const categories = alive(records, 'category').sort(byOrder);
	const top = categories.filter((category) => {
		const parent = value(category, 'parentIdentifier');
		return parent === null || !get(records, parent, 'category');
	});
	return top.map((category) => ({
		category,
		children: categories.filter((child) => value(child, 'parentIdentifier') === category.identifier)
	}));
}

export function tags(records: Records): Tag[] {
	return alive(records, 'tag').sort((a, b) =>
		value(a, 'name').localeCompare(value(b, 'name'), undefined, { sensitivity: 'base' })
	);
}

/** Tasks in a category (or with none, for `null`), in order. Done ones are included. */
export function tasksIn(records: Records, categoryIdentifier: string | null): Task[] {
	return alive(records, 'task')
		.filter((task) => {
			const category = value(task, 'categoryIdentifier');
			// A task whose category is gone shows with the uncategorized ones.
			return categoryIdentifier === null
				? category === null || !get(records, category, 'category')
				: category === categoryIdentifier;
		})
		.sort(byOrder);
}

export function stepsOf(records: Records, taskIdentifier: string): Step[] {
	return alive(records, 'step')
		.filter((step) => value(step, 'taskIdentifier') === taskIdentifier)
		.sort(byOrder);
}

export function tagsOf(records: Records, taskIdentifier: string): Tag[] {
	const found: Tag[] = [];
	for (const tagging of alive(records, 'tagging')) {
		if (value(tagging, 'taskIdentifier') !== taskIdentifier || !value(tagging, 'on')) continue;
		const tag = get(records, value(tagging, 'tagIdentifier'), 'tag');
		if (tag) found.push(tag);
	}
	return found.sort((a, b) =>
		value(a, 'name').localeCompare(value(b, 'name'), undefined, { sensitivity: 'base' })
	);
}

export function findTag(records: Records, name: string): Tag | undefined {
	const wanted = name.trim().toLocaleLowerCase();
	return alive(records, 'tag').find((tag) => value(tag, 'name').toLocaleLowerCase() === wanted);
}

/* ─── Changing ─── */

function stampAll<K extends Kind>(values: ValuesByKind[K], stamp: Stamp): Fields<K> {
	const fields = {} as Record<string, Register<unknown>>;
	for (const [field, fieldValue] of Object.entries(values))
		fields[field] = { value: fieldValue, stamp };
	return fields as Fields<K>;
}

export function create<K extends Kind>(
	context: Context,
	kind: K,
	values: ValuesByKind[K],
	identifier: string = newIdentifier()
): { entity: Entity<K>; change: Change } {
	const entity: Entity<K> = { identifier, kind, fields: stampAll<K>(values, context.clock.tick()) };
	context.records[identifier] = entity as Entity;
	return { entity, change: { identifier, before: {}, after: { ...values }, created: true } };
}

/** Sets fields that actually change, each with a new stamp. */
export function update<K extends Kind>(
	context: Context,
	entity: Entity<K>,
	changes: Partial<ValuesByKind[K]>
): Change | undefined {
	const before: Record<string, unknown> = {};
	const after: Record<string, unknown> = {};
	const stamp = context.clock.tick();
	const fields = entity.fields as Record<string, Register<unknown>>;
	for (const [field, next] of Object.entries(changes)) {
		if (next === undefined || !(field in fields) || fields[field].value === next) continue;
		before[field] = fields[field].value;
		after[field] = next;
		fields[field] = { value: next, stamp };
	}
	return Object.keys(after).length
		? { identifier: entity.identifier, before, after, created: false }
		: undefined;
}

/**
 * Undoes changes, newest first, as new edits: an undo is itself an edit, so it travels to other
 * copies of the list like any other.
 */
export function undo(context: Context, changes: Change[]): Change[] {
	const redone: Change[] = [];
	for (const change of [...changes].reverse()) {
		const entity = context.records[change.identifier];
		if (!entity) continue;
		const restore = change.created ? { deleted: true } : change.before;
		const applied = update(context, entity, restore as never);
		if (applied) redone.push(applied);
	}
	return redone;
}

/* ─── Merging ─── */

export interface MergeSummary {
	added: number;
	updated: number;
	deleted: number;
}

/**
 * Brings records from another copy of the list into this one, field by field: the later stamp wins.
 * Merging the same records twice changes nothing, and the order they arrive in doesn't matter.
 */
export function merge(context: Context, incoming: Entity[]): MergeSummary {
	const summary: MergeSummary = { added: 0, updated: 0, deleted: 0 };
	for (const theirs of incoming) {
		for (const register of Object.values(theirs.fields as Record<string, Register<unknown>>)) {
			context.clock.observe(register.stamp);
		}
		const ours = context.records[theirs.identifier];
		if (!ours) {
			context.records[theirs.identifier] = structuredClone(theirs);
			if (!(theirs.fields as Record<string, Register<unknown>>).deleted?.value) summary.added++;
			continue;
		}
		if (ours.kind !== theirs.kind) continue;
		const mine = ours.fields as Record<string, Register<unknown>>;
		const other = theirs.fields as Record<string, Register<unknown>>;
		let changed = false;
		const wasDeleted = mine.deleted?.value === true;
		for (const [field, register] of Object.entries(other)) {
			if (!(field in mine) || register.stamp > mine[field].stamp) {
				mine[field] = { ...register };
				changed = true;
			}
		}
		if (!changed) continue;
		if (!wasDeleted && mine.deleted?.value === true) summary.deleted++;
		else summary.updated++;
	}
	return summary;
}

/* ─── Positions ─── */

/** An order key for the end of `siblings` (already in order). */
export function endOf(siblings: { fields: { order: Register<string> } }[]): string {
	const last = siblings.at(-1);
	return keyBetween(last ? last.fields.order.value : null, null);
}

/** An order key that moves `item` one place up or down among `siblings` (in order). */
export function stepKey<T extends { identifier: string; fields: { order: Register<string> } }>(
	siblings: T[],
	item: T,
	direction: -1 | 1
): string | undefined {
	const index = siblings.findIndex((sibling) => sibling.identifier === item.identifier);
	const target = index + direction;
	if (index < 0 || target < 0 || target >= siblings.length) return undefined;
	// Moving up lands between the two above; moving down, between the two below.
	const [low, high] =
		direction === -1
			? [siblings[target - 1], siblings[target]]
			: [siblings[target], siblings[target + 1]];
	const lowKey = low ? low.fields.order.value : null;
	const highKey = high ? high.fields.order.value : null;
	if (lowKey !== null && highKey !== null && lowKey >= highKey) return undefined;
	return keyBetween(lowKey, highKey);
}
