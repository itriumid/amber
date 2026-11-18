<!-- Opening a locked list, with its passphrase or its recovery code (docs/locked-lists.md). -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { locks } from '#lib/locks.svelte.js';
	import { get, value } from '#lib/model/list.js';
	import { field, label, primaryButton } from '#lib/styles.js';
	import CapsLock from './CapsLock.svelte';
	import Problem from './Problem.svelte';
	import Sheet from './Sheet.svelte';

	let { identifier, onclose }: { identifier: string | undefined; onclose: () => void } = $props();

	const prefix = $props.id();
	const category = $derived(identifier ? get(amber.records, identifier, 'category') : undefined);
	let secret = $state('');
	let show = $state(false);
	let wrong = $state(false);
	let busy = $state(false);
	let capsLock = $state(false);

	$effect(() => {
		if (!identifier) return;
		secret = '';
		show = wrong = busy = false;
	});

	async function open(event: SubmitEvent) {
		event.preventDefault();
		if (!category || !secret) return;
		busy = true;
		try {
			if (await locks.open(category, secret)) {
				secret = '';
				onclose();
			} else wrong = true;
		} finally {
			busy = false;
		}
	}
</script>

<Sheet open={!!category} title={category ? `Open ${value(category, 'name')}` : 'Open'} {onclose}>
	<form class="space-y-4" onsubmit={open}>
		<div>
			<label for="{prefix}-secret" class={label}>Passphrase or recovery code</label>
			<input
				id="{prefix}-secret"
				type={show ? 'text' : 'password'}
				class={field}
				bind:value={secret}
				oninput={() => (wrong = false)}
				onkeyup={(event) => (capsLock = event.getModifierState('CapsLock'))}
				autocomplete="current-password"
				autocapitalize="off"
				spellcheck="false"
				aria-invalid={wrong}
				aria-describedby={wrong ? `${prefix}-wrong` : undefined}
			/>
			<CapsLock on={capsLock} />
			{#if wrong}
				<Problem id="{prefix}-wrong">
					That doesn't open it. Check it and try again: its passphrase or its recovery code works.
				</Problem>
			{/if}
		</div>
		<label class="flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
			<input type="checkbox" class="size-4 accent-accent-edge" bind:checked={show} />
			Show what you type
		</label>
		<button type="submit" class={primaryButton} disabled={busy || !secret}>
			{busy ? 'Opening…' : 'Open'}
		</button>
	</form>
</Sheet>
