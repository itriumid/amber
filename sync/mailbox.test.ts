import { describe, expect, it } from 'vitest';
import { handle, LIFETIME, LIMIT, NAME, type Storage } from './mailbox';

/** Storage kept in memory, standing in for a Durable Object's. */
function memory() {
	let data = new Map<string, unknown>();
	let alarm: number | undefined;
	const storage: Storage = {
		get: async <T>(key: string) => structuredClone(data.get(key)) as T | undefined,
		put: async (key, value) => void data.set(key, structuredClone(value)),
		deleteAll: async () => {
			data = new Map();
		},
		setAlarm: async (time) => {
			alarm = time;
		}
	};
	return { storage, alarm: () => alarm, isEmpty: () => data.size === 0 };
}

const request = (method: string, body?: string | Uint8Array) =>
	new Request('https://amber.itrium.id/', { method, body });

async function send(
	storage: Storage,
	method: string,
	part: string,
	body?: string,
	now = 1_000
): Promise<{ status: number; text: string }> {
	const response = await handle(request(method, body), part, storage, now);
	return { status: response.status, text: await response.text() };
}

describe('the mailbox', () => {
	it('carries a list one way and the merged list back, then empties', async () => {
		const { storage, isEmpty } = memory();
		expect(await send(storage, 'PUT', 'list', 'from the laptop')).toMatchObject({ status: 201 });
		expect(await send(storage, 'GET', 'reply')).toMatchObject({ status: 204 });
		expect(await send(storage, 'GET', 'list')).toEqual({ status: 200, text: 'from the laptop' });
		expect(await send(storage, 'PUT', 'reply', 'merged on the phone')).toMatchObject({
			status: 201
		});
		expect(await send(storage, 'GET', 'reply')).toEqual({
			status: 200,
			text: 'merged on the phone'
		});
		expect(isEmpty()).toBe(true);
		expect(await send(storage, 'GET', 'reply')).toMatchObject({ status: 404 });
		expect(await send(storage, 'GET', 'list')).toMatchObject({ status: 404 });
	});

	it('takes one list and one reply, never a second', async () => {
		const { storage } = memory();
		await send(storage, 'PUT', 'list', 'first');
		expect(await send(storage, 'PUT', 'list', 'again')).toMatchObject({ status: 409 });
		await send(storage, 'PUT', 'reply', 'reply');
		expect(await send(storage, 'PUT', 'reply', 'another')).toMatchObject({ status: 409 });
		expect(await send(storage, 'GET', 'list')).toMatchObject({ text: 'first' });
	});

	it('has nothing to reply to before a list is left', async () => {
		const { storage } = memory();
		expect(await send(storage, 'PUT', 'reply', 'too early')).toMatchObject({ status: 404 });
	});

	it('empties itself after ten minutes, even before its alarm goes off', async () => {
		const { storage, alarm, isEmpty } = memory();
		await send(storage, 'PUT', 'list', 'soon gone', 1_000);
		expect(alarm()).toBe(1_000 + LIFETIME);
		expect(await send(storage, 'GET', 'list', undefined, 1_000 + LIFETIME - 1)).toMatchObject({
			status: 200
		});
		expect(await send(storage, 'GET', 'list', undefined, 1_000 + LIFETIME)).toMatchObject({
			status: 404
		});
		expect(isEmpty()).toBe(true);
	});

	it('can be emptied by the device that opened it', async () => {
		const { storage, isEmpty } = memory();
		await send(storage, 'PUT', 'list', 'changed my mind');
		expect(await send(storage, 'DELETE', '')).toMatchObject({ status: 204 });
		expect(isEmpty()).toBe(true);
	});

	it('refuses empty and oversized lists, and anything else', async () => {
		const { storage, isEmpty } = memory();
		expect(await send(storage, 'PUT', 'list', '')).toMatchObject({ status: 400 });
		const big = await handle(request('PUT', new Uint8Array(LIMIT + 1)), 'list', storage, 1_000);
		expect(big.status).toBe(413);
		expect(isEmpty()).toBe(true);
		expect(await send(storage, 'POST', 'list', 'x')).toMatchObject({ status: 405 });
		expect(await send(storage, 'GET', 'elsewhere')).toMatchObject({ status: 405 });
	});

	it('never lets a response be cached', async () => {
		const { storage } = memory();
		await send(storage, 'PUT', 'list', 'private');
		const response = await handle(request('GET'), 'list', storage, 1_000);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('is named by a 32-byte hash, never by the code', () => {
		expect(NAME.test('a'.repeat(43))).toBe(true);
		expect(NAME.test('7KQ3-M9XD-P2WF-HT6B')).toBe(false);
		expect(NAME.test('a'.repeat(44))).toBe(false);
	});
});
