import { describe, expect, it } from 'vitest';
import { NAME } from '../../sync/mailbox';
import { server } from '../../sync/testing';
import { addTask } from './model/actions';
import { merge, value, type Entity, type Records } from './model/list';
import { fresh } from './model/testing';
import {
	cancel,
	collect,
	fetchList,
	leave,
	mailboxFor,
	newCode,
	readCode,
	reply,
	seal,
	showCode,
	unseal
} from './sync';

/** A `fetch` that reaches mailboxes kept in memory, under the same rules as the real ones. */
function connect() {
	const answer = server();
	const seen: string[] = [];
	const send = async (input: string, init?: RequestInit) => {
		seen.push(`${init?.method ?? 'GET'} ${input}`);
		return answer(new Request(new URL(input, 'https://amber.itrium.id'), init));
	};
	return { send, seen };
}

function device(name: string, ...titles: string[]) {
	const context = fresh(name);
	for (const title of titles) addTask(context, title, null);
	return context;
}

const titles = (records: Records) =>
	Object.values(records)
		.flatMap((entity) => (entity.kind === 'task' ? [value(entity as Entity<'task'>, 'title')] : []))
		.sort();

describe('codes', () => {
	it('are 16 characters from Crockford’s alphabet, different every time', () => {
		const code = newCode();
		expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
		expect(newCode()).not.toBe(code);
		expect(showCode('ABCDEFGHJKMNPQRS')).toBe('ABCD-EFGH-JKMN-PQRS');
	});

	it('are read the way people type them, or out of a whole link', () => {
		expect(readCode('abcd-efgh jkmn-pqrs')).toBe('ABCDEFGHJKMNPQRS');
		expect(readCode('  ABCD EFGH JKMN PQRS ')).toBe('ABCDEFGHJKMNPQRS');
		expect(readCode('OIL0-0000-0000-0000')).toBe('0110000000000000');
		expect(readCode('Sync with me: https://amber.itrium.id/#sync=ABCDEFGHJKMNPQRS thanks')).toBe(
			'ABCDEFGHJKMNPQRS'
		);
		expect(readCode('ABCD-EFGH-JKMN-PQR')).toBeUndefined();
		expect(readCode('ABCD-EFGH-JKMN-PQRU')).toBeUndefined();
	});

	it('name a mailbox by a hash the server can’t turn back into the code', async () => {
		const code = newCode();
		const { name } = await mailboxFor(code);
		expect(name).toMatch(NAME);
		expect(name).not.toContain(code);
		expect((await mailboxFor(code)).name).toBe(name);
		expect((await mailboxFor(newCode())).name).not.toBe(name);
	});
});

describe('sealing', () => {
	it('opens only with the same code, and only in the same place', async () => {
		const records = device('laptop', 'Renew the passport').records;
		const mailbox = await mailboxFor(newCode());
		const sealed = await seal(mailbox, 'list', records);
		expect(new TextDecoder().decode(sealed)).not.toContain('passport');

		const opened = await unseal(mailbox, 'list', sealed);
		expect(
			opened.kind === 'list' &&
				titles(Object.fromEntries(opened.records.map((entity) => [entity.identifier, entity])))
		).toEqual(['Renew the passport']);
		// The server handing the list back as if it were the reply.
		expect(await unseal(mailbox, 'reply', sealed)).toEqual({ kind: 'not-amber' });
		expect(await unseal(await mailboxFor(newCode()), 'list', sealed)).toEqual({
			kind: 'not-amber'
		});
		sealed[20] ^= 1;
		expect(await unseal(mailbox, 'list', sealed)).toEqual({ kind: 'not-amber' });
	});
});

describe('syncing', () => {
	it('leaves both devices with everything from both, and the mailbox empty', async () => {
		const { send } = connect();
		const laptop = device('laptop', 'Book the flights');
		const phone = device('phone', 'Buy sunscreen');

		const left = await leave(laptop.records, send);
		if ('problem' in left) throw new Error(left.problem);

		const fetched = await fetchList(left.code, send);
		if ('problem' in fetched || fetched.reading.kind !== 'list') throw new Error('no list');
		merge(phone, fetched.reading.records);
		expect(await reply(fetched.mailbox, phone.records, send)).toBeUndefined();

		const outcome = await collect(left.mailbox, new AbortController().signal, send);
		if (!outcome || 'problem' in outcome || outcome.kind !== 'list') throw new Error('no reply');
		merge(laptop, outcome.records);

		expect(titles(laptop.records)).toEqual(['Book the flights', 'Buy sunscreen']);
		expect(titles(phone.records)).toEqual(['Book the flights', 'Buy sunscreen']);
		expect(await fetchList(left.code, send)).toEqual({ problem: 'gone' });
	});

	it('says a code is gone once it was used, cancelled or never made', async () => {
		const { send } = connect();
		expect(await fetchList(newCode(), send)).toEqual({ problem: 'gone' });

		const left = await leave(device('laptop', 'Water the plants').records, send);
		if ('problem' in left) throw new Error(left.problem);
		await cancel(left.mailbox, send);
		expect(await fetchList(left.code, send)).toEqual({ problem: 'gone' });
		expect(await collect(left.mailbox, new AbortController().signal, send)).toEqual({
			problem: 'gone'
		});
	});

	it('keeps asking for the reply until it’s stopped', async () => {
		const { send, seen } = connect();
		const left = await leave(device('laptop').records, send);
		if ('problem' in left) throw new Error(left.problem);
		const stop = new AbortController();
		const waiting = collect(left.mailbox, stop.signal, send);
		await new Promise((resolve) => setTimeout(resolve, 20));
		stop.abort();
		expect(await waiting).toBeUndefined();
		expect(seen.filter((line) => line.endsWith('/reply'))).toEqual([
			`GET /api/mailboxes/${left.mailbox.name}/reply`
		]);
	});

	it('gives up when the ten minutes are over', async () => {
		const { send } = connect();
		const left = await leave(device('laptop').records, send);
		if ('problem' in left) throw new Error(left.problem);
		let time = 0;
		const outcome = collect(left.mailbox, new AbortController().signal, send, () => time);
		time = 11 * 60 * 1000;
		expect(await outcome).toEqual({ problem: 'gone' });
	});

	it('says so when the server can’t be reached', async () => {
		const offline = () => Promise.reject(new TypeError('Failed to fetch'));
		expect(await leave(device('laptop').records, offline)).toEqual({ problem: 'offline' });
		expect(await fetchList(newCode(), offline)).toEqual({ problem: 'offline' });
	});
});
