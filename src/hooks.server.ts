// The page itself is static; the only requests that reach code here are for the sync mailboxes,
// which are handed to their own Worker (`sync/`) through a service binding. It has no address
// of its own, so this is the only way in.

import type { Handle } from '@sveltejs/kit/hooks';

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/api/')) return resolve(event);
	const sync = event.platform?.env.SYNC;
	if (!sync) return new Response(null, { status: 503 });
	return sync.fetch(event.request);
};
