import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION, migrate, readEntity } from './format';
import { categoryTree, tagsOf, stepsOf, value, type Entity } from './list';
import { tasksShownIn } from './actions';

// Every list ever written must keep opening. A file per format version lives in fixtures/, and each
// one is loaded here, for good: never delete one, never edit one.
const fixtures = readdirSync(new URL('./fixtures', import.meta.url)).filter((name) =>
	/^format-\d+\.json$/.test(name)
);

describe('the data format', () => {
	it('has a fixture for every version up to this one', () => {
		const versions = fixtures.map((name) => Number(name.match(/\d+/)![0])).sort((a, b) => a - b);
		expect(versions).toEqual(Array.from({ length: FORMAT_VERSION }, (_, index) => index + 1));
	});

	for (const name of fixtures) {
		it(`opens ${name} with nothing lost`, () => {
			const file = JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
			const migrated = migrate(file.records, file.format);
			const entities = migrated.map(readEntity);
			expect(entities.every(Boolean)).toBe(true);
			const records = Object.fromEntries(
				(entities as Entity[]).map((entity) => [entity.identifier, entity])
			);
			// Every field of every record survives, with the same value.
			for (const original of file.records) {
				for (const [field, register] of Object.entries(
					original.fields as Record<string, { value: unknown }>
				)) {
					expect(
						(records[original.identifier].fields as Record<string, { value: unknown }>)[field].value
					).toEqual(register.value);
				}
			}
			// And it still means the same thing.
			const [travel] = categoryTree(records);
			expect(value(travel.category, 'name')).toBe('Travel');
			const fuji = tasksShownIn(records, 'cat-japan')[0];
			expect(value(fuji, 'title')).toBe('Climb Mount Fuji');
			expect(tagsOf(records, fuji.identifier).map((tag) => value(tag, 'name'))).toEqual([
				'someday'
			]);
			expect(stepsOf(records, fuji.identifier)).toHaveLength(1);
		});
	}

	it('refuses a list from a newer format instead of guessing', () => {
		expect(() => migrate([], FORMAT_VERSION + 1)).toThrow(/newer Amber/);
	});

	it('keeps fields it does not know', () => {
		const entity = readEntity({
			identifier: 'task-x',
			kind: 'task',
			fields: {
				title: { value: 'x', stamp: '0000ll7bk.0000.a' },
				notes: { value: '', stamp: '0000ll7bk.0000.a' },
				done: { value: false, stamp: '0000ll7bk.0000.a' },
				doneAt: { value: null, stamp: '0000ll7bk.0000.a' },
				categoryIdentifier: { value: null, stamp: '0000ll7bk.0000.a' },
				order: { value: 'V', stamp: '0000ll7bk.0000.a' },
				deleted: { value: false, stamp: '0000ll7bk.0000.a' },
				dueAt: { value: 1, stamp: '0000ll7bk.0000.a' }
			}
		});
		expect((entity?.fields as Record<string, { value: unknown }>).dueAt.value).toBe(1);
	});

	it('refuses records that are the wrong shape', () => {
		const stamp = '0000ll7bk.0000.a';
		expect(
			readEntity({ identifier: 'x', kind: 'task', fields: { title: { value: 7, stamp } } })
		).toBeUndefined();
		expect(readEntity({ identifier: 'x', kind: 'robot', fields: {} })).toBeUndefined();
		expect(readEntity({ identifier: '../../etc', kind: 'tag', fields: {} })).toBeUndefined();
		expect(readEntity('a string')).toBeUndefined();
		const tag = {
			name: { value: 'ok', stamp },
			color: { value: 'neon', stamp },
			deleted: { value: false, stamp }
		};
		expect(readEntity({ identifier: 'x', kind: 'tag', fields: tag })).toBeUndefined();
	});
});
