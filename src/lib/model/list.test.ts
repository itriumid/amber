import { describe, expect, it } from 'vitest';
import { addStep, addTask, deleteStep, deleteTag, moveStep, setTagged, tagByName } from './actions';
import { alive, indexByTask, stepsOf, tagsOf, type Records } from './list';
import { fresh } from './testing';

/** The index, as plain identifiers, for every task: what `tagsOf` and `stepsOf` say, one by one. */
function bothWays(records: Records) {
	const index = indexByTask(records);
	return alive(records, 'task').map((task) => ({
		indexed: {
			tags: (index.tags.get(task.identifier) ?? []).map((tag) => tag.identifier),
			steps: (index.steps.get(task.identifier) ?? []).map((step) => step.identifier)
		},
		oneByOne: {
			tags: tagsOf(records, task.identifier).map((tag) => tag.identifier),
			steps: stepsOf(records, task.identifier).map((step) => step.identifier)
		}
	}));
}

describe('the index of tags and steps by task', () => {
	it('gives every task the same tags and steps, in the same order, as asking one by one', () => {
		const context = fresh();
		const paint = addTask(context, 'Paint the bedroom #weekend #home', null)!.task;
		const call = addTask(context, 'Call the bank #errands', null)!.task;
		addTask(context, 'Nothing on it', null);
		for (const text of ['Buy paint', 'Move the bed', 'Tape the edges'])
			addStep(context, paint, text);
		addStep(context, call, 'Find the account number');
		const [, moveBed] = stepsOf(context.records, paint.identifier);
		moveStep(context, moveBed, -1);

		for (const { indexed, oneByOne } of bothWays(context.records))
			expect(indexed).toEqual(oneByOne);
		const index = indexByTask(context.records);
		expect(index.steps.get(paint.identifier)).toHaveLength(3);
		expect(index.tags.get(paint.identifier)).toHaveLength(2);
	});

	it('leaves out deleted steps, untagged tasks and deleted tags', () => {
		const context = fresh();
		const task = addTask(context, 'Plan the trip #travel #later', null)!.task;
		addStep(context, task, 'Book flights');
		const [step] = stepsOf(context.records, task.identifier);
		deleteStep(context, step);
		const [later, travel] = tagsOf(context.records, task.identifier);
		setTagged(context, task, later, false);
		deleteTag(context, travel);
		tagByName(context, task, ['soon']);

		const index = indexByTask(context.records);
		expect(index.steps.get(task.identifier)).toBeUndefined();
		expect(index.tags.get(task.identifier)?.map((tag) => tag.fields.name.value)).toEqual(['soon']);
		for (const { indexed, oneByOne } of bothWays(context.records))
			expect(indexed).toEqual(oneByOne);
	});
});
