<!-- The message after an action, with Undo. Screen readers hear it too: the region is always there,
     and only its words change. It stays while hovered or focused, and goes after a few seconds. On a
     touch screen its buttons are 44px high.

     It floats over the bottom of the screen, so while it shows, the page makes room for it: the
     space it covers is kept as scroll padding, so focus is scrolled clear of it, and as room at the
     end, so the last rows can be scrolled above it. The footer's padding is most of that room
     already; only what it lacks is added, and that is taken away only once it's out of sight, so
     nothing on screen moves.

     While a dialog is open, the message shows in it instead (Sheet.svelte), since the page under
     an open dialog can't be reached; see notice.svelte.ts. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { noticePlace } from '#lib/notice.svelte.js';
	import NoticeMessage from './NoticeMessage.svelte';

	/** Shown on the page: there's a message, and no dialog to show it in. */
	const shown = $derived(!!amber.notice && noticePlace.shows(amber.notice, undefined));
	let timer: ReturnType<typeof setTimeout> | undefined;
	let region: HTMLDivElement | undefined = $state();
	let room: HTMLDivElement | undefined = $state();

	/** A little space between the message and whatever is scrolled clear of it. */
	const GAP = 8;

	/** How far up from the bottom of the screen the message reaches, gap included; 0 with none. */
	function covered() {
		if (!region || !shown) return 0;
		return Math.ceil(innerHeight - region.getBoundingClientRect().top) + GAP;
	}

	/**
	 * Keeps `height` free at the bottom: as scroll padding, and as room at the end beyond what the
	 * footer's own padding already leaves, so the room isn't added twice. Custom properties set from
	 * script, not style attributes, which the security policy blocks.
	 */
	function reserve(height: number) {
		const style = document.documentElement.style;
		if (!height) {
			style.removeProperty('--notice-room');
			style.removeProperty('--notice-end');
			return;
		}
		const footer = document.querySelector('footer');
		const kept = footer ? parseFloat(getComputedStyle(footer).paddingBottom) : 0;
		style.setProperty('--notice-room', `${height}px`);
		style.setProperty('--notice-end', `${Math.max(0, height - kept)}px`);
	}

	/** Scrolls the element with focus up, if the message covers it. Smooth unless motion is reduced. */
	function keepClear(target: Element | null) {
		if (!(target instanceof HTMLElement) || !region || !shown) return;
		if (region.contains(target) || target.closest('dialog')) return;
		// A whole task row, when focus is in one, so the task can be read as well as reached.
		const box = (target.closest('[data-task]') ?? target).getBoundingClientRect();
		const top = innerHeight - covered();
		// The focus outline is drawn 3px outside the element, 2px wide.
		const bottom = box.bottom + 5;
		if (bottom > top && box.top < innerHeight) window.scrollBy({ top: bottom - top });
	}

	// While the message shows, its room follows its height (a long message can wrap).
	$effect(() => {
		if (!shown || !region) return;
		const measure = () => reserve(covered());
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(region);
		addEventListener('resize', measure);
		// Focus may already be where the message has just appeared.
		requestAnimationFrame(() => keepClear(document.activeElement));
		return () => {
			observer.disconnect();
			removeEventListener('resize', measure);
			release();
		};
	});

	/**
	 * Gives the room back once the message has gone. If the room at the end is in sight, taking it
	 * away would pull the page down, so it waits until it's scrolled out of sight.
	 */
	function release() {
		// Only the room added beyond the footer's padding can move anything; often there's none.
		const inSight = () => {
			const box = room?.getBoundingClientRect();
			return !!box && box.height > 0 && box.top < innerHeight;
		};
		if (!inSight()) return reserve(0);
		document.documentElement.style.removeProperty('--notice-room');
		const later = () => {
			if (shown) return removeEventListener('scroll', later);
			if (inSight()) return;
			removeEventListener('scroll', later);
			reserve(0);
		};
		addEventListener('scroll', later, { passive: true });
	}

	$effect(() => {
		const current = amber.notice;
		clearTimeout(timer);
		if (current && !noticePlace.paused) timer = setTimeout(() => (amber.notice = undefined), 6000);
		return () => clearTimeout(timer);
	});
</script>

<svelte:document
	onfocusin={(event) => requestAnimationFrame(() => keepClear(event.target as Element))}
/>

<!-- The room at the end of the page, while the message needs it. -->
<div bind:this={room} class="h-(--notice-end)" aria-hidden="true"></div>

<div
	bind:this={region}
	class="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
	role="status"
>
	{#if shown}<NoticeMessage />{/if}
</div>
