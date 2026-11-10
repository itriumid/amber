import { describe, expect, it } from 'vitest';
import { readNote, reminderDue, REMIND_AFTER } from './backups';

const DAY = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 10, 1);

describe('the reminder to download a copy', () => {
	const note = { downloadedAt: null, since: start, tasks: 10 };

	it('waits until a while has passed', () => {
		expect(reminderDue(note, 10, start + (REMIND_AFTER.days - 1) * DAY)).toBe(false);
		expect(reminderDue(note, 10, start + REMIND_AFTER.days * DAY)).toBe(true);
	});

	it('comes sooner when the list has grown a lot', () => {
		expect(reminderDue(note, 10 + REMIND_AFTER.tasks - 1, start + DAY)).toBe(false);
		expect(reminderDue(note, 10 + REMIND_AFTER.tasks, start + DAY)).toBe(true);
	});

	it('never comes for an empty list', () => {
		expect(reminderDue(note, 0, start + 365 * DAY)).toBe(false);
	});

	it('reads only notes it understands', () => {
		expect(readNote(note)).toEqual(note);
		expect(readNote({ downloadedAt: start, since: start, tasks: 3 })).toEqual({
			downloadedAt: start,
			since: start,
			tasks: 3
		});
		expect(readNote(undefined)).toBeUndefined();
		expect(readNote({ since: 'yesterday', tasks: 1, downloadedAt: null })).toBeUndefined();
		expect(readNote({ since: start, tasks: 1, downloadedAt: 'never' })).toBeUndefined();
	});
});
