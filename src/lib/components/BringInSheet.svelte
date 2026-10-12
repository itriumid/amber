<!-- A list arriving from a file or a link: unlocked if it needs a passphrase, then shown as what it
     would change, and only merged in when asked. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import type { Source } from '#lib/links.js';
	import { updates } from '#lib/updates.svelte.js';
	import { field, label, smallButton } from '#lib/styles.js';
	import {
		isNothing,
		previewMerge,
		readFile,
		readLink,
		summarize,
		type Reading
	} from '#lib/transfer.js';
	import Sheet from './Sheet.svelte';

	let { source, onclose }: { source: Source | undefined; onclose: () => void } = $props();

	const prefix = $props.id();
	// Raw: the records are copied when previewed and merged, and a reactive proxy can't be copied.
	let reading = $state.raw<Reading>();
	let passphrase = $state('');
	let busy = $state(false);

	const read = (given?: string) =>
		source && 'file' in source ? readFile(source.file, given) : readLink(source?.link ?? '', given);

	$effect(() => {
		reading = undefined;
		passphrase = '';
		if (source) void read().then((result) => (reading = result));
	});

	const preview = $derived(
		reading?.kind === 'list'
			? previewMerge($state.snapshot(amber.records), reading.records)
			: undefined
	);

	async function unlock(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		try {
			reading = await read(passphrase);
		} finally {
			busy = false;
		}
	}

	async function bringIn() {
		if (reading?.kind !== 'list') return;
		busy = true;
		try {
			await amber.mergeIn(reading.records, 'List brought in');
			onclose();
		} finally {
			busy = false;
		}
	}
</script>

<Sheet open={!!source} title="Bring in a list" {onclose}>
	{#if !reading}
		<p class="text-sm text-muted">Reading…</p>
	{:else if reading.kind === 'locked' || reading.kind === 'wrong-passphrase'}
		<form onsubmit={unlock}>
			<p class="mb-4 text-sm">This list is locked with a passphrase.</p>
			<label for="{prefix}-unlock" class={label}>Passphrase</label>
			<input
				id="{prefix}-unlock"
				type="password"
				class={field}
				bind:value={passphrase}
				autocomplete="off"
				aria-invalid={reading.kind === 'wrong-passphrase'}
				aria-describedby={reading.kind === 'wrong-passphrase' ? `${prefix}-wrong` : undefined}
			/>
			{#if reading.kind === 'wrong-passphrase'}
				<p id="{prefix}-wrong" class="mt-1.5 text-sm" role="alert">
					That passphrase doesn't open it. Check it and try again.
				</p>
			{/if}
			<button type="submit" class="{smallButton} mt-4" disabled={busy || !passphrase}>
				{busy ? 'Unlocking…' : 'Unlock'}
			</button>
		</form>
	{:else if reading.kind === 'newer'}
		<p class="text-sm">
			This list was made by a newer version of Amber. Update Amber, then open it again.
		</p>
		<button type="button" class="{smallButton} mt-4" onclick={() => updates.apply()}
			>Update Amber</button
		>
	{:else if reading.kind === 'not-amber'}
		<p class="text-sm">This isn't a list from Amber, or part of it is missing.</p>
	{:else if preview}
		{#if isNothing(preview)}
			<p class="text-sm">You already have everything in it.</p>
		{:else}
			<p class="text-base font-medium">{summarize(preview)}</p>
			<p class="mt-2 text-sm text-muted">
				Nothing you have is lost. Where both lists changed the same thing, the newer change wins.
				You can undo it afterward.
			</p>
		{/if}
		{#if reading.unreadable}
			<p class="mt-3 text-sm">
				{reading.unreadable}
				{reading.unreadable === 1 ? 'item' : 'items'} in it couldn't be read, and will be left out.
			</p>
		{/if}
		{#if amber.readOnly}
			<p class="mt-3 text-sm">Your list can't be changed until Amber is updated.</p>
		{/if}
		<div class="mt-5 flex gap-2">
			{#if !isNothing(preview)}
				<button
					type="button"
					class="{smallButton} border-transparent bg-accent font-semibold text-on-accent hover:bg-accent hover:opacity-85"
					disabled={busy || amber.readOnly}
					onclick={bringIn}>Bring it in</button
				>
			{/if}
			<button type="button" class={smallButton} onclick={onclose}
				>{isNothing(preview) ? 'Close' : 'Cancel'}</button
			>
		</div>
	{/if}
</Sheet>
