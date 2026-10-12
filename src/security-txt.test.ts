import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// RFC 9116 requires an expiry date, and a security.txt past its date is meant to be ignored.
// This fails a month ahead, so there's time to push the date out another year.
describe('security.txt', () => {
	const text = readFileSync('static/.well-known/security.txt', 'utf8');

	it('expires more than a month from now', () => {
		const expires = text.match(/^Expires: (.+)$/m)?.[1];
		expect(expires).toBeDefined();
		const monthFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
		expect(new Date(expires!).getTime()).toBeGreaterThan(monthFromNow);
	});

	it('points reports at the security address', () => {
		expect(text).toMatch(/^Contact: mailto:security@itrium\.id$/m);
	});
});
