// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Platform {
			env: {
				/** The sync Worker (`sync/`), bound in `wrangler.jsonc`. */
				SYNC: { fetch(request: Request): Promise<Response> };
			};
		}
	}
}

export {};
