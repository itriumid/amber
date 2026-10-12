// Order keys: strings that sort in the order things appear. Putting something between two others
// makes a new key between theirs, so moving a task changes that task alone and never renumbers its
// neighbours, which keeps merging edits from two devices clean.
//
// Keys use the digits below, which sort the same way as plain strings (`<`), and never end in the
// lowest digit, so there is always room before any key.

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = DIGITS[0];

/** A key strictly between `a` and `b`; `null` means the very start or the very end. */
export function keyBetween(a: string | null, b: string | null): string {
	if (a !== null && b !== null && a >= b) throw new Error(`no key between ${a} and ${b}`);
	// At either end, step like a counter instead of halving the gap, so a list that only ever grows
	// at one end keeps short keys: about one more character per sixty additions, not per six.
	if (a !== null && b === null) return increment(a);
	if (a === null && b !== null) return decrement(b);
	return midpoint(a ?? '', b);
}

/** The next key after `key`: its first digit that can grow, grown by one. */
function increment(key: string): string {
	for (let index = 0; index < key.length; index++) {
		const digit = DIGITS.indexOf(key[index]);
		if (digit < DIGITS.length - 1) return key.slice(0, index) + DIGITS[digit + 1];
	}
	// Every digit is the highest: add one more, as low as it can start, to leave the most room.
	return key + DIGITS[1];
}

/** A key just before `key`: its first digit that can shrink, shrunk by one. */
function decrement(key: string): string {
	for (let index = 0; index < key.length; index++) {
		const digit = DIGITS.indexOf(key[index]);
		if (digit > 1) return key.slice(0, index) + DIGITS[digit - 1];
	}
	// Only the two lowest digits, ending in the second: lower its last digit to the lowest and add
	// the highest after it, which leaves the most room below. "1" becomes "0z", "01" becomes "00z".
	return key.slice(0, -1) + ZERO + DIGITS[DIGITS.length - 1];
}

function midpoint(a: string, b: string | null): string {
	if (b !== null) {
		// Keep any shared beginning, and find a key between what follows it.
		let shared = 0;
		while ((a[shared] ?? ZERO) === b[shared]) shared++;
		if (shared > 0) return b.slice(0, shared) + midpoint(a.slice(shared), b.slice(shared));
	}
	const low = a ? DIGITS.indexOf(a[0]) : 0;
	const high = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
	if (high - low > 1) return DIGITS[Math.round((low + high) / 2)];
	// The first digits are neighbours.
	if (b !== null && b.length > 1) return b.slice(0, 1);
	return DIGITS[low] + midpoint(a.slice(1), null);
}

/** `count` keys in order, after `after` (or at the start). */
export function keysAfter(after: string | null, count: number): string[] {
	const keys: string[] = [];
	let previous = after;
	for (let index = 0; index < count; index++) {
		previous = keyBetween(previous, null);
		keys.push(previous);
	}
	return keys;
}

export function isOrderKey(key: unknown): key is string {
	return typeof key === 'string' && /^[0-9A-Za-z]{1,200}$/.test(key) && !key.endsWith(ZERO);
}
