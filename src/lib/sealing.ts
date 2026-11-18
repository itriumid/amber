// Locked lists' encryption (docs/locked-lists.md). Each locked list has its own random data key;
// its tasks' titles, notes and steps are sealed with it, and the data key itself is stored only
// wrapped: once by a key made from the list's passphrase, and once by a key made from its recovery
// code. Changing the passphrase re-wraps the data key alone, so two devices that change it at once
// still agree, and nothing else has to be re-encrypted.
//
// Everything here is plain values in and out: the sealed forms are JSON, saved in the list's
// records like any other field, and merged field by field.

import { bytesToBase64Url, fromBase64Url, ITERATIONS, keyFrom } from './transfer';

/** A value sealed with AES-GCM: a fresh 96-bit IV each time, and the ciphertext with its tag. */
export interface Sealed {
	iv: string;
	data: string;
}

/** A data key wrapped by a key made from a secret, with the salt and the work it took. */
export interface Wrapped {
	salt: string;
	iterations: number;
	key: Sealed;
}

/** What a locked list keeps about its key: never the key itself. */
export interface Lock {
	passphrase: Wrapped;
	recovery: Wrapped;
}

/** Recovery codes use the sync code's letters: no I, L, O or U to misread. 120 bits. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const RECOVERY_LENGTH = 24;

/** The shortest passphrase a locked list accepts. A stolen copy can be guessed at offline. */
export const MINIMUM_PASSPHRASE = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isSealed(value: unknown): value is Sealed {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Sealed).iv === 'string' &&
		typeof (value as Sealed).data === 'string'
	);
}

function isWrapped(value: unknown): value is Wrapped {
	const wrapped = value as Wrapped;
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof wrapped.salt === 'string' &&
		Number.isInteger(wrapped.iterations) &&
		wrapped.iterations >= 100_000 &&
		// A file or link brought in could ask for billions, and hang the page as it opens.
		wrapped.iterations <= 10_000_000 &&
		isSealed(wrapped.key)
	);
}

/** The shape a record's `lock` field must have when it isn't null. */
export function isLock(value: unknown): value is Lock {
	return (
		typeof value === 'object' &&
		value !== null &&
		isWrapped((value as Lock).passphrase) &&
		isWrapped((value as Lock).recovery)
	);
}

/** The shape a sealed field must have when it isn't null. */
export const isSealedValue = isSealed;

/** "7K3Q-…": six groups of four, so it can be written down and read back. */
function makeRecoveryCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_LENGTH));
	const characters = [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]);
	return characters.join('').match(/.{4}/g)!.join('-');
}

/** A recovery code as typed: any case, with or without dashes and spaces. */
export function readRecoveryCode(typed: string): string | undefined {
	const code = typed.toUpperCase().replace(/[\s-]/g, '');
	if (
		code.length !== RECOVERY_LENGTH ||
		![...code].every((character) => ALPHABET.includes(character))
	)
		return undefined;
	return code.match(/.{4}/g)!.join('-');
}

async function wrap(raw: Uint8Array<ArrayBuffer>, secret: string): Promise<Wrapped> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await keyFrom(secret, salt, ITERATIONS);
	const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, raw));
	return {
		salt: bytesToBase64Url(salt),
		iterations: ITERATIONS,
		key: { iv: bytesToBase64Url(iv), data: bytesToBase64Url(data) }
	};
}

/** The raw data key, or undefined when the secret doesn't open it. */
async function unwrap(
	wrapped: Wrapped,
	secret: string
): Promise<Uint8Array<ArrayBuffer> | undefined> {
	try {
		const key = await keyFrom(secret, fromBase64Url(wrapped.salt), wrapped.iterations);
		return new Uint8Array(
			await crypto.subtle.decrypt(
				{ name: 'AES-GCM', iv: fromBase64Url(wrapped.key.iv) },
				key,
				fromBase64Url(wrapped.key.data)
			)
		);
	} catch {
		// AES-GCM checks what it decrypts: a wrong secret fails here, never as garbage.
		return undefined;
	}
}

/** The data key as the page holds it: usable, but never readable back out. */
function usable(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** A new lock: a random data key, wrapped by the passphrase and by a new recovery code. */
export async function createLock(
	passphrase: string
): Promise<{ lock: Lock; key: CryptoKey; recoveryCode: string }> {
	const raw = crypto.getRandomValues(new Uint8Array(32));
	const recoveryCode = makeRecoveryCode();
	const lock = { passphrase: await wrap(raw, passphrase), recovery: await wrap(raw, recoveryCode) };
	const key = await usable(raw);
	raw.fill(0);
	return { lock, key, recoveryCode };
}

/** The list's data key, from its passphrase or its recovery code; undefined when neither fits. */
export async function openLock(lock: Lock, secret: string): Promise<CryptoKey | undefined> {
	const code = readRecoveryCode(secret);
	const raw =
		(await unwrap(lock.passphrase, secret)) ??
		(code ? await unwrap(lock.recovery, code) : undefined);
	if (!raw) return undefined;
	const key = await usable(raw);
	raw.fill(0);
	return key;
}

/**
 * The same data key, wrapped by a new passphrase; the recovery code still opens it. Needs the
 * current passphrase or the recovery code. Undefined when that doesn't fit.
 */
export async function changePassphrase(
	lock: Lock,
	current: string,
	next: string
): Promise<Lock | undefined> {
	const code = readRecoveryCode(current);
	const raw =
		(await unwrap(lock.passphrase, current)) ??
		(code ? await unwrap(lock.recovery, code) : undefined);
	if (!raw) return undefined;
	const changed = { passphrase: await wrap(raw, next), recovery: lock.recovery };
	raw.fill(0);
	return changed;
}

/**
 * Whether this is the list's passphrase. Making a new recovery code needs it, rather than the
 * code: a lost code is what that's for.
 */
export async function checksPassphrase(lock: Lock, passphrase: string): Promise<boolean> {
	const raw = await unwrap(lock.passphrase, passphrase);
	raw?.fill(0);
	return !!raw;
}

/**
 * The record and field a sealed value belongs to, bound in as additional data: a ciphertext moved
 * to another task, or from a title to a note, fails to open instead of showing up there.
 */
const bound = (identifier: string, field: string) => encoder.encode(`${identifier}\u0000${field}`);

export async function seal(
	key: CryptoKey,
	identifier: string,
	field: string,
	text: string
): Promise<Sealed> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = new Uint8Array(
		await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv, additionalData: bound(identifier, field) },
			key,
			encoder.encode(text)
		)
	);
	return { iv: bytesToBase64Url(iv), data: bytesToBase64Url(data) };
}

/** The text sealed in a field, or undefined when this key, record or field doesn't match it. */
export async function unseal(
	key: CryptoKey,
	identifier: string,
	field: string,
	sealed: Sealed
): Promise<string | undefined> {
	try {
		const plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: fromBase64Url(sealed.iv), additionalData: bound(identifier, field) },
			key,
			fromBase64Url(sealed.data)
		);
		return decoder.decode(plain);
	} catch {
		return undefined;
	}
}
