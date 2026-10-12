// What the list shows for each place in the sidebar, as sections of tasks.

import { hasTag, shownCategory, tasksShownIn } from './model/actions';
import { alive, categoryTree, get, value, type Color, type Records, type Task } from './model/list';

export type View =
	| { kind: 'all' }
	| { kind: 'uncategorized' }
	| { kind: 'category'; identifier: string }
	| { kind: 'tag'; identifier: string };

export interface Section {
	key: string;
	title: string;
	color: Color | null;
	/** Where quick add puts new tasks for this section, and where moving happens. */
	categoryIdentifier: string | null;
	/** Bucket-list style: done tasks stay in place, with their date. */
	keepDone: boolean;
	/** Tasks shown in the main list, in order (done ones too, when `keepDone`). */
	shown: Task[];
	/** Done tasks tucked away below, newest first (empty when `keepDone`). */
	done: Task[];
}

const newestDone = (a: Task, b: Task) => (value(b, 'doneAt') ?? 0) - (value(a, 'doneAt') ?? 0);

function section(
	key: string,
	title: string,
	color: Color | null,
	categoryIdentifier: string | null,
	keepDone: boolean,
	tasks: Task[]
): Section {
	return {
		key,
		title,
		color,
		categoryIdentifier,
		keepDone,
		shown: keepDone ? tasks : tasks.filter((task) => !value(task, 'done')),
		done: keepDone ? [] : tasks.filter((task) => value(task, 'done')).sort(newestDone)
	};
}

export function sectionsFor(records: Records, view: View): Section[] {
	const uncategorized = () =>
		section('uncategorized', 'No category', null, null, false, tasksShownIn(records, null));
	const forCategory = (identifier: string, prefix = '') => {
		const category = get(records, identifier, 'category')!;
		return section(
			identifier,
			prefix + value(category, 'name'),
			value(category, 'color'),
			identifier,
			value(category, 'keepDone'),
			tasksShownIn(records, identifier)
		);
	};

	if (view.kind === 'uncategorized') return [uncategorized()];
	if (view.kind === 'tag') {
		const tag = get(records, view.identifier, 'tag');
		if (!tag) return [];
		const tasks = alive(records, 'task').filter((task) => hasTag(records, task, tag));
		return [
			section(tag.identifier, `#${value(tag, 'name')}`, value(tag, 'color'), null, false, tasks)
		];
	}
	const tree = categoryTree(records);
	if (view.kind === 'category') {
		const branch = tree.find(
			({ category, children }) =>
				category.identifier === view.identifier ||
				children.some((child) => child.identifier === view.identifier)
		);
		if (!branch) return [];
		if (branch.category.identifier !== view.identifier) return [forCategory(view.identifier)];
		const parentName = value(branch.category, 'name');
		return [
			forCategory(branch.category.identifier),
			...branch.children.map((child) => forCategory(child.identifier, `${parentName} › `))
		];
	}
	const sections = [uncategorized()];
	for (const { category, children } of tree) {
		sections.push(forCategory(category.identifier));
		for (const child of children)
			sections.push(forCategory(child.identifier, `${value(category, 'name')} › `));
	}
	// In everything at once, sections with nothing in them are noise; the first stays, for quick add.
	return sections.filter(
		(candidate, index) => index === 0 || candidate.shown.length || candidate.done.length
	);
}

export function openCount(records: Records, view: View): number {
	return sectionsFor(records, view).reduce(
		(sum, candidate) => sum + candidate.shown.filter((task) => !value(task, 'done')).length,
		0
	);
}

export function categoryLabel(records: Records, task: Task): string | undefined {
	const identifier = shownCategory(records, task);
	const category = get(records, identifier, 'category');
	if (!category) return undefined;
	const parent = get(records, value(category, 'parentIdentifier'), 'category');
	return parent ? `${value(parent, 'name')} › ${value(category, 'name')}` : value(category, 'name');
}
