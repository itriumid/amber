import { describe, expect, it } from 'vitest';
import {
	addCategory,
	addStep,
	addTask,
	addSealedTask,
	lockList,
	lockedListOf,
	moveIntoLocked,
	moveOutOfLocked,
	setSealedTask,
	unlockList,
	type SealedTask
} from './actions';
import { merge, stepsOf, tagsOf, undo, value, type Entity, type Task } from './list';
import { fresh } from './testing';
import { createLock, seal, unseal } from '../sealing';

const sealTask = async (
	key: CryptoKey,
	task: Task,
	title: string,
	notes = ''
): Promise<SealedTask> => ({
	sealedTitle: await seal(key, task.identifier, 'sealedTitle', title),
	sealedNotes: await seal(key, task.identifier, 'sealedNotes', notes)
});

describe('locked lists', () => {
	it('locks a list in one change: sealed, untagged, plain text gone, and Undo brings it back', async () => {
		const context = fresh();
		const vault = addCategory(context, 'Passwords')!.category;
		const { task } = addTask(context, 'Bank PIN #money', vault.identifier)!;
		addStep(context, task, 'Change it yearly');
		const [step] = stepsOf(context.records, task.identifier);
		const { lock, key } = await createLock('a long passphrase');
		const changes = lockList(
			context,
			vault,
			lock,
			new Map([[task.identifier, await sealTask(key, task, 'Bank PIN', '4821')]]),
			new Map([
				[step.identifier, await seal(key, step.identifier, 'sealedText', 'Change it yearly')]
			])
		);
		expect(lockedListOf(context.records, task)?.identifier).toBe(vault.identifier);
		expect(value(task, 'title')).toBe('');
		expect(value(step, 'text')).toBe('');
		expect(tagsOf(context.records, task.identifier)).toEqual([]);
		expect(JSON.stringify(context.records)).not.toContain('Bank PIN');
		expect(await unseal(key, task.identifier, 'sealedTitle', value(task, 'sealedTitle')!)).toBe(
			'Bank PIN'
		);
		undo(context, changes);
		expect(value(task, 'title')).toBe('Bank PIN');
		expect(value(vault, 'lock')).toBeNull();
		expect(tagsOf(context.records, task.identifier).map((tag) => value(tag, 'name'))).toEqual([
			'money'
		]);
	});

	it('makes a locked list ordinary again, in plain text', async () => {
		const context = fresh();
		const vault = addCategory(context, 'Passwords')!.category;
		const { lock, key } = await createLock('a long passphrase');
		lockList(context, vault, lock, new Map(), new Map());
		const { task } = addSealedTask(context, 'task-a', vault.identifier, {
			sealedTitle: await seal(key, 'task-a', 'sealedTitle', 'Wifi'),
			sealedNotes: await seal(key, 'task-a', 'sealedNotes', 'hunter2')
		});
		unlockList(
			context,
			vault,
			new Map([[task.identifier, { title: 'Wifi', notes: 'hunter2' }]]),
			new Map()
		);
		expect(value(vault, 'lock')).toBeNull();
		expect(value(task, 'title')).toBe('Wifi');
		expect(value(task, 'notes')).toBe('hunter2');
		expect(value(task, 'sealedTitle')).toBeNull();
	});

	it('moves a task in sealed and out in plain text', async () => {
		const context = fresh();
		const vault = addCategory(context, 'Passwords')!.category;
		const { lock, key } = await createLock('a long passphrase');
		lockList(context, vault, lock, new Map(), new Map());
		const { task } = addTask(context, 'Door code #home', null)!;
		moveIntoLocked(
			context,
			task,
			vault.identifier,
			await sealTask(key, task, 'Door code', '1984'),
			new Map()
		);
		expect(value(task, 'categoryIdentifier')).toBe(vault.identifier);
		expect(value(task, 'title')).toBe('');
		expect(tagsOf(context.records, task.identifier)).toEqual([]);
		moveOutOfLocked(context, task, null, { title: 'Door code', notes: '1984' }, new Map());
		expect(value(task, 'categoryIdentifier')).toBeNull();
		expect(value(task, 'title')).toBe('Door code');
		expect(value(task, 'sealedNotes')).toBeNull();
	});

	it('merges a sealed title from one device and sealed notes from another', async () => {
		const phone = fresh('phone');
		const vault = addCategory(phone, 'Passwords')!.category;
		const { lock, key } = await createLock('a long passphrase');
		lockList(phone, vault, lock, new Map(), new Map());
		const { task } = addSealedTask(phone, 'task-a', vault.identifier, {
			sealedTitle: await seal(key, 'task-a', 'sealedTitle', 'Email'),
			sealedNotes: await seal(key, 'task-a', 'sealedNotes', '')
		});
		const laptop = fresh('laptop', 2_000_000);
		merge(laptop, structuredClone(Object.values(phone.records)) as Entity[]);
		setSealedTask(phone, task, {
			sealedTitle: await seal(key, 'task-a', 'sealedTitle', 'Work email')
		});
		setSealedTask(laptop, laptop.records['task-a'] as Task, {
			sealedNotes: await seal(key, 'task-a', 'sealedNotes', 'p4ssw0rd')
		});
		merge(laptop, structuredClone(Object.values(phone.records)) as Entity[]);
		const merged = laptop.records['task-a'] as Task;
		expect(await unseal(key, 'task-a', 'sealedTitle', value(merged, 'sealedTitle')!)).toBe(
			'Work email'
		);
		expect(await unseal(key, 'task-a', 'sealedNotes', value(merged, 'sealedNotes')!)).toBe(
			'p4ssw0rd'
		);
	});
});
