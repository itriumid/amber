<!-- A dialog: a sheet from the bottom on a phone, a panel on the right on a wide screen. It's the
     browser's own modal dialog, so focus stays inside, Escape closes it, and focus goes back to
     where it was. The message with Undo shows at its bottom while it's the dialog on top: the page
     underneath can't be reached. -->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { isShown, rescueFocus } from '#lib/focus.js';
	import { amber } from '#lib/amber.svelte.js';
	import { noticePlace } from '#lib/notice.svelte.js';
	import Icon from './Icon.svelte';
	import NoticeMessage from './NoticeMessage.svelte';
	import { touchTarget } from '#lib/styles.js';

	let {
		open,
		title,
		onclose,
		focusField = true,
		children
	}: {
		open: boolean;
		title: string;
		onclose: () => void;
		/** Whether opening it puts focus on its first field. Off where that field isn't the point. */
		focusField?: boolean;
		children: Snippet;
	} = $props();
	let dialog: HTMLDialogElement | undefined = $state();
	let region: HTMLDivElement | undefined = $state();
	let header: HTMLDivElement | undefined = $state();
	const titleIdentifier = $props.id();
	const showsNotice = $derived(!!amber.notice && noticePlace.top === titleIdentifier);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
			// The browser puts focus on the first control, which is Close; every edit would start with
			// a Tab past it. With a mouse or a trackpad, focus goes to the first field instead. Not on a
			// touch screen, where a focused field brings up the on-screen keyboard over the sheet.
			if (focusField && matchMedia('(pointer: fine)').matches) {
				const first = [
					...dialog.querySelectorAll<HTMLElement>(
						'input:not([type="checkbox"], [type="radio"], [type="file"], [type="hidden"]), textarea, select'
					)
				].find((element) => isShown(element) && !element.hasAttribute('disabled'));
				first?.focus();
			}
		}
		if (!open && dialog.open) dialog.close();
	});

	$effect(() => {
		if (!open) return;
		// Untracked: registering reads the list of dialogs, which would make this rerun on every change.
		untrack(() => noticePlace.opened(titleIdentifier));
		return () => noticePlace.closed(titleIdentifier);
	});

	/**
	 * The message takes its own place at the end of the sheet instead of floating over it, so it
	 * never covers a control. When it appears out of sight, the sheet scrolls to show it, but never so
	 * far that what has focus goes up under the header.
	 */
	function reveal() {
		if (!showsNotice || !dialog || !region || !header) return;
		const below = region.getBoundingClientRect().bottom - dialog.getBoundingClientRect().bottom;
		if (below <= 0) return;
		const focused = document.activeElement;
		const room =
			focused instanceof HTMLElement && dialog.contains(focused) && !region.contains(focused)
				? focused.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 8
				: below;
		const by = Math.min(below, room);
		if (by > 0) dialog.scrollBy({ top: by });
	}

	$effect(() => {
		if (showsNotice) requestAnimationFrame(reveal);
	});
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleIdentifier}
	class="m-0 mt-auto max-h-[92dvh] w-full max-w-none flex-col overflow-y-auto rounded-t-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50 open:flex sm:mr-0 sm:ml-auto sm:h-dvh sm:max-h-dvh sm:max-w-md sm:rounded-none sm:rounded-l-2xl"
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
		bind:this={header}
		class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3"
	>
		<h2 id={titleIdentifier} class="text-base font-semibold">{title}</h2>
		<button
			type="button"
			class="relative inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text {touchTarget}"
			aria-label="Close"
			onclick={onclose}
		>
			<Icon name="close" />
		</button>
	</div>
	<div class="space-y-6 px-5 py-5">
		{@render children()}
	</div>
	<!-- At the end of the sheet, at the bottom when it's taller than its content. Always there, empty,
	     so screen readers hear the message when it appears. -->
	<div bind:this={region} class="mt-auto" role="status">
		{#if showsNotice}
			<div class="flex justify-center px-4 pb-4">
				<NoticeMessage />
			</div>
		{/if}
	</div>
</dialog>
