// Moving a list between devices and keeping copies of it: as a file, or as a link. Both carry the
// same thing: every record, deleted ones too (so deletions travel), in Amber's format, with the
// format version. A passphrase can lock either one; without it, the contents can't be read.
//
// A link keeps the list after the `#`, which browsers never send to a server: opening one hands
// the list to Amber in the browser, and nowhere else.

import {
	compressToEncodedURIComponent,
	compressToUint8Array,
	decompressFromEncodedURIComponent,
	decompressFromUint8Array
} from 'lz-string';
import { LINK_PREFIX } from './links';
import { Clock } from './model/clock';
import { FORMAT_VERSION, migrate, readEntity } from './model/format';
import { merge, restore, type Change, type Entity, type Kind, type Records } from './model/list';

/** What a file or link holds, before it's locked. */
interface Contents {
	amber: 1;
	format: number;
	exportedAt: string;
	records: unknown[];
}

/** A locked file: the contents, encrypted with a key made from the passphrase. */
interface Locked {
	amber: 1;
	locked: { salt: string; iv: string; iterations: number; data: string };
}

export type Reading =
	| { kind: 'list'; records: Entity[]; unreadable: number; exportedAt: string | undefined }
	| { kind: 'locked' }
	| { kind: 'wrong-passphrase' }
	| { kind: 'newer'; format: number }
	| { kind: 'not-amber' };

/** Links longer than this are refused: past it, chat applications and browsers start cutting. */
export const LINK_LIMIT = 60_000;

/** The work it takes to try one passphrase: OWASP's 2023 advice for PBKDF2 with SHA-256. */
const ITERATIONS = 600_000;

/* ─── Encryption ─── */

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
	const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/** Large buffers, a chunk at a time: spreading a whole one into btoa overflows the call stack. */
function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (let start = 0; start < bytes.length; start += 0x8000)
		binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function keyFrom(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
	const material = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(passphrase.normalize('NFC')),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

async function lock(plain: Uint8Array<ArrayBuffer>, passphrase: string) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await keyFrom(passphrase, salt, ITERATIONS);
	const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
	return { salt, iv, data };
}

async function unlock(
	salt: Uint8Array<ArrayBuffer>,
	iv: Uint8Array<ArrayBuffer>,
	data: Uint8Array<ArrayBuffer>,
	passphrase: string,
	iterations: number
): Promise<Uint8Array<ArrayBuffer> | undefined> {
	try {
		const key = await keyFrom(passphrase, salt, iterations);
		return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data));
	} catch {
		// AES-GCM checks what it decrypts: a wrong passphrase fails here, never as garbage.
		return undefined;
	}
}

/* ─── Contents ─── */

export function contents(records: Records): Contents {
	return {
		amber: 1,
		format: FORMAT_VERSION,
		exportedAt: new Date().toISOString(),
		records: Object.values(records)
	};
}

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Checks what a file or link held, and brings older formats up to this one. */
export function readContents(value: unknown): Reading {
	if (!isObject(value) || value.amber !== 1 || !Array.isArray(value.records))
		return { kind: 'not-amber' };
	const format = value.format;
	if (typeof format !== 'number' || !Number.isInteger(format) || format < 1)
		return { kind: 'not-amber' };
	if (format > FORMAT_VERSION) return { kind: 'newer', format };
	const records = migrate(value.records, format)
		.map(readEntity)
		.filter((entity): entity is Entity => !!entity);
	return {
		kind: 'list',
		records,
		unreadable: value.records.length - records.length,
		exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : undefined
	};
}

export function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/* ─── Files ─── */

export async function toFile(records: Records, passphrase?: string): Promise<string> {
	const plain = JSON.stringify(contents(records));
	if (!passphrase) return plain;
	const { salt, iv, data } = await lock(new TextEncoder().encode(plain), passphrase);
	const locked: Locked = {
		amber: 1,
		locked: {
			salt: bytesToBase64Url(salt),
			iv: bytesToBase64Url(iv),
			iterations: ITERATIONS,
			data: bytesToBase64Url(data)
		}
	};
	return JSON.stringify(locked);
}

export async function readFile(text: string, passphrase?: string): Promise<Reading> {
	const value = parseJson(text);
	if (isObject(value) && value.amber === 1 && isObject(value.locked)) {
		const { salt, iv, data, iterations } = value.locked;
		if (
			typeof salt !== 'string' ||
			typeof iv !== 'string' ||
			typeof data !== 'string' ||
			typeof iterations !== 'number'
		)
			return { kind: 'not-amber' };
		if (!passphrase) return { kind: 'locked' };
		const plain = await unlock(
			fromBase64Url(salt),
			fromBase64Url(iv),
			fromBase64Url(data),
			passphrase,
			iterations
		);
		if (!plain) return { kind: 'wrong-passphrase' };
		return readContents(parseJson(new TextDecoder().decode(plain)));
	}
	return readContents(value);
}

/** A file name with the date, so copies sort and say when they were made: amber-2026-10-12.json. */
export function fileName(now = new Date()): string {
	const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
		.map((part) => String(part).padStart(2, '0'))
		.join('-');
	return `amber-${day}.json`;
}

/* ─── Links ─── */

/** The part of a link after the address: `#list=…`, or `#locked=…` with a passphrase. */
export async function toLink(records: Records, passphrase?: string): Promise<string> {
	const plain = JSON.stringify(contents(records));
	if (!passphrase) return LINK_PREFIX.open + compressToEncodedURIComponent(plain);
	const { salt, iv, data } = await lock(new Uint8Array(compressToUint8Array(plain)), passphrase);
	const joined = new Uint8Array(salt.length + iv.length + data.length);
	joined.set(salt);
	joined.set(iv, salt.length);
	joined.set(data, salt.length + iv.length);
	return LINK_PREFIX.locked + bytesToBase64Url(joined);
}

export async function readLink(hash: string, passphrase?: string): Promise<Reading> {
	if (hash.startsWith(LINK_PREFIX.open)) {
		const plain = decompressFromEncodedURIComponent(hash.slice(LINK_PREFIX.open.length));
		return plain ? readContents(parseJson(plain)) : { kind: 'not-amber' };
	}
	if (!hash.startsWith(LINK_PREFIX.locked)) return { kind: 'not-amber' };
	let joined: Uint8Array<ArrayBuffer>;
	try {
		joined = fromBase64Url(hash.slice(LINK_PREFIX.locked.length));
	} catch {
		return { kind: 'not-amber' };
	}
	if (joined.length < 16 + 12 + 16) return { kind: 'not-amber' };
	if (!passphrase) return { kind: 'locked' };
	const plain = await unlock(
		joined.slice(0, 16),
		joined.slice(16, 28),
		joined.slice(28),
		passphrase,
		ITERATIONS
	);
	if (!plain) return { kind: 'wrong-passphrase' };
	const text = decompressFromUint8Array(plain);
	return text ? readContents(parseJson(text)) : { kind: 'not-amber' };
}

/* ─── Previews ─── */

export interface Counts {
	added: number;
	changed: number;
	deleted: number;
}

export type Preview = Record<'tasks' | 'categories' | 'tags', Counts>;

/**
 * What a list of changes does, as people think of it: steps and tags count as changes to their
 * task, unless the task itself is new.
 */
export function describe(before: Records, after: Records, changes: Change[]): Preview {
	const preview: Preview = {
		tasks: { added: 0, changed: 0, deleted: 0 },
		categories: { added: 0, changed: 0, deleted: 0 },
		tags: { added: 0, changed: 0, deleted: 0 }
	};
	const group: Partial<Record<Kind, keyof Preview>> = {
		task: 'tasks',
		category: 'categories',
		tag: 'tags'
	};
	const counted = new Set<string>();
	const touchedTasks = new Set<string>();
	for (const change of changes) {
		const entity = after[change.identifier];
		if (!entity) continue;
		const target = group[entity.kind];
		const fields = entity.fields as Record<string, { value: unknown }>;
		if (!target) {
			const task = fields.taskIdentifier?.value;
			if (typeof task === 'string') touchedTasks.add(task);
			continue;
		}
		counted.add(change.identifier);
		const wasThere = !change.created && !before[change.identifier]?.fields.deleted.value;
		const isThere = !fields.deleted.value;
		if (!wasThere && isThere) preview[target].added++;
		else if (wasThere && !isThere) preview[target].deleted++;
		else if (wasThere && isThere) preview[target].changed++;
	}
	for (const task of touchedTasks) {
		if (counted.has(task)) continue;
		const entity = after[task];
		if (entity && !entity.fields.deleted.value && before[task]) preview.tasks.changed++;
	}
	return preview;
}

export const isNothing = (preview: Preview) =>
	Object.values(preview).every((counts) => !counts.added && !counts.changed && !counts.deleted);

/**
 * What merging records in would do, worked out on a copy: the list itself is untouched. Pass plain
 * records (`$state.snapshot`), since a reactive proxy can't be copied.
 */
export function previewMerge(records: Records, incoming: Entity[]): Preview {
	const copy = structuredClone(records);
	const { changes } = merge({ records: copy, clock: new Clock('preview') }, incoming);
	return describe(records, copy, changes);
}

/** What putting a snapshot back would do, worked out on a copy. */
export function previewRestore(records: Records, snapshot: Entity[]): Preview {
	const copy = structuredClone(records);
	const changes = restore({ records: copy, clock: new Clock('preview') }, snapshot);
	return describe(records, copy, changes);
}

/** "Adds 3 tasks and 1 tag. Changes 2 tasks." */
export function summarize(preview: Preview): string {
	const nouns: Record<keyof Preview, [string, string]> = {
		tasks: ['task', 'tasks'],
		categories: ['category', 'categories'],
		tags: ['tag', 'tags']
	};
	const sentence = (verb: string, key: keyof Counts) => {
		const parts = (Object.keys(nouns) as (keyof Preview)[])
			.filter((group) => preview[group][key])
			.map((group) => {
				const count = preview[group][key];
				return `${count} ${nouns[group][count === 1 ? 0 : 1]}`;
			});
		if (!parts.length) return '';
		const list =
			parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
		return `${verb} ${list}.`;
	};
	return [sentence('Adds', 'added'), sentence('Changes', 'changed'), sentence('Deletes', 'deleted')]
		.filter(Boolean)
		.join(' ');
}
