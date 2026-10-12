// The part of Cloudflare's runtime the site's server code uses: the bindings in `wrangler.jsonc`.
// Cloudflare's full types are only loaded for the sync Worker (`sync/`).
declare module 'cloudflare:workers' {
	export const env: {
		/** The sync Worker (`sync/`). Missing in the local preview, which doesn't run it. */
		SYNC?: { fetch(request: Request): Promise<Response> };
	};
}
