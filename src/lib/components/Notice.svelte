<!-- The message after an action, with Undo. Screen readers hear it too: the region is always there,
     and only its words change. It stays while hovered or focused, and goes after a few seconds. -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import { amber } from '#lib/amber.svelte.js';
	import Icon from './Icon.svelte';

	let paused = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const current = amber.notice;
		clearTimeout(timer);
		if (current && !paused) timer = setTimeout(() => (amber.notice = undefined), 6000);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
	role="status"
>
	{#if amber.notice}
		{@const notice = amber.notice}
		<div
			class="pointer-events-auto flex items-center gap-3 rounded-full border border-control-border bg-surface py-2 pr-2 pl-5 text-sm shadow-lg"
			transition:fly={{ y: 16, duration: amber.reducedMotion ? 0 : 200 }}
			onmouseenter={() => (paused = true)}
			onmouseleave={() => (paused = false)}
			onfocusin={() => (paused = true)}
			onfocusout={() => (paused = false)}
			role="presentation"
		>
			<span>{notice.message}</span>
			{#if notice.changes.length && amber.history.at(-1) === notice}
				<button
					type="button"
					class="min-h-8 rounded-full px-3 font-semibold underline underline-offset-4 hover:bg-bg"
					onclick={() => amber.undo()}>Undo</button
				>
			{/if}
			<button
				type="button"
				class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
				aria-label="Dismiss"
				onclick={() => (amber.notice = undefined)}><Icon name="close" /></button
			>
		</div>
	{/if}
</div>
