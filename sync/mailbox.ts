// The mailbox two devices sync through, and nothing more. One device leaves its list here,
// encrypted; the other takes it, merges it with its own, and leaves the result; the first takes
// that, and the mailbox is emptied. It holds only what the devices encrypted, so nothing here can
// read a list, and nothing is kept: the mailbox empties itself after ten minutes, used or not.
//
// These are the rules alone, apart from Cloudflare, so they can be tested anywhere. The Durable
// Object in `index.ts` gives them storage and a clock.

/** How long a mailbox lasts before it empties itself, used or not. */
export const LIFETIME = 10 * 60 * 1000;
/** The most a device may leave: a long list, compressed and encrypted, fits many times over. */
export const LIMIT = 1024 * 1024;

/** A mailbox's name: a hash of the code, 32 bytes in base64url, so the code itself never comes here. */
export const NAME = /^[A-Za-z0-9_-]{43}$/;

export interface Storage {
	get<T>(key: string): Promise<T | undefined>;
	put(key: string, value: unknown): Promise<void>;
	deleteAll(): Promise<void>;
	setAlarm(time: number): Promise<void>;
}

interface Contents {
	openedAt: number;
	list: ArrayBuffer;
	reply?: ArrayBuffer;
}

const KEY = 'contents';
const empty = (status: number) => new Response(null, { status });

async function body(request: Request): Promise<ArrayBuffer | Response> {
	const declared = Number(request.headers.get('content-length') ?? 0);
	if (declared > LIMIT) return empty(413);
	const bytes = await request.arrayBuffer();
	if (bytes.byteLength > LIMIT) return empty(413);
	if (!bytes.byteLength) return empty(400);
	return bytes;
}

const bytes = (data: ArrayBuffer) =>
	new Response(data, {
		headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' }
	});

/**
 * Answers one request to a mailbox. `part` is what's asked for: the `list` the first device left,
 * or the `reply` the second one sent back.
 */
export async function handle(
	request: Request,
	part: string,
	storage: Storage,
	now: number
): Promise<Response> {
	let contents = await storage.get<Contents>(KEY);
	if (contents && now - contents.openedAt >= LIFETIME) {
		// Past its time, even if the alarm hasn't gone off yet.
		await storage.deleteAll();
		contents = undefined;
	}

	if (request.method === 'DELETE' && !part) {
		await storage.deleteAll();
		return empty(204);
	}

	if (part === 'list' && request.method === 'PUT') {
		if (contents) return empty(409);
		const list = await body(request);
		if (list instanceof Response) return list;
		await storage.put(KEY, { openedAt: now, list } satisfies Contents);
		await storage.setAlarm(now + LIFETIME);
		return empty(201);
	}

	if (part === 'list' && request.method === 'GET') {
		return contents ? bytes(contents.list) : empty(404);
	}

	if (part === 'reply' && request.method === 'PUT') {
		if (!contents) return empty(404);
		if (contents.reply) return empty(409);
		const reply = await body(request);
		if (reply instanceof Response) return reply;
		await storage.put(KEY, { ...contents, reply } satisfies Contents);
		return empty(201);
	}

	if (part === 'reply' && request.method === 'GET') {
		if (!contents) return empty(404);
		// Not yet: the first device asks again in a moment.
		if (!contents.reply) return empty(204);
		// Taken once, then gone: the sync is done.
		await storage.deleteAll();
		return bytes(contents.reply);
	}

	return empty(405);
}
