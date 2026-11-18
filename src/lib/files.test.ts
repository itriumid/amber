import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readFile, readLink } from './transfer';

// Every file and link Amber has ever made must keep opening, in every shape it came in: plain,
// locked with a passphrase, and scrambled. fixtures/files/ holds one of each kind and format; they
// are never edited, and a new kind or format adds one. "fixture passphrase" locks the locked ones.
const folder = new URL('./fixtures/files/', import.meta.url);
const fixtures = readdirSync(folder);
const PASSPHRASE = 'fixture passphrase';

describe('files and links Amber has made', () => {
	it('has a fixture of every kind', () => {
		for (const kind of [
			'plain-format-1.json',
			'plain-format-2.json',
			'locked-format-2.json',
			'scrambled-format-2.json',
			'link-open-format-2.txt',
			'link-locked-format-2.txt'
		])
			expect(fixtures).toContain(kind);
	});

	for (const name of fixtures) {
		it(`opens ${name}, with everything in it`, async () => {
			const text = readFileSync(new URL(name, folder), 'utf8').trim();
			const locked = name.includes('locked');
			const read = (passphrase?: string) =>
				name.startsWith('link-') ? readLink(text, passphrase) : readFile(text, passphrase);
			if (locked) expect((await read()).kind).toBe('locked');
			const reading = await read(locked ? PASSPHRASE : undefined);
			expect(reading.kind).toBe('list');
			if (reading.kind !== 'list') return;
			expect(reading.unreadable).toBe(0);
			const format = Number(name.match(/format-(\d+)/)![1]);
			const source = JSON.parse(
				readFileSync(new URL(`./model/fixtures/format-${format}.json`, import.meta.url), 'utf8')
			);
			expect(reading.records.map((record) => record.identifier).sort()).toEqual(
				source.records.map((record: { identifier: string }) => record.identifier).sort()
			);
		});
	}

	it('keeps a scrambled file from being read at a glance, and from older Ambers', () => {
		const text = readFileSync(new URL('scrambled-format-2.json', folder), 'utf8');
		const plain: { kind: string; fields: { title?: { value: string } } }[] = JSON.parse(
			readFileSync(new URL('plain-format-2.json', folder), 'utf8')
		).records;
		const titles = plain
			.filter((record) => record.kind === 'task' && record.fields.title?.value)
			.map((record) => record.fields.title!.value);
		expect(titles.length).toBeGreaterThan(0);
		for (const title of titles) expect(text).not.toContain(title);
		// An Amber that knew formats 1 and 2 reads this outside, finds a newer format, and asks to update.
		const outside = JSON.parse(text);
		expect(outside).toMatchObject({ amber: 1, format: 3, records: [] });
	});
});
