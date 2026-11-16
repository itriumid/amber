<!-- The message itself: what happened, Undo while it's still the last action, and a way to dismiss
     it. Drawn at the bottom of the page or of the open dialog; see notice.svelte.ts. -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import { amber } from '#lib/amber.svelte.js';
	import { noticePlace } from '#lib/notice.svelte.js';
	import Icon from './Icon.svelte';
</script>

{#if amber.notice}
	{@const notice = amber.notice}
	<div
		class="pointer-events-auto flex items-center gap-3 rounded-lg border border-control-border bg-surface py-2 pr-2 pl-5 text-sm shadow-lg pointer-coarse:py-1"
		transition:fly={{ y: 16, duration: amber.reducedMotion ? 0 : 200 }}
		onmouseenter={() => (noticePlace.paused = true)}
		onmouseleave={() => (noticePlace.paused = false)}
		onfocusin={() => (noticePlace.paused = true)}
		onfocusout={() => (noticePlace.paused = false)}
		role="presentation"
	>
		<span>{notice.message}</span>
		{#if notice.changes.length && amber.history.at(-1) === notice}
			<button
				type="button"
				class="min-h-8 rounded-md px-3 font-semibold underline underline-offset-4 hover:bg-bg pointer-coarse:min-h-11"
				onclick={() => amber.undo()}>Undo</button
			>
		{/if}
		<button
			type="button"
			class="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-text pointer-coarse:size-11"
			aria-label="Dismiss"
			onclick={() => (amber.notice = undefined)}><Icon name="close" /></button
		>
	</div>
{/if}
