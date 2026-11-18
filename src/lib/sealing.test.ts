import { describe, expect, it } from 'vitest';
import {
	changePassphrase,
	checksPassphrase,
	createLock,
	isLock,
	openLock,
	readRecoveryCode,
	seal,
	unseal
} from './sealing';

const PASSPHRASE = 'correct horse battery';

describe('locked lists', () => {
	it('seals text that only the list key, record and field open', async () => {
		const { lock, key, recoveryCode } = await createLock(PASSPHRASE);
		expect(isLock(JSON.parse(JSON.stringify(lock)))).toBe(true);
		const sealed = await seal(key, 'task-1', 'sealedTitle', 'Bank PIN 4821');
		expect(JSON.stringify(sealed)).not.toContain('4821');
		expect(await unseal(key, 'task-1', 'sealedTitle', sealed)).toBe('Bank PIN 4821');
		// Moved to another task, or to another field, it doesn't open.
		expect(await unseal(key, 'task-2', 'sealedTitle', sealed)).toBeUndefined();
		expect(await unseal(key, 'task-1', 'sealedNotes', sealed)).toBeUndefined();
		// The same text sealed twice looks different: a fresh IV each time.
		expect((await seal(key, 'task-1', 'sealedTitle', 'Bank PIN 4821')).data).not.toBe(sealed.data);
		expect(recoveryCode).toMatch(/^([0-9A-Z]{4}-){5}[0-9A-Z]{4}$/);
	});

	it('opens with the passphrase or the recovery code, and nothing else', async () => {
		const { lock, key, recoveryCode } = await createLock(PASSPHRASE);
		const sealed = await seal(key, 'task-1', 'sealedNotes', 'gate code 1984');
		const byPassphrase = await openLock(lock, PASSPHRASE);
		const byCode = await openLock(lock, recoveryCode.toLowerCase().replace(/-/g, ' '));
		expect(await unseal(byPassphrase!, 'task-1', 'sealedNotes', sealed)).toBe('gate code 1984');
		expect(await unseal(byCode!, 'task-1', 'sealedNotes', sealed)).toBe('gate code 1984');
		expect(await openLock(lock, 'correct horse battery!')).toBeUndefined();
		expect(await openLock(lock, '')).toBeUndefined();
	});

	it('changes the passphrase without re-sealing anything, keeping the recovery code', async () => {
		const { lock, key, recoveryCode } = await createLock(PASSPHRASE);
		const sealed = await seal(key, 'step-1', 'sealedText', 'wifi: hunter2');
		expect(await changePassphrase(lock, 'wrong passphrase', 'new one here')).toBeUndefined();
		const changed = (await changePassphrase(lock, recoveryCode, 'a brand new phrase'))!;
		expect(await openLock(changed, PASSPHRASE)).toBeUndefined();
		const opened = (await openLock(changed, 'a brand new phrase'))!;
		expect(await unseal(opened, 'step-1', 'sealedText', sealed)).toBe('wifi: hunter2');
		expect(await openLock(changed, recoveryCode)).toBeDefined();
	});

	it('reads a recovery code however it was typed, and refuses one that is not', () => {
		expect(readRecoveryCode('abcd efgh jkmn pqrs tvwx yz01')).toBe('ABCD-EFGH-JKMN-PQRS-TVWX-YZ01');
		expect(readRecoveryCode('ABCD-EFGH-JKMN')).toBeUndefined();
		expect(readRecoveryCode('ILOU-EFGH-JKMN-PQRS-TVWX-YZ01')).toBeUndefined();
	});

	it("doesn't take a lock that's the wrong shape", () => {
		expect(isLock(null)).toBe(false);
		expect(isLock({ passphrase: {}, recovery: {} })).toBe(false);
	});

	it('tells the passphrase apart from the recovery code and anything else', async () => {
		const { lock, recoveryCode } = await createLock(PASSPHRASE);
		expect(await checksPassphrase(lock, PASSPHRASE)).toBe(true);
		expect(await checksPassphrase(lock, recoveryCode)).toBe(false);
		expect(await checksPassphrase(lock, 'not the passphrase')).toBe(false);
	});

	it('refuses a lock that asks for more rounds than anyone would set', async () => {
		const { lock } = await createLock(PASSPHRASE);
		expect(isLock(lock)).toBe(true);
		expect(isLock({ ...lock, recovery: { ...lock.recovery, iterations: 2 ** 31 } })).toBe(false);
	});
});
