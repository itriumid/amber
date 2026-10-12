import { describe, expect, it } from 'vitest';
import {
	addCategory,
	addStep,
	addTask,
	deleteCategory,
	deleteTask,
	moveTask,
	parseQuickAdd,
	promoteStep,
	setCategory,
	setDone,
	setTagged,
	setTitle,
	shownCategory,
	tasksShownIn
} from './actions';
import { categoryTree, merge, stepsOf, tags, tagsOf, undo, value, type Entity } from './list';
import { fresh } from './testing';

const titles = (tasks: Entity<'task'>[]) => tasks.map((task) => value(task, 'title'));

describe('quick add', () => {
	it('takes #words as tags and the rest as the task', () => {
		expect(parseQuickAdd('Buy milk #errands  #Home today')).toEqual({
			title: 'Buy milk today',
			tagNames: ['errands', 'Home']
		});
	});

	it('keeps tags in any language, and a # in the middle of a word', () => {
		expect(parseQuickAdd('Tanya harga C#9 #belanja-bulanan #日本')).toEqual({
			title: 'Tanya harga C#9',
			tagNames: ['belanja-bulanan', '日本']
		});
	});

	it('names each tag once, whatever its case', () => {
		expect(parseQuickAdd('x #Home #home').tagNames).toEqual(['Home']);
	});
});

describe('tasks', () => {
	it('adds tasks to the end, with their tags, reusing tags by name', () => {
		const context = fresh();
		addTask(context, 'First #home', null);
		const second = addTask(context, 'Second #HOME #work', null)!;
		expect(titles(tasksShownIn(context.records, null))).toEqual(['First', 'Second']);
		expect(tags(context.records).map((tag) => value(tag, 'name'))).toEqual(['home', 'work']);
		expect(
			tagsOf(context.records, second.task.identifier).map((tag) => value(tag, 'name'))
		).toEqual(['home', 'work']);
	});

	it('refuses a task with no words', () => {
		expect(addTask(fresh(), '   #only-a-tag ', null)).toBeUndefined();
	});

	it('remembers when a task was done, and forgets when undone', () => {
		const context = fresh();
		const { task } = addTask(context, 'Climb Rinjani', null)!;
		setDone(context, task, true, 123);
		expect([value(task, 'done'), value(task, 'doneAt')]).toEqual([true, 123]);
		setDone(context, task, false);
		expect(value(task, 'doneAt')).toBeNull();
	});

	it('moves a task up and down among the ones like it', () => {
		const context = fresh();
		for (const title of ['a', 'b', 'c']) addTask(context, title, null);
		const third = tasksShownIn(context.records, null)[2];
		moveTask(context, third, -1);
		expect(titles(tasksShownIn(context.records, null))).toEqual(['a', 'c', 'b']);
		moveTask(context, third, -1);
		expect(titles(tasksShownIn(context.records, null))).toEqual(['c', 'a', 'b']);
		expect(moveTask(context, third, -1)).toEqual([]);
	});

	it('undoes a deletion, and an addition', () => {
		const context = fresh();
		const { task, changes } = addTask(context, 'Keep me', null)!;
		const deleted = deleteTask(context, task);
		expect(tasksShownIn(context.records, null)).toEqual([]);
		undo(context, deleted);
		expect(titles(tasksShownIn(context.records, null))).toEqual(['Keep me']);
		undo(context, changes);
		expect(tasksShownIn(context.records, null)).toEqual([]);
	});

	it('undoes a rename to exactly what it was', () => {
		const context = fresh();
		const { task } = addTask(context, 'Old', null)!;
		const renamed = setTitle(context, task, '  New   name ');
		expect(value(task, 'title')).toBe('New name');
		undo(context, renamed);
		expect(value(task, 'title')).toBe('Old');
	});
});

describe('categories', () => {
	it('nests one level deep at most', () => {
		const context = fresh();
		const top = addCategory(context, 'Travel')!.category;
		const sub = addCategory(context, 'Japan', top.identifier)!.category;
		const tooDeep = addCategory(context, 'Kyoto', sub.identifier)!.category;
		expect(value(tooDeep, 'parentIdentifier')).toBe(top.identifier);
		expect(categoryTree(context.records).map(({ children }) => children.length)).toEqual([2]);
	});

	it("moves a deleted subcategory's tasks to its parent, and back on undo", () => {
		const context = fresh();
		const top = addCategory(context, 'Travel')!.category;
		const sub = addCategory(context, 'Japan', top.identifier)!.category;
		const { task } = addTask(context, 'See Fuji', sub.identifier)!;
		const deleted = deleteCategory(context, sub);
		expect(shownCategory(context.records, task)).toBe(top.identifier);
		undo(context, deleted);
		expect(shownCategory(context.records, task)).toBe(sub.identifier);
	});

	it('deletes subcategories with their parent, leaving the tasks uncategorized', () => {
		const context = fresh();
		const top = addCategory(context, 'Travel')!.category;
		const sub = addCategory(context, 'Japan', top.identifier)!.category;
		addTask(context, 'See Fuji', sub.identifier);
		deleteCategory(context, top);
		expect(categoryTree(context.records)).toEqual([]);
		expect(titles(tasksShownIn(context.records, null))).toEqual(['See Fuji']);
	});

	it('puts a task moved to a category at its end', () => {
		const context = fresh();
		const home = addCategory(context, 'Home')!.category;
		addTask(context, 'Existing', home.identifier);
		const { task } = addTask(context, 'Moved', null)!;
		setCategory(context, task, home.identifier);
		expect(titles(tasksShownIn(context.records, home.identifier))).toEqual(['Existing', 'Moved']);
	});
});

describe('steps', () => {
	it('turns a step into a task with the same category and tags', () => {
		const context = fresh();
		const home = addCategory(context, 'Home')!.category;
		const { task } = addTask(context, 'Paint the room #weekend', home.identifier)!;
		addStep(context, task, 'Buy paint');
		const step = stepsOf(context.records, task.identifier)[0];
		const promoted = promoteStep(context, step)!;
		expect(value(promoted.task, 'title')).toBe('Buy paint');
		expect(shownCategory(context.records, promoted.task)).toBe(home.identifier);
		expect(
			tagsOf(context.records, promoted.task.identifier).map((tag) => value(tag, 'name'))
		).toEqual(['weekend']);
		expect(stepsOf(context.records, task.identifier)).toEqual([]);
	});
});

describe('merging two copies of a list', () => {
	const copy = (from: ReturnType<typeof fresh>, device: string) => {
		const other = fresh(device, 2_000_000);
		merge(other, Object.values(structuredClone(from.records)));
		return other;
	};

	it('keeps both edits when two devices change different fields of one task', () => {
		const phone = fresh('phone');
		const { task } = addTask(phone, 'Call mum', null)!;
		const laptop = copy(phone, 'laptop');
		setTitle(phone, task, 'Call mum on Sunday');
		setDone(laptop, laptop.records[task.identifier] as never, true);
		merge(phone, Object.values(laptop.records));
		merge(laptop, Object.values(phone.records));
		for (const device of [phone, laptop]) {
			const merged = device.records[task.identifier] as Entity<'task'>;
			expect([value(merged, 'title'), value(merged, 'done')]).toEqual(['Call mum on Sunday', true]);
		}
	});

	it('lets the later edit win when both change the same field', () => {
		const phone = fresh('phone');
		const { task } = addTask(phone, 'Original', null)!;
		const laptop = copy(phone, 'laptop');
		setTitle(phone, task, 'Phone edit');
		setTitle(laptop, laptop.records[task.identifier] as never, 'Laptop edit, later');
		merge(phone, Object.values(laptop.records));
		expect(value(phone.records[task.identifier] as Entity<'task'>, 'title')).toBe(
			'Laptop edit, later'
		);
	});

	it('carries deletions, and changes nothing the second time', () => {
		const phone = fresh('phone');
		const { task } = addTask(phone, 'Gone soon', null)!;
		const laptop = copy(phone, 'laptop');
		deleteTask(laptop, laptop.records[task.identifier] as never);
		expect(merge(phone, Object.values(laptop.records))).toEqual({
			added: 0,
			updated: 0,
			deleted: 1
		});
		expect(merge(phone, Object.values(laptop.records))).toEqual({
			added: 0,
			updated: 0,
			deleted: 0
		});
		expect(tasksShownIn(phone.records, null)).toEqual([]);
	});

	it('meets in one record when two devices tag the same task with the same tag', () => {
		const phone = fresh('phone');
		const { task } = addTask(phone, 'Task #shared', null)!;
		const laptop = copy(phone, 'laptop');
		const tag = tags(laptop.records)[0];
		setTagged(laptop, laptop.records[task.identifier] as never, tag, false);
		setTagged(phone, task, tags(phone.records)[0], true);
		merge(phone, Object.values(laptop.records));
		expect(Object.values(phone.records).filter((entity) => entity.kind === 'tagging')).toHaveLength(
			1
		);
	});

	it('keeps fields it does not know, for a newer version of Amber', () => {
		const context = fresh();
		const { task } = addTask(context, 'Future', null)!;
		const newer = structuredClone(task) as Entity<'task'> & { fields: Record<string, unknown> };
		newer.fields.priority = { value: 'high', stamp: '~' };
		merge(context, [newer as never]);
		expect(
			(context.records[task.identifier].fields as Record<string, { value: unknown }>).priority.value
		).toBe('high');
	});
});
