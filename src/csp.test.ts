import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The Content-Security-Policy allows one inline style: the one on SvelteKit's route announcer,
// by its hash. If a SvelteKit update changes that style, the announcer breaks silently (it would
// show on the page), so this fails first, with the hash to put in vite.config.ts.
describe('Content-Security-Policy', () => {
	it("allows the style on SvelteKit's route announcer, and only that", () => {
		const root = readFileSync(
			'node_modules/@sveltejs/kit/src/runtime/components/root.svelte',
			'utf8'
		);
		const style = root.match(/id="svelte-announcer"[^>]*?style="([^"]+)"/s)?.[1];
		expect(style).toBeDefined();
		const hash = `sha256-${createHash('sha256').update(style!).digest('base64')}`;
		const config = readFileSync('vite.config.ts', 'utf8');
		expect(config, `put '${hash}' in style-src-attr in vite.config.ts`).toContain(`'${hash}'`);
	});
});
