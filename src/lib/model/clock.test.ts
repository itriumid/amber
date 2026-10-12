import { describe, expect, it } from 'vitest';
import { Clock, formatStamp, parseStamp } from './clock';

describe('clock', () => {
	it('stamps later edits later, even within one millisecond', () => {
		const clock = new Clock('a', () => 1000);
		const first = clock.tick();
		const second = clock.tick();
		expect(first < second).toBe(true);
	});

	it('never goes backwards when the device clock does', () => {
		let now = 5000;
		const clock = new Clock('a', () => now);
		const before = clock.tick();
		now = 1000;
		expect(clock.tick() > before).toBe(true);
	});

	it('stamps after anything it has seen from another device', () => {
		const behind = new Clock('a', () => 1000);
		behind.observe(formatStamp(9_000_000, 3, 'b'));
		expect(behind.tick() > formatStamp(9_000_000, 3, 'b')).toBe(true);
	});

	it('reads back what it writes, and refuses anything else', () => {
		expect(parseStamp(formatStamp(123456, 7, 'device'))).toEqual({
			time: 123456,
			counter: 7,
			device: 'device'
		});
		expect(parseStamp('nonsense')).toBeUndefined();
	});
});
