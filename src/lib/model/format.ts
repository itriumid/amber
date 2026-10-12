// Amber's data format, and the promise that comes with it: an update never loses anyone's list.
//
// - Every list carries the format version it was written in. Newer versions of Amber read every
//   older one, through migrations that only ever add: a field may gain a default, never vanish.
// - Fields this version doesn't know are kept, not dropped, so a list touched by a newer Amber on
//   another device comes back intact.
// - A list written by a newer format than this Amber knows is opened read-only, never rewritten.
// - fixtures/ holds a list from each format version; tests load every one, forever.

import { parseStamp } from './clock';
import { isOrderKey } from './order';
import { COLORS, LIMITS, type Entity, type Kind, type Register } from './list';

/** The format this version of Amber writes. Bump it only with a migration, and a new fixture. */
export const FORMAT_VERSION = 1;

type Check = (value: unknown) => boolean;
const text =
	(limit: number): Check =>
	(value) =>
		typeof value === 'string' && value.length <= limit;
const flag: Check = (value) => typeof value === 'boolean';
const identifierOrNull: Check = (value) =>
	value === null || (typeof value === 'string' && /^[A-Za-z0-9_.-]{1,200}$/.test(value));
const identifier: Check = (value) =>
	typeof value === 'string' && /^[A-Za-z0-9_.-]{1,200}$/.test(value);
const colorOrNull: Check = (value) => value === null || COLORS.includes(value as never);
const timeOrNull: Check = (value) =>
	value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
const order: Check = isOrderKey;

/** Every field each kind must have in this format, and what its value must look like. */
const SHAPES: Record<Kind, Record<string, Check>> = {
	task: {
		title: text(LIMITS.title),
		notes: text(LIMITS.notes),
		done: flag,
		doneAt: timeOrNull,
		categoryIdentifier: identifierOrNull,
		order,
		deleted: flag
	},
	category: {
		name: text(LIMITS.name),
		parentIdentifier: identifierOrNull,
		color: colorOrNull,
		keepDone: flag,
		order,
		deleted: flag
	},
	tag: { name: text(LIMITS.name), color: colorOrNull, deleted: flag },
	step: { taskIdentifier: identifier, text: text(LIMITS.step), done: flag, order, deleted: flag },
	tagging: { taskIdentifier: identifier, tagIdentifier: identifier, on: flag, deleted: flag }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

function isRegister(value: unknown): value is Register<unknown> {
	return (
		isRecord(value) &&
		'value' in value &&
		typeof value.stamp === 'string' &&
		parseStamp(value.stamp) !== undefined
	);
}

/**
 * A record read from storage, a file or a link, checked: anyone can make a file, so nothing in one is
 * trusted as it comes. Known fields must have the right shape; unknown ones are kept as they are,
 * as long as they look like a field. Undefined when the record isn't one Amber can use.
 */
export function readEntity(raw: unknown): Entity | undefined {
	if (
		!isRecord(raw) ||
		!identifier(raw.identifier) ||
		typeof raw.kind !== 'string' ||
		!(raw.kind in SHAPES) ||
		!isRecord(raw.fields)
	)
		return undefined;
	const shape = SHAPES[raw.kind as Kind];
	const fields: Record<string, Register<unknown>> = {};
	for (const [field, register] of Object.entries(raw.fields)) {
		if (!isRegister(register)) return undefined;
		if (field in shape && !shape[field](register.value)) return undefined;
		fields[field] = { value: register.value, stamp: register.stamp };
	}
	for (const field of Object.keys(shape)) if (!(field in fields)) return undefined;
	return { identifier: raw.identifier as string, kind: raw.kind as Kind, fields } as Entity;
}

/**
 * Brings records written in an older format up to this one. Each step only adds: a new field gets a
 * default stamped at the start of time, so any real edit on any device wins over it.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => void> = {
	// 1 → 2 would go here, for example:
	// 1: (raw) => { if (raw.kind === 'task') (raw.fields as Record<string, unknown>).dueAt ??= { value: null, stamp: BEGINNING }; }
};

export function migrate(raw: unknown[], fromVersion: number): unknown[] {
	if (fromVersion > FORMAT_VERSION)
		throw new Error(`written by a newer Amber (format ${fromVersion})`);
	const records = structuredClone(raw) as Record<string, unknown>[];
	for (let version = fromVersion; version < FORMAT_VERSION; version++) {
		const step = MIGRATIONS[version];
		if (!step) throw new Error(`no way to read format ${version}`);
		for (const record of records) if (isRecord(record)) step(record);
	}
	return records;
}
