// Amber's sync mailbox on Cloudflare. The Worker checks the address and hands each request to the
// Durable Object for that mailbox, which applies the rules in `mailbox.ts`. Each mailbox lives in
// its own Durable Object, so mailboxes never share storage, and an alarm empties each one when its
// time is up.

import { DurableObject } from 'cloudflare:workers';
import { ADDRESS, handle, NAME } from './mailbox';

export class Mailbox extends DurableObject<Env> {
	async fetch(request: Request): Promise<Response> {
		const part = ADDRESS.exec(new URL(request.url).pathname)?.[2] ?? '';
		return handle(request, part, this.ctx.storage, Date.now());
	}

	async alarm() {
		await this.ctx.storage.deleteAll();
	}
}

export default {
	async fetch(request, env) {
		const match = ADDRESS.exec(new URL(request.url).pathname);
		if (!match || !NAME.test(match[1])) return new Response(null, { status: 404 });
		return env.MAILBOX.get(env.MAILBOX.idFromName(match[1])).fetch(request);
	}
} satisfies ExportedHandler<Env>;
