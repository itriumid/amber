import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Cloudflare injects its Web Analytics script into pages it may change, and the policy blocks it,
// so nothing is sent, but the page would still try to load it on every visit. `no-transform`
// makes Cloudflare leave the page alone. If this fails, the pages are being served without it.
describe('_headers', () => {
	const everyPage = readFileSync('_headers', 'utf8')
		.split(/\n(?=\S)/)
		.find((block) => block.startsWith('/*'));

	it('keeps Cloudflare from changing pages, so it cannot add its analytics', () => {
		expect(everyPage).toBeDefined();
		expect(everyPage).toMatch(/^\s+Cache-Control:.*\bno-transform\b/m);
	});

	it('still asks browsers to check for a newer page every time', () => {
		expect(everyPage).toMatch(/^\s+Cache-Control:.*\bmust-revalidate\b/m);
	});
});
