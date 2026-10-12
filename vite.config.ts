import adapter from '@sveltejs/adapter-cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			// Every page is prerendered, so the policy goes out in a <meta> tag on each page, with a
			// hash for the one inline script SvelteKit starts the page with. Scripts from anywhere
			// else, and every connection out of the page, are blocked: lists live on the device and
			// nothing leaves it. `frame-ancestors` can't go in a <meta> tag; it's in `_headers`.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['none'],
					'script-src': ['self'],
					'style-src': ['self'],
					// SvelteKit's route announcer, a visually hidden line screen readers hear after each
					// navigation, has one inline style. Allowing that exact style, and no other, keeps
					// every other inline style blocked. src/csp.test.ts checks the hash against SvelteKit.
					'style-src-attr': [
						'unsafe-hashes',
						'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='
					],
					'font-src': ['self'],
					'img-src': ['self'],
					'manifest-src': ['self'],
					'connect-src': ['self'],
					'worker-src': ['self'],
					'base-uri': ['none'],
					'form-action': ['none']
				}
			}
		})
	],
	// Never inline assets as data: URLs; the Content-Security-Policy only allows files served from
	// the site itself.
	build: { assetsInlineLimit: 0 },
	test: {
		expect: { requireAssertions: true },
		include: ['src/**/*.test.ts', 'sync/**/*.test.ts'],
		environment: 'node'
	}
});
