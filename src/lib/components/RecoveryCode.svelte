<!-- A locked list's recovery code, shown once (docs/locked-lists.md): the code, Copy, and the box to
     tick once it's kept. Its sheet holds itself open until then; asked to close, it says why here. -->
<script lang="ts">
	import { smallButton } from '#lib/styles.js';

	let {
		code,
		kept = $bindable(false),
		box = $bindable(),
		mustKeep = false
	}: {
		code: string;
		kept?: boolean;
		/** The box, for the sheet to put focus on when it's asked to close too soon. */
		box?: HTMLInputElement;
		/** Asked to close before the code was kept. */
		mustKeep?: boolean;
	} = $props();

	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(code);
		copied = true;
	}
</script>

<div class="flex flex-wrap items-center gap-3">
	<p class="rounded-md border border-control-border px-3 py-2 font-mono text-base tracking-wider">
		{code}
	</p>
	<button type="button" class={smallButton} onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
</div>
<p class="sr-only" role="status">{copied ? 'Recovery code copied' : ''}</p>
<label class="flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
	<input type="checkbox" class="size-4 accent-accent-edge" bind:this={box} bind:checked={kept} />
	I've kept it somewhere safe
</label>
{#if mustKeep && !kept}
	<p class="text-sm" role="alert">Keep the code before closing: it's shown only this once.</p>
{/if}
