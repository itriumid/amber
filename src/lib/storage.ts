// Where a list lives: this browser's own database (IndexedDB), on this device only. Nothing here
// talks to a network.
//
// One database, three stores:
// - `records`: every record of the list, as Amber's format describes it.
// - `details`: this browser's device identifier, and the format version the records are in.
// - `snapshots`: whole copies kept before anything risky (a format upgrade, an import), so it can be
//   put back.
//
// Amber can be open in several tabs at once, all on the same database. A tab's list on screen can be
// behind what another tab saved, so saving merges each record with the stored one, field by field,
// instead of writing over it, and tells the other tabs what it saved so they catch up.

import { Clock } from './model/clock';
import { FORMAT_VERSION, migrate, readEntity } from './model/format';
import { newIdentifier } from './model/identifiers';
import { merge, type Entity } from './model/list';

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

/** Saving was refused because the stored list is in a newer format than this Amber knows. */
export class NewerFormatError extends Error {
	constructor() {
		super('The list was saved by a newer version of Amber.');
	}
}

export interface StorageWatcher {
	/** Another tab saved these records, in this format. */
	changed: (records: unknown[], format: number) => void;
	/**
	 * The database went away while the page was open: its data was cleared, or the browser closed it.
	 * It opens again on the next write, so the list on screen can be written back.
	 */
	lost: () => void;
	/** A newer version of Amber, in another tab, needs the database for itself. */
	newer: () => void;
}

let watcher: StorageWatcher | undefined;
let channel: BroadcastChannel | undefined;

/** Hears what happens to storage from elsewhere: other tabs, and the browser. */
export function watchStorage(watching: StorageWatcher) {
	watcher = watching;
	if (typeof addEventListener !== 'undefined') addEventListener('pagehide', saveBeforeLeaving);
	if (channel || typeof BroadcastChannel === 'undefined') return;
	channel = new BroadcastChannel(DATABASE);
	channel.onmessage = (event: MessageEvent<{ format?: unknown; records?: unknown }>) => {
		const { format, records } = event.data ?? {};
		if (typeof format === 'number' && Array.isArray(records)) watcher?.changed(records, format);
	};
}

let opening: Promise<IDBDatabase> | undefined;
/** The open database, once it is: writes use it straight away, without waiting for a promise. */
let ready: IDBDatabase | undefined;
/** This browser's device identifier, written back with the records if the details were lost. */
let knownDevice: string | undefined;

/** Lets go of a connection that's closed, so the next write opens the database again. */
function forget(connection: IDBDatabase) {
	if (ready && ready !== connection) return;
	ready = undefined;
	opening = undefined;
}

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
			const connection = open.result;
			// The browser closed it: the site's data was cleared, or something went wrong underneath.
			connection.onclose = () => {
				forget(connection);
				watcher?.lost();
			};
			// Another page wants the database: deleting it (no new version), or a newer Amber upgrading
			// it. Either way it waits until this connection closes.
			connection.onversionchange = (event) => {
				connection.close();
				forget(connection);
				if (event.newVersion === null) watcher?.lost();
				else watcher?.newer();
			};
			ready = connection;
			resolve(connection);
		};
		open.onerror = () => {
			opening = undefined;
			reject(open.error);
		};
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
	knownDevice = device;
	const version = format ?? FORMAT_VERSION;
	const readOnly = version > FORMAT_VERSION;
	let usable: unknown[] = raw;
	if (!readOnly && version < FORMAT_VERSION) {
		await keepSnapshot('Before upgrading the list to a newer format', raw, version);
		usable = migrate(raw, version);
		await putRecords(opened, usable);
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

/** Writes records as they are, all or none: only for a format upgrade, on the records just read. */
async function putRecords(opened: IDBDatabase, records: unknown[]) {
	if (!records.length) return;
	const transaction = opened.transaction('records', 'readwrite', { durability: 'strict' });
	const store = transaction.objectStore('records');
	for (const record of records) store.put(record);
	transaction.commit();
	await done(transaction);
}

/**
 * A record to save, merged field by field with the one already stored (the later stamp wins), so a
 * change another tab saved in the meantime isn't written over. Undefined when the stored record
 * can't be read: it stays as it is, untouched.
 */
export function mergeWithStored(stored: unknown, ours: Entity): Entity | undefined {
	if (stored === undefined) return ours;
	const theirs = readEntity(stored);
	if (!theirs || theirs.identifier !== ours.identifier) return undefined;
	const context = { records: { [theirs.identifier]: theirs }, clock: new Clock('storage') };
	merge(context, [ours]);
	return context.records[theirs.identifier];
}

/** A save still reading what's stored: it hasn't asked to commit yet. */
interface Reading {
	transaction: IDBTransaction;
	records: Entity[];
}
const reading = new Set<Reading>();

/**
 * Saves records, all or none, each merged with the one stored, and tells the other open tabs.
 * Returns the records as they were saved, which can hold changes from other tabs. Refuses, with a
 * `NewerFormatError`, when the stored list is in a newer format: it's never written over.
 */
export async function writeRecords(records: Entity[]): Promise<Entity[]> {
	if (!records.length) return [];
	// Once the database is open, the write starts in this very task and is committed as soon as the
	// stored records are read. A page that goes away before then saves them in `saveBeforeLeaving`.
	const opened = ready ?? (await database());
	const transaction = opened.transaction(['records', 'details'], 'readwrite', {
		durability: 'strict'
	});
	const store = transaction.objectStore('records');
	const details = transaction.objectStore('details');
	const format = details.get('format');
	const device = details.get('device');
	const reads = records.map((record) => store.get(record.identifier));
	const pending: Reading = { transaction, records };
	reading.add(pending);
	const saved: Entity[] = [];
	let newer = false;
	// Requests in a transaction finish in the order they were made, so when the last read is done,
	// every one before it is too.
	reads[reads.length - 1].onsuccess = () => {
		reading.delete(pending);
		const storedFormat = format.result as unknown;
		if (typeof storedFormat === 'number' && storedFormat > FORMAT_VERSION) {
			newer = true;
			transaction.abort();
			return;
		}
		// The details go missing only when the site's data was cleared under an open page.
		if (storedFormat === undefined) details.put(FORMAT_VERSION, 'format');
		if (device.result === undefined && knownDevice) details.put(knownDevice, 'device');
		records.forEach((record, index) => {
			const merged = mergeWithStored(reads[index].result, record);
			if (!merged) return;
			store.put(merged);
			saved.push(merged);
		});
		transaction.commit();
	};
	try {
		await done(transaction);
	} catch (error) {
		throw newer ? new NewerFormatError() : error;
	} finally {
		reading.delete(pending);
	}
	channel?.postMessage({ format: FORMAT_VERSION, records: saved });
	return saved;
}

/**
 * A page that's reloaded or closed within moments of a change can go before its save has read what's
 * stored, and the browser drops a save that hasn't committed. So as the page goes, those saves are
 * replaced by one that writes the records as they are and commits at once. It can write over a
 * change another tab made in those same moments; losing this change for certain would be worse.
 */
function saveBeforeLeaving(event: PageTransitionEvent) {
	// A page kept to come back to isn't gone: its saves finish as usual.
	if (event.persisted || !reading.size || !ready) return;
	const records = new Map<string, Entity>();
	for (const pending of reading) {
		try {
			pending.transaction.abort();
		} catch {
			continue;
		}
		for (const record of pending.records) records.set(record.identifier, record);
	}
	reading.clear();
	if (!records.size) return;
	try {
		const transaction = ready.transaction('records', 'readwrite', { durability: 'strict' });
		const store = transaction.objectStore('records');
		for (const record of records.values()) store.put(record);
		transaction.commit();
	} catch {
		// The database is already closed: there's nothing left to save with.
	}
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
