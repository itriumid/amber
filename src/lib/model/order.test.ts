import { describe, expect, it } from 'vitest';
import { isOrderKey, keyBetween, keysAfter } from './order';

describe('order keys', () => {
	it('starts in the middle', () => {
		expect(keyBetween(null, null)).toBe('V');
	});

	it('goes before, after and between', () => {
		const middle = keyBetween(null, null);
		const before = keyBetween(null, middle);
		const after = keyBetween(middle, null);
		const between = keyBetween(before, middle);
		expect(before < between && between < middle && middle < after).toBe(true);
	});

	it('refuses an empty gap', () => {
		expect(() => keyBetween('V', 'V')).toThrow();
		expect(() => keyBetween('W', 'V')).toThrow();
	});

	it('always finds room, however often things are squeezed into one place', () => {
		// Insert repeatedly at random positions and check the list stays strictly ordered.
		const keys: string[] = [keyBetween(null, null)];
		let seed = 7;
		const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
		for (let step = 0; step < 3000; step++) {
			const at = Math.floor(random() * (keys.length + 1));
			const key = keyBetween(keys[at - 1] ?? null, keys[at] ?? null);
			keys.splice(at, 0, key);
		}
		for (let index = 1; index < keys.length; index++)
			expect(keys[index - 1] < keys[index]).toBe(true);
		expect(keys.every(isOrderKey)).toBe(true);
	});

	it('keeps keys short when adding to the end', () => {
		const keys = keysAfter(null, 500);
		expect(Math.max(...keys.map((key) => key.length))).toBeLessThan(15);
	});

	it('squeezing in at the very start stays short too', () => {
		let first = keyBetween(null, null);
		for (let step = 0; step < 500; step++) first = keyBetween(null, first);
		expect(first.length).toBeLessThan(15);
		expect(isOrderKey(first)).toBe(true);
	});
});
