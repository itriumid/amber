// A fresh list for tests, with a clock that moves forward a millisecond per call.
import { Clock } from './clock';
import type { Context } from './list';

export function fresh(device = 'test', start = 1_000_000): Context {
	let now = start;
	return { records: {}, clock: new Clock(device, () => now++) };
}
