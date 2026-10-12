// Syncing two devices, once, through a mailbox on our server (`sync/`). The device that starts
// makes a code and leaves its list in the mailbox; the other device enters the code, merges that
// list into its own, and leaves the result; the first device takes it and merges it in too. Then
// both have everything, and the mailbox is empty.
//
// The code is the only secret. A hash of it names the mailbox and another hash of it is the key,
// so the server sees neither the code nor the key, only encrypted bytes under a name it can't
// turn back into the code. Each part is locked to its place, so the server can't hand a list
// back as a reply.

import { compressToUint8Array, decompressFromUint8Array } from 'lz-string';
import { LIFETIME, LIMIT } from '../../sync/mailbox';
import { SYNC_PREFIX } from './links';
import type { Records } from './model/list';
import { contents, parseJson, readContents, type Reading } from './transfer';

/** Crockford's base32: no I, L, O or U, so a code read aloud or copied by hand stays right. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 16 characters of 5 bits each: 80 bits, far too many to guess in the ten minutes a code lasts. */
const LENGTH = 16;
/** How often the device that started asks whether the reply has arrived. */
export const POLL_EVERY = 3_000;

export interface Mailbox {
	/** What the server knows it by: a hash of the code. */
	name: string;
	key: CryptoKey;
}

export type Problem = 'too-large' | 'offline' | 'gone' | 'taken' | 'server';
type Part = 'list' | 'reply';

/** Anything that fetches: the browser's own, or a stand-in in tests. */
type Send = (input: string, init?: RequestInit) => Promise<Response>;

/* ─── Codes ─── */

export function newCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array((LENGTH * 5) / 8));
	let bits = 0;
	let value = 0;
	let code = '';
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			code += ALPHABET[(value >> bits) & 31];
		}
	}
	return code;
}

/**
 * A code as someone typed or pasted it, or `undefined` if it can't be one. Spaces, dashes and
 * case don't matter, letters that look like digits count as those digits, and a whole link works.
 */
export function readCode(text: string): string | undefined {
	const start = text.indexOf(SYNC_PREFIX);
	const code = (start === -1 ? text : text.slice(start + SYNC_PREFIX.length).split(/\s/)[0])
		.toUpperCase()
		.replace(/[\s-]/g, '')
		.replace(/O/g, '0')
		.replace(/[IL]/g, '1');
	return code.length === LENGTH && [...code].every((character) => ALPHABET.includes(character))
		? code
		: undefined;
}

/** "ABCD-EFGH-JKMN-PQRS": easier to read out and check than sixteen in a row. */
export const showCode = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code;

/* ─── Encryption ─── */

const text = (value: string) => new TextEncoder().encode(value);

function toBase64Url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

export async function mailboxFor(code: string): Promise<Mailbox> {
	const material = await crypto.subtle.importKey('raw', text(code), 'HKDF', false, [
		'deriveBits',
		'deriveKey'
	]);
	const hkdf = (info: string) =>
		({
			name: 'HKDF',
			hash: 'SHA-256',
			salt: text('amber.itrium.id sync'),
			info: text(info)
		}) as const;
	const name = new Uint8Array(await crypto.subtle.deriveBits(hkdf('mailbox name'), material, 256));
	const key = await crypto.subtle.deriveKey(
		hkdf('mailbox key'),
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
	return { name: toBase64Url(name), key };
}

/** The list, compressed and encrypted: 12 bytes of nonce, then the encrypted bytes. */
export async function seal(
	mailbox: Mailbox,
	part: Part,
	records: Records
): Promise<Uint8Array<ArrayBuffer>> {
	const plain = new Uint8Array(compressToUint8Array(JSON.stringify(contents(records))));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = new Uint8Array(
		await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv, additionalData: text(part) },
			mailbox.key,
			plain
		)
	);
	const sealed = new Uint8Array(iv.length + data.length);
	sealed.set(iv);
	sealed.set(data, iv.length);
	return sealed;
}

export async function unseal(mailbox: Mailbox, part: Part, sealed: Uint8Array): Promise<Reading> {
	try {
		const plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: sealed.slice(0, 12), additionalData: text(part) },
			mailbox.key,
			sealed.slice(12)
		);
		const json = decompressFromUint8Array(new Uint8Array(plain));
		return json ? readContents(parseJson(json)) : { kind: 'not-amber' };
	} catch {
		// AES-GCM checks what it decrypts: anything changed on the way fails here.
		return { kind: 'not-amber' };
	}
}

/* ─── The mailbox ─── */

const address = (mailbox: Mailbox, part: Part | '' = '') =>
	`/api/mailboxes/${mailbox.name}${part && `/${part}`}`;

async function put(mailbox: Mailbox, part: Part, records: Records, send: Send) {
	const body = await seal(mailbox, part, records);
	if (body.length > LIMIT) return 'too-large';
	const response = await send(address(mailbox, part), { method: 'PUT', body }).catch(
		() => undefined
	);
	if (!response) return 'offline';
	if (response.status === 201) return undefined;
	if (response.status === 409) return 'taken';
	if (response.status === 404) return 'gone';
	if (response.status === 413) return 'too-large';
	return 'server';
}

/** The device that starts: makes a code and leaves its list under it. */
export async function leave(
	records: Records,
	send: Send = fetch
): Promise<{ code: string; mailbox: Mailbox } | { problem: Problem }> {
	const code = newCode();
	const mailbox = await mailboxFor(code);
	const problem = await put(mailbox, 'list', records, send);
	return problem ? { problem } : { code, mailbox };
}

/**
 * The device that started: waits for the other device's reply, asking every few seconds, until it
 * arrives or the mailbox has emptied itself. A dropped connection is tried again; the mailbox is
 * still there.
 */
export async function collect(
	mailbox: Mailbox,
	signal: AbortSignal,
	send: Send = fetch,
	now = Date.now
): Promise<Reading | { problem: Problem } | undefined> {
	const until = now() + LIFETIME;
	while (!signal.aborted && now() < until) {
		const response = await send(address(mailbox, 'reply'), { signal }).catch(() => undefined);
		if (signal.aborted) return undefined;
		if (response?.status === 200)
			return unseal(mailbox, 'reply', new Uint8Array(await response.arrayBuffer()));
		if (response?.status === 404) return { problem: 'gone' };
		if (response && response.status !== 204) return { problem: 'server' };
		if (now() >= until) break;
		await new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, POLL_EVERY);
			signal.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true });
		});
	}
	return signal.aborted ? undefined : { problem: 'gone' };
}

/** The device that joins: takes the list left under a code. */
export async function fetchList(
	code: string,
	send: Send = fetch
): Promise<{ mailbox: Mailbox; reading: Reading } | { problem: Problem }> {
	const mailbox = await mailboxFor(code);
	const response = await send(address(mailbox, 'list')).catch(() => undefined);
	if (!response) return { problem: 'offline' };
	if (response.status === 404) return { problem: 'gone' };
	if (response.status !== 200) return { problem: 'server' };
	const reading = await unseal(mailbox, 'list', new Uint8Array(await response.arrayBuffer()));
	return { mailbox, reading };
}

/** The device that joined: leaves its list, with the other one merged in, as the reply. */
export const reply = (mailbox: Mailbox, records: Records, send: Send = fetch) =>
	put(mailbox, 'reply', records, send);

/** Gives up on a sync: the mailbox empties now rather than in ten minutes. */
export async function cancel(mailbox: Mailbox, send: Send = fetch) {
	await send(address(mailbox), { method: 'DELETE', keepalive: true }).catch(() => undefined);
}
