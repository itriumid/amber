// Stand-ins for Cloudflare, for tests: storage kept in memory, and a server that sends each
// request to its mailbox the way `index.ts` does, with the same rules.

import { ADDRESS, handle, NAME, type Storage } from './mailbox';

/** Storage kept in memory, standing in for a Durable Object's. */
export function memory() {
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

/** Every mailbox, each with its own storage, answering at `/api/mailboxes/`. */
export function server(now = Date.now) {
	const mailboxes = new Map<string, Storage>();
	return async (request: Request): Promise<Response> => {
		const match = ADDRESS.exec(new URL(request.url).pathname);
		if (!match || !NAME.test(match[1])) return new Response(null, { status: 404 });
		let storage = mailboxes.get(match[1]);
		if (!storage) mailboxes.set(match[1], (storage = memory().storage));
		return handle(request, match[2] ?? '', storage, now());
	};
}
