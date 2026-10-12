// A hybrid logical clock: every edit gets a stamp, and comparing two stamps as plain strings
// tells which edit came later, across devices.
//
// A stamp is the device's time in milliseconds, a counter for edits within the same millisecond,
// and the device's identifier, each fixed-width so that string order is time order. Device clocks drift,
// so the clock never goes backwards: it moves past every stamp it has seen, from this device or
// from a list it merged, and a device whose clock runs behind still stamps its edits after the
// ones it already knows about.

export type Stamp = string;

const TIME_WIDTH = 9; // base 36: enough for dates far past the year 5000
const COUNTER_WIDTH = 4;
const HIGHEST_COUNTER = 36 ** COUNTER_WIDTH - 1;

export function formatStamp(time: number, counter: number, device: string): Stamp {
	return `${time.toString(36).padStart(TIME_WIDTH, '0')}.${counter.toString(36).padStart(COUNTER_WIDTH, '0')}.${device}`;
}

export function parseStamp(
	stamp: Stamp
): { time: number; counter: number; device: string } | undefined {
	const match = /^([0-9a-z]{9})\.([0-9a-z]{4})\.([A-Za-z0-9_-]{1,64})$/.exec(stamp);
	if (!match) return undefined;
	return { time: parseInt(match[1], 36), counter: parseInt(match[2], 36), device: match[3] };
}

export class Clock {
	private time = 0;
	private counter = 0;

	constructor(
		readonly device: string,
		private readonly now: () => number = Date.now
	) {}

	/** A stamp for a new edit, later than every stamp this clock has made or seen. */
	tick(): Stamp {
		const now = this.now();
		if (now > this.time) {
			this.time = now;
			this.counter = 0;
		} else if (this.counter < HIGHEST_COUNTER) {
			this.counter++;
		} else {
			// Ten thousand edits in one millisecond: borrow the next millisecond.
			this.time++;
			this.counter = 0;
		}
		return formatStamp(this.time, this.counter, this.device);
	}

	/** Moves the clock past a stamp from elsewhere, so the next edit here comes after it. */
	observe(stamp: Stamp) {
		const seen = parseStamp(stamp);
		if (!seen) return;
		if (seen.time > this.time || (seen.time === this.time && seen.counter > this.counter)) {
			this.time = seen.time;
			this.counter = seen.counter;
		}
	}
}
