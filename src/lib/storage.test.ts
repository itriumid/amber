import { describe, expect, it } from 'vitest';
import { addTask, setDone, setTitle } from './model/actions';
import { merge, value, type Entity, type Task } from './model/list';
import { fresh } from './model/testing';
import { mergeWithStored } from './storage';

/** A second tab on the same device: its own copy of the list, read from storage when it opened. */
function secondTab(from: ReturnType<typeof fresh>) {
	const other = fresh('test', 2_000_000);
	merge(other, Object.values(structuredClone(from.records)));
	return other;
}

describe('saving over what another tab saved', () => {
	it('keeps a rename from one tab when a stale tab ticks the same task', () => {
		const first = fresh();
		const { task } = addTask(first, 'Shared task', null)!;
		const second = secondTab(first);
		setTitle(first, task, 'Renamed in the first tab');
		const stored = structuredClone(first.records[task.identifier]);

		setDone(second, second.records[task.identifier] as Task, true);
		const saved = mergeWithStored(stored, second.records[task.identifier]) as Task;

		expect([value(saved, 'title'), value(saved, 'done')]).toEqual([
			'Renamed in the first tab',
			true
		]);
	});

	it('lets the later edit win when both tabs change the same field', () => {
		const first = fresh();
		const { task } = addTask(first, 'Shared task', null)!;
		const second = secondTab(first);
		setTitle(second, second.records[task.identifier] as Task, 'Earlier, in the second tab');
		const stored = structuredClone(second.records[task.identifier]);
		// The first tab's clock has seen the second tab's edit by now, as it would through storage.
		first.clock.observe((stored as Task).fields.title.stamp);
		setTitle(first, task, 'Later, in the first tab');

		expect(value(mergeWithStored(stored, task) as Task, 'title')).toBe('Later, in the first tab');
		// A stale save of the older edit doesn't take it back.
		const newer = structuredClone(task);
		expect(value(mergeWithStored(newer, stored as Task) as Task, 'title')).toBe(
			'Later, in the first tab'
		);
	});

	it('saves a new record as it is', () => {
		const tab = fresh();
		const { task } = addTask(tab, 'New', null)!;
		expect(mergeWithStored(undefined, task)).toBe(task);
	});

	it('keeps fields a newer Amber stored, which this one doesn’t know', () => {
		const tab = fresh();
		const { task } = addTask(tab, 'Task', null)!;
		const stored = structuredClone(task) as Entity & { fields: Record<string, unknown> };
		const dueAt = { value: 123, stamp: task.fields.title.stamp };
		stored.fields.dueAt = dueAt;
		setTitle(tab, task, 'Renamed');
		const saved = mergeWithStored(stored, task) as Entity & { fields: Record<string, unknown> };
		expect(saved.fields.dueAt).toEqual(dueAt);
		expect(value(saved as Task, 'title')).toBe('Renamed');
	});

	it('leaves a stored record it can’t read untouched', () => {
		const tab = fresh();
		const { task } = addTask(tab, 'Task', null)!;
		expect(mergeWithStored({ identifier: task.identifier, kind: 'task' }, task)).toBeUndefined();
	});

	it('doesn’t change the record on screen while merging', () => {
		const first = fresh();
		const { task } = addTask(first, 'Shared task', null)!;
		const second = secondTab(first);
		setTitle(first, task, 'Renamed');
		const ours = second.records[task.identifier];
		const before = structuredClone(ours);
		mergeWithStored(structuredClone(first.records[task.identifier]), ours);
		expect(ours).toEqual(before);
	});
});
