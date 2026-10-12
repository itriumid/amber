import { describe, expect, it } from 'vitest';
import { addCategory, addStep, addTask, deleteTask, setTitle } from './model/actions';
import { FORMAT_VERSION } from './model/format';
import { merge, restore, undo, type Records } from './model/list';
import { LINK_PREFIX } from './links';
import { fresh } from './model/testing';
import {
	fileName,
	isNothing,
	previewMerge,
	previewRestore,
	readFile,
	readLink,
	summarize,
	toFile,
	toLink
} from './transfer';

function list() {
	const context = fresh('laptop');
	const home = addCategory(context, 'Home', null)!.category;
	const paint = addTask(context, 'Paint the bedroom #weekend', home.identifier)!.task;
	addStep(context, paint, 'Buy rollers');
	const gone = addTask(context, 'Gone soon', null)!.task;
	deleteTask(context, gone);
	return context;
}

const ids = (records: Records) => Object.keys(records).sort();

describe('files', () => {
	it('carry every record, deleted ones too, and read back the same', async () => {
		const { records } = list();
		const reading = await readFile(await toFile(records));
		expect(reading.kind).toBe('list');
		if (reading.kind !== 'list') return;
		expect(reading.records.map((record) => record.identifier).sort()).toEqual(ids(records));
		expect(reading.unreadable).toBe(0);
		expect(JSON.parse(await toFile(records)).format).toBe(FORMAT_VERSION);
	});

	it('lock with a passphrase, and need the right one', async () => {
		const { records } = list();
		const locked = await toFile(records, 'kopi susu');
		expect(locked).not.toContain('Paint');
		expect((await readFile(locked)).kind).toBe('locked');
		expect((await readFile(locked, 'kopi')).kind).toBe('wrong-passphrase');
		const reading = await readFile(locked, 'kopi susu');
		expect(reading.kind === 'list' && reading.records.length).toBe(Object.keys(records).length);
	});

	it("refuse what isn't Amber's, and say when a newer Amber wrote it", async () => {
		expect((await readFile('not json')).kind).toBe('not-amber');
		expect((await readFile('{"records": []}')).kind).toBe('not-amber');
		const newer = JSON.stringify({ amber: 1, format: FORMAT_VERSION + 1, records: [] });
		expect(await readFile(newer)).toEqual({ kind: 'newer', format: FORMAT_VERSION + 1 });
	});

	it('count records they had to leave out', async () => {
		const file = JSON.parse(await toFile(list().records));
		file.records.push({ identifier: 'broken', kind: 'task', fields: {} });
		const reading = await readFile(JSON.stringify(file));
		expect(reading.kind === 'list' && reading.unreadable).toBe(1);
	});

	it('are named by the day', () => {
		expect(fileName(new Date(2026, 9, 2))).toBe('amber-2026-10-02.json');
	});
});

describe('links', () => {
	it('read back the same, open or locked', async () => {
		const { records } = list();
		const open = await toLink(records);
		expect(open.startsWith(LINK_PREFIX.open)).toBe(true);
		const reading = await readLink(open);
		expect(reading.kind === 'list' && reading.records.length).toBe(Object.keys(records).length);

		const locked = await toLink(records, 'rahasia');
		expect(locked.startsWith(LINK_PREFIX.locked)).toBe(true);
		expect((await readLink(locked)).kind).toBe('locked');
		expect((await readLink(locked, 'salah')).kind).toBe('wrong-passphrase');
		const unlocked = await readLink(locked, 'rahasia');
		expect(unlocked.kind === 'list' && unlocked.records.length).toBe(Object.keys(records).length);
	});

	it('refuse a damaged link', async () => {
		expect((await readLink('#list=garbage!!')).kind).toBe('not-amber');
		expect((await readLink('#locked=abc')).kind).toBe('not-amber');
	});
});

describe('previews', () => {
	it('say what a merge would add and change, without changing the list', async () => {
		const laptop = list();
		const phone = fresh('phone');
		merge(phone, Object.values(structuredClone(laptop.records)));
		const paint = Object.values(laptop.records).find(
			(record) => record.kind === 'task' && !record.fields.deleted.value
		)!;
		setTitle(laptop, paint as never, 'Paint the bedroom white');
		addTask(laptop, 'New one', null);
		const before = structuredClone(phone.records);
		const preview = previewMerge(phone.records, Object.values(laptop.records));
		expect(phone.records).toEqual(before);
		expect(summarize(preview)).toBe('Adds 1 task. Changes 1 task.');
	});

	it('count steps and tags as changes to their task, unless the task is new', () => {
		const fresher = fresh('phone');
		const preview = previewMerge(fresher.records, Object.values(list().records));
		expect(summarize(preview)).toBe('Adds 1 task, 1 category and 1 tag.');
	});

	it('know when nothing would change', () => {
		const { records } = list();
		expect(isNothing(previewMerge(records, Object.values(structuredClone(records))))).toBe(true);
	});

	it('say what restoring a snapshot would do, and restoring brings it back', () => {
		const context = list();
		const snapshot = Object.values(structuredClone(context.records));
		const extra = addTask(context, 'Added after', null)!.task;
		const paint = Object.values(context.records).find(
			(record) => record.kind === 'task' && !record.fields.deleted.value && record !== extra
		)!;
		deleteTask(context, paint as never);
		expect(summarize(previewRestore(context.records, snapshot))).toBe(
			'Adds 1 task. Deletes 1 task.'
		);
		restore(context, snapshot);
		expect(previewRestore(context.records, snapshot)).toEqual(previewMerge(context.records, []));
		expect(context.records[extra.identifier].fields.deleted.value).toBe(true);
		expect(context.records[paint.identifier].fields.deleted.value).toBe(false);
	});
});

describe('undoing', () => {
	it('takes a merge back: new records are deleted and changed ones restored', () => {
		const laptop = list();
		const phone = fresh('phone');
		merge(phone, Object.values(structuredClone(laptop.records)));
		const shown = () =>
			Object.values(phone.records)
				.filter((record) => !record.fields.deleted.value)
				.map((record) =>
					JSON.stringify([
						record.identifier,
						...Object.values(record.fields).map((field) => field.value)
					])
				)
				.sort();
		const before = shown();
		const paint = Object.values(laptop.records).find(
			(record) => record.kind === 'task' && !record.fields.deleted.value
		)!;
		setTitle(laptop, paint as never, 'Paint the bedroom white');
		addTask(laptop, 'New one', null);
		const { changes } = merge(phone, Object.values(laptop.records));
		expect(shown()).not.toEqual(before);
		undo(phone, changes);
		expect(shown()).toEqual(before);
	});
});
