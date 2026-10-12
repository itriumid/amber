<!-- A dialog: a sheet from the bottom on a phone, a panel on the right on a wide screen. It's the
     browser's own modal dialog, so focus stays inside, Escape closes it, and focus goes back to
     where it was. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { rescueFocus } from '#lib/focus.js';
	import Icon from './Icon.svelte';

	let {
		open,
		title,
		onclose,
		children
	}: { open: boolean; title: string; onclose: () => void; children: Snippet } = $props();
	let dialog: HTMLDialogElement | undefined = $state();
	const titleIdentifier = $props.id();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleIdentifier}
	class="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50 sm:mr-0 sm:ml-auto sm:h-dvh sm:max-h-dvh sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
	onclose={() => {
		onclose();
		// The browser puts focus back on whatever opened the dialog. If that's gone (a deleted task,
		// a deleted category), focus would fall to the top of the page instead.
		setTimeout(() => rescueFocus());
	}}
	onclick={(event) => {
		// A click on the backdrop lands on the dialog itself.
		if (event.target === dialog) onclose();
	}}
>
	<div
		class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3"
	>
		<h2 id={titleIdentifier} class="text-base font-semibold">{title}</h2>
		<button
			type="button"
			class="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
			aria-label="Close"
			onclick={onclose}
		>
			<Icon name="close" />
		</button>
	</div>
	<div class="space-y-6 px-5 py-5">
		{@render children()}
	</div>
</dialog>
