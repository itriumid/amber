// Finding tasks: words match a task's title, notes, steps, tags and category; `#tags` narrow it to
// tasks with every one of those tags; and the status picks open tasks, done ones, or both. Case
// and accents don't matter, so "cafe" finds "Café".

import { categoryLabel } from './model/actions';
import { stepsOf, tagsOf, value, type Records, type Task } from './model/list';

export type Status = 'any' | 'open' | 'done';

export const STATUSES: { status: Status; label: string }[] = [
	{ status: 'any', label: 'Any' },
	{ status: 'open', label: 'Open' },
	{ status: 'done', label: 'Done' }
];

export interface Search {
	/** Folded words, every one of which has to appear somewhere in the task. */
	words: string[];
	/** Folded tag names, every one of which the task has to have. */
	tagNames: string[];
	status: Status;
}

/** Text as search compares it: lowercase, without accents, and spaces collapsed. */
export function fold(text: string): string {
	return text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/\s+/g, ' ');
}

/** What someone typed into search, with `#words` as tags, the same as in quick add. */
export function parseSearch(text: string, status: Status = 'any'): Search {
	const tagNames: string[] = [];
	const rest = text.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (_match, space: string, name: string) => {
		const folded = fold(name);
		if (!tagNames.includes(folded)) tagNames.push(folded);
		return space;
	});
	const words = [...new Set(fold(rest).split(' ').filter(Boolean))];
	return { words, tagNames, status };
}

export function isSearching(search: Search): boolean {
	return search.words.length > 0 || search.tagNames.length > 0;
}

export function matches(records: Records, task: Task, search: Search): boolean {
	const done = value(task, 'done');
	if ((search.status === 'open' && done) || (search.status === 'done' && !done)) return false;
	const tags = tagsOf(records, task.identifier).map((tag) => fold(value(tag, 'name')));
	if (!search.tagNames.every((name) => tags.includes(name))) return false;
	if (!search.words.length) return true;
	const haystack = fold(
		[
			value(task, 'title'),
			value(task, 'notes'),
			...stepsOf(records, task.identifier).map((step) => value(step, 'text')),
			...tags.map((name) => `#${name}`),
			categoryLabel(records, task) ?? ''
		].join('\n')
	);
	return search.words.every((word) => haystack.includes(word));
}

export interface Piece {
	text: string;
	match: boolean;
}

/**
 * Splits text into pieces, marking where the search words appear, for highlighting. It matches
 * the same way search does (without case or accents) but returns the text as written.
 */
export function highlight(text: string, words: string[]): Piece[] {
	if (!words.length || !text) return [{ text, match: false }];
	// Fold character by character, remembering where each folded character came from.
	let folded = '';
	const from: number[] = [];
	let index = 0;
	for (const character of text) {
		const part = character
			.normalize('NFKD')
			.replace(/\p{M}/gu, '')
			.toLocaleLowerCase()
			.replace(/\s/g, ' ');
		for (let step = 0; step < part.length; step++) from.push(index);
		folded += part;
		index += character.length;
	}
	from.push(text.length);

	const marked = new Array<boolean>(text.length).fill(false);
	for (const word of words) {
		for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + 1)) {
			for (let position = from[at]; position < from[at + word.length]; position++)
				marked[position] = true;
		}
	}
	const pieces: Piece[] = [];
	for (let position = 0; position < text.length; position++) {
		const last = pieces.at(-1);
		if (last && last.match === marked[position]) last.text += text[position];
		else pieces.push({ text: text[position], match: marked[position] });
	}
	return pieces;
}
