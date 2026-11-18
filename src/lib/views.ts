// What the list shows for each place in the sidebar, as sections of tasks.

import { hasTag, tasksShownIn } from './model/actions';
import {
	alive,
	categoryTree,
	get,
	indexByTask,
	value,
	type Color,
	type Records,
	type Task
} from './model/list';
import { isSearching, matches, type Search } from './search';

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
	/** A bucket list: its done tasks are achieved dreams, shown on a shelf of their own, not folded away. */
	bucket: boolean;
	/** A locked list (docs/locked-lists.md): its tasks show only while it's open, and never in a search. */
	locked: boolean;
	/** Tasks shown in the main list, in order (done ones too, while searching). */
	shown: Task[];
	/** Done tasks below the list, newest first (empty while searching). */
	done: Task[];
}

const newestDone = (a: Task, b: Task) => (value(b, 'doneAt') ?? 0) - (value(a, 'doneAt') ?? 0);

function section(
	key: string,
	title: string,
	color: Color | null,
	categoryIdentifier: string | null,
	/** While searching, done tasks stay in place: a search for done tasks shouldn't hide them. */
	inPlace: boolean,
	bucket: boolean,
	tasks: Task[],
	locked = false
): Section {
	return {
		key,
		title,
		color,
		categoryIdentifier,
		bucket,
		locked,
		shown: inPlace ? tasks : tasks.filter((task) => !value(task, 'done')),
		done: inPlace ? [] : tasks.filter((task) => value(task, 'done')).sort(newestDone)
	};
}

/**
 * The sections a place shows. While searching, only matching tasks are in them, done ones in
 * place (a search for done tasks shouldn't hide them), and sections with no match are left out.
 */
export function sectionsFor(records: Records, view: View, search?: Search): Section[] {
	const searching = search !== undefined && isSearching(search);
	// Made once for the whole search, not once per task.
	const index = searching ? indexByTask(records) : undefined;
	const found = (tasks: Task[]) =>
		searching ? tasks.filter((task) => matches(records, task, search, index)) : tasks;
	const uncategorized = () =>
		section(
			'uncategorized',
			'No category',
			null,
			null,
			searching,
			false,
			found(tasksShownIn(records, null))
		);
	const forCategory = (identifier: string, prefix = '') => {
		const category = get(records, identifier, 'category')!;
		const locked = !!value(category, 'lock');
		return section(
			identifier,
			prefix + value(category, 'name'),
			value(category, 'color'),
			identifier,
			// A locked list's entries aren't ticked off, so none fold away as done.
			searching || locked,
			value(category, 'keepDone'),
			// A locked list's tasks are sealed, and never searched, open or not.
			locked && searching ? [] : found(tasksShownIn(records, identifier)),
			locked
		);
	};

	if (view.kind === 'uncategorized') return [uncategorized()];
	if (view.kind === 'tag') {
		const tag = get(records, view.identifier, 'tag');
		if (!tag) return [];
		const tasks = found(alive(records, 'task').filter((task) => hasTag(records, task, tag)));
		return [
			section(
				tag.identifier,
				`#${value(tag, 'name')}`,
				value(tag, 'color'),
				null,
				searching,
				false,
				tasks
			)
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
		(candidate, index) =>
			(index === 0 && !searching) || candidate.shown.length || candidate.done.length
	);
}

/** How many tasks a search finds in a place. */
export function foundCount(records: Records, view: View, search: Search): number {
	return sectionsFor(records, view, search).reduce((sum, found) => sum + found.shown.length, 0);
}

export function openCount(records: Records, view: View): number {
	return sectionsFor(records, view).reduce(
		(sum, candidate) => sum + candidate.shown.filter((task) => !value(task, 'done')).length,
		0
	);
}
