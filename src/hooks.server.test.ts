import { describe, expect, it, vi } from 'vitest';

// The bindings, the way the Cloudflare adapter's stand-in for `cloudflare:workers` finds them in
// the local preview: on a global it sets when the preview starts.
const sync = vi.hoisted(() => {
	const sync = {
		fetch: vi.fn(
			async (request: Request) => new Response(`mailbox: ${new URL(request.url).pathname}`)
		)
	};
	Object.assign(globalThis, { __sveltekit_cloudflare_platform: { env: { SYNC: sync } } });
	return sync;
});

const { handle } = await import('./hooks.server');

const run = (path: string) => {
	const url = new URL(path, 'https://amber.itrium.id');
	const resolve = vi.fn(async () => new Response('page'));
	const event = { url, request: new Request(url) } as Parameters<typeof handle>[0]['event'];
	return { response: handle({ event, resolve }), resolve };
};

describe('the server hook', () => {
	it('hands mailbox requests to the sync Worker', async () => {
		const { response, resolve } = run('/api/mailboxes/abc/list');
		expect(await (await response).text()).toBe('mailbox: /api/mailboxes/abc/list');
		expect(resolve).not.toHaveBeenCalled();
	});

	it('leaves everything else to SvelteKit', async () => {
		const { response } = run('/');
		expect(await (await response).text()).toBe('page');
		expect(sync.fetch).not.toHaveBeenCalled();
	});
});
