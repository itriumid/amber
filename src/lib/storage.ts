// Where a list lives: this browser's own database (IndexedDB), on this device only. Nothing here
// talks to a network.
//
// One database, three stores:
// - `records`: every record of the list, as Amber's format describes it.
// - `details`: this browser's device identifier, and the format version the records are in.
// - `snapshots`: whole copies kept before anything risky (a format upgrade, an import), so it can be
//   put back.

import { FORMAT_VERSION, migrate, readEntity } from './model/format';
import { newIdentifier } from './model/identifiers';
import type { Entity } from './model/list';

const DATABASE = 'amber';
const DATABASE_VERSION = 1;

export interface Opened {
	records: Entity[];
	device: string;
	/** True when the list was written by a newer Amber: it's shown, but never written over. */
	readOnly: boolean;
	/** Records that couldn't be read. They stay stored, untouched; this only counts them. */
	unreadable: number;
}

function request<T>(operation: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		operation.onsuccess = () => resolve(operation.result);
		operation.onerror = () => reject(operation.error);
	});
}

function done(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

let opening: Promise<IDBDatabase> | undefined;
/** The open database, once it is: writes use it straight away, without waiting for a promise. */
let ready: IDBDatabase | undefined;

function database(): Promise<IDBDatabase> {
	opening ??= new Promise((resolve, reject) => {
		const open = indexedDB.open(DATABASE, DATABASE_VERSION);
		open.onupgradeneeded = () => {
			const created = open.result;
			if (!created.objectStoreNames.contains('records'))
				created.createObjectStore('records', { keyPath: 'identifier' });
			if (!created.objectStoreNames.contains('details')) created.createObjectStore('details');
			if (!created.objectStoreNames.contains('snapshots'))
				created.createObjectStore('snapshots', { autoIncrement: true });
		};
		open.onsuccess = () => {
			ready = open.result;
			resolve(open.result);
		};
		open.onerror = () => reject(open.error);
		open.onblocked = () =>
			reject(new Error('Amber is open in another tab with an older version. Close it and reload.'));
	});
	return opening;
}

/** Opens this device's list, upgrading its format first if needed (after keeping a snapshot). */
export async function openList(): Promise<Opened> {
	const opened = await database();
	const transaction = opened.transaction(['records', 'details'], 'readonly');
	const [raw, format, storedDevice] = await Promise.all([
		request(transaction.objectStore('records').getAll()),
		request(transaction.objectStore('details').get('format')) as Promise<number | undefined>,
		request(transaction.objectStore('details').get('device')) as Promise<string | undefined>
	]);

	const device = storedDevice ?? newIdentifier(9);
	const version = format ?? FORMAT_VERSION;
	const readOnly = version > FORMAT_VERSION;
	let usable: unknown[] = raw;
	if (!readOnly && version < FORMAT_VERSION) {
		await keepSnapshot('Before upgrading the list to a newer format', raw, version);
		usable = migrate(raw, version);
		await writeRecords(usable as Entity[]);
	}
	const records = usable.map(readEntity).filter((entity): entity is Entity => !!entity);

	if (!readOnly && (format !== FORMAT_VERSION || storedDevice !== device)) {
		const writing = opened.transaction('details', 'readwrite');
		writing.objectStore('details').put(FORMAT_VERSION, 'format');
		writing.objectStore('details').put(device, 'device');
		await done(writing);
	}
	return { records, device, readOnly, unreadable: raw.length - records.length };
}

/** Writes records, all or none. */
export async function writeRecords(records: Entity[]) {
	if (!records.length) return;
	// Once the database is open, the write starts in this very task and is committed at once, without
	// waiting for a turn of the event loop: a reload or a closed tab right after a change keeps it.
	const opened = ready ?? (await database());
	const transaction = opened.transaction('records', 'readwrite', { durability: 'strict' });
	const store = transaction.objectStore('records');
	for (const record of records) store.put(record);
	transaction.commit();
	await done(transaction);
}

/** Copies kept of each sort: the daily ones go first, since there's always a newer one. */
const KEEP = { daily: 7, other: 10 };
/** A day's copy is skipped when one was kept less than this long ago. */
const DAILY_GAP = 20 * 60 * 60 * 1000;

interface StoredSnapshot {
	reason: string;
	takenAt: number;
	format: number;
	daily?: boolean;
	records: unknown[];
}

export interface Snapshot {
	key: number;
	reason: string;
	takenAt: number;
	/** Tasks in it that weren't deleted, to tell copies apart. */
	tasks: number;
	records: Entity[];
}

export async function keepSnapshot(
	reason: string,
	records: unknown[],
	format = FORMAT_VERSION,
	daily = false
) {
	const opened = await database();
	const transaction = opened.transaction('snapshots', 'readwrite');
	const store = transaction.objectStore('snapshots');
	const stored: StoredSnapshot = { reason, takenAt: Date.now(), format, daily, records };
	store.add(stored);
	// Oldest first, so the newest of each sort are the ones kept.
	const [keys, all] = await Promise.all([
		request(store.getAllKeys()),
		request(store.getAll()) as Promise<StoredSnapshot[]>
	]);
	const seen = { daily: 0, other: 0 };
	for (let index = all.length - 1; index >= 0; index--) {
		const sort = all[index].daily ? 'daily' : 'other';
		if (++seen[sort] > KEEP[sort]) store.delete(keys[index]);
	}
	await done(transaction);
}

/** Keeps the day's copy, unless one was kept recently. */
export async function keepDailySnapshot(records: unknown[]) {
	if (!records.length) return;
	const opened = await database();
	const cursor = await request(
		opened.transaction('snapshots', 'readonly').objectStore('snapshots').openCursor(null, 'prev')
	);
	const newest = cursor?.value as StoredSnapshot | undefined;
	if (newest && Date.now() - newest.takenAt < DAILY_GAP) return;
	await keepSnapshot('Daily copy', records, FORMAT_VERSION, true);
}

/** Every copy kept on this device, newest first, in this format. */
export async function listSnapshots(): Promise<Snapshot[]> {
	const opened = await database();
	const store = opened.transaction('snapshots', 'readonly').objectStore('snapshots');
	const [keys, all] = await Promise.all([
		request(store.getAllKeys()),
		request(store.getAll()) as Promise<StoredSnapshot[]>
	]);
	const snapshots: Snapshot[] = [];
	all.forEach((stored, index) => {
		// A copy from a newer format can't be read here; it stays stored for that newer Amber.
		if (stored.format > FORMAT_VERSION) return;
		const records = migrate(stored.records, stored.format)
			.map(readEntity)
			.filter((entity): entity is Entity => !!entity);
		snapshots.push({
			key: keys[index] as number,
			reason: stored.reason,
			takenAt: stored.takenAt,
			tasks: records.filter((record) => record.kind === 'task' && !record.fields.deleted.value)
				.length,
			records
		});
	});
	return snapshots.reverse();
}

/** Asks the browser to keep Amber's storage even when space runs low. Whether it does is up to it. */
export async function askToKeepStorage(): Promise<boolean> {
	if (!navigator.storage?.persist) return false;
	if (await navigator.storage.persisted()) return true;
	return navigator.storage.persist();
}
