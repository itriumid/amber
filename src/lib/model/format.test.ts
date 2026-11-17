import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION, migrate, readEntity } from './format';
import { categoryTree, tagsOf, stepsOf, value, type Entity } from './list';
import { tasksShownIn } from './actions';
import { openLock, unseal } from '../sealing';

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

	it('opens the locked list in format 2 with its passphrase or its recovery code', async () => {
		const file = JSON.parse(
			readFileSync(new URL('./fixtures/format-2.json', import.meta.url), 'utf8')
		);
		const records = Object.fromEntries(
			(migrate(file.records, file.format).map(readEntity) as Entity[]).map((entity) => [
				entity.identifier,
				entity
			])
		);
		const lock = value(records['cat-vault'] as Entity<'category'>, 'lock')!;
		const task = records['task-pin'] as Entity<'task'>;
		// The plain fields hold nothing; the sealed ones hold it all.
		expect(value(task, 'title')).toBe('');
		for (const secret of ['fixture passphrase', 'abcd efgh jkmn pqrs tvwx yz01']) {
			const key = (await openLock(lock, secret))!;
			expect(await unseal(key, 'task-pin', 'sealedTitle', value(task, 'sealedTitle')!)).toBe(
				'Bank PIN'
			);
			expect(await unseal(key, 'task-pin', 'sealedNotes', value(task, 'sealedNotes')!)).toBe(
				'4821'
			);
			const step = records['step-pin'] as Entity<'step'>;
			expect(await unseal(key, 'step-pin', 'sealedText', value(step, 'sealedText')!)).toBe(
				'Change it every year'
			);
		}
		expect(await openLock(lock, 'not the passphrase')).toBeUndefined();
	});

	it('adds the locked-list fields to a format 1 list, empty, and earlier than any edit', () => {
		const file = JSON.parse(
			readFileSync(new URL('./fixtures/format-1.json', import.meta.url), 'utf8')
		);
		const migrated = migrate(file.records, 1) as {
			kind: string;
			fields: Record<string, { value: unknown; stamp: string }>;
		}[];
		const category = migrated.find((record) => record.kind === 'category')!;
		const task = migrated.find((record) => record.kind === 'task')!;
		expect(category.fields.lock.value).toBeNull();
		expect(task.fields.sealedTitle.value).toBeNull();
		expect(task.fields.sealedNotes.stamp < task.fields.title.stamp).toBe(true);
	});

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
				sealedTitle: { value: null, stamp: '0000ll7bk.0000.a' },
				sealedNotes: { value: null, stamp: '0000ll7bk.0000.a' },
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
