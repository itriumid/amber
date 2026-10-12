import { describe, expect, it } from 'vitest';
import { addCategory, addStep, addTask, setDone, setNotes } from './model/actions';
import { fresh } from './model/testing';
import { fold, highlight, isSearching, matches, parseSearch } from './search';

function list() {
	const context = fresh();
	const home = addCategory(context, 'Home', null)!.category;
	const cafe = addTask(context, 'Try the new Café #weekend #food', null)!.task;
	const paint = addTask(context, 'Paint the bedroom', home.identifier)!.task;
	addStep(context, paint, 'Buy rollers');
	const bank = addTask(context, 'Call the bank', null)!.task;
	setNotes(context, bank, 'Ask about the savings account');
	setDone(context, bank, true);
	return { records: context.records, cafe, paint, bank };
}

const found = (text: string, status?: 'any' | 'open' | 'done') => {
	const { records, ...tasks } = list();
	const search = parseSearch(text, status);
	return Object.entries(tasks)
		.filter(([, task]) => matches(records, task, search))
		.map(([name]) => name);
};

describe('search', () => {
	it('ignores case and accents', () => {
		expect(fold('  Café  ÉCLAIR ')).toBe(' cafe eclair ');
		expect(found('cafe')).toEqual(['cafe']);
		expect(found('CAFÉ')).toEqual(['cafe']);
	});

	it('looks in notes, steps, tags and the category', () => {
		expect(found('savings')).toEqual(['bank']);
		expect(found('rollers')).toEqual(['paint']);
		expect(found('home')).toEqual(['paint']);
		expect(found('weekend')).toEqual(['cafe']);
	});

	it('needs every word, in any order', () => {
		expect(found('bank call')).toEqual(['bank']);
		expect(found('bank paint')).toEqual([]);
	});

	it('takes #words as tags the task must have', () => {
		expect(parseSearch('new #Weekend #weekend').tagNames).toEqual(['weekend']);
		expect(found('#weekend')).toEqual(['cafe']);
		expect(found('#weekend #food try')).toEqual(['cafe']);
		expect(found('#weekend #bills')).toEqual([]);
		expect(found('#week')).toEqual([]);
	});

	it('filters by status', () => {
		expect(found('the', 'open')).toEqual(['cafe', 'paint']);
		expect(found('the', 'done')).toEqual(['bank']);
		expect(found('the')).toEqual(['cafe', 'paint', 'bank']);
	});

	it('is only searching once something is typed', () => {
		expect(isSearching(parseSearch('   '))).toBe(false);
		expect(isSearching(parseSearch('#tag'))).toBe(true);
	});
});

describe('highlight', () => {
	it('marks every place a word appears, as written', () => {
		expect(highlight('Café and cafe', ['cafe'])).toEqual([
			{ text: 'Café', match: true },
			{ text: ' and ', match: false },
			{ text: 'cafe', match: true }
		]);
	});

	it('joins overlapping words into one mark', () => {
		expect(highlight('Bedroom', ['bed', 'droom'])).toEqual([{ text: 'Bedroom', match: true }]);
	});

	it('keeps text whole when nothing is searched', () => {
		expect(highlight('Paint', [])).toEqual([{ text: 'Paint', match: false }]);
	});
});
