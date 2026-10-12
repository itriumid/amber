// The page itself is static; the only requests that reach code here are for the sync mailboxes,
// which are handed to their own Worker (`sync/`) through a service binding. It has no address
// of its own, so this is the only way in.
//
// Bindings come from `cloudflare:workers`, not `event.platform`: the Cloudflare adapter no longer
// passes them to SvelteKit with each request. The module is loaded only when a mailbox is asked
// for, because the local preview runs the build in Node, which can't load it at all; there, and
// anywhere else without the sync Worker, mailboxes answer 503.

import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/api/')) return resolve(event);
	const sync = await import('cloudflare:workers').then(
		({ env }) => env.SYNC,
		() => undefined
	);
	if (!sync) return new Response(null, { status: 503 });
	return sync.fetch(event.request);
};
