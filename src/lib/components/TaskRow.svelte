<!-- One task in the list. Ticking it, opening it and moving it are all here. From the keyboard,
     wherever focus is in the row: Alt with the up or down arrow moves it, Enter opens it, and Delete
     deletes it, with Undo. In search results the words found are marked, and moving is off: with
     tasks hidden in between, a move wouldn't show. Going from row to row is in roving.ts. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { DOT, EDGE } from '#lib/colors.js';
	import { categoryLabel, deleteTask, moveTask, setDone } from '#lib/model/actions.js';
	import { value, type Color, type Task } from '#lib/model/list.js';
	import { tick, untrack } from 'svelte';
	import { home, isShown } from '#lib/focus.js';
	import { highlight } from '#lib/search.js';
	import Check from './Check.svelte';
	import Icon from './Icon.svelte';
	import { touchTarget } from '#lib/styles.js';

	let {
		task,
		showCategory = false,
		words = [],
		movable = true,
		first = false,
		last = false,
		bucket = false,
		achieved = false,
		hideTag,
		color = null,
		onopen
	}: {
		task: Task;
		showCategory?: boolean;
		/** Search words to mark in the title. */
		words?: string[];
		movable?: boolean;
		/** At the top or the bottom of its list, where moving that way would do nothing. */
		first?: boolean;
		last?: boolean;
		/** In a bucket list: done is said as achieved, wherever the task shows. */
		bucket?: boolean;
		/** On a bucket list's Achieved shelf: drawn as a specimen with its collection label. */
		achieved?: boolean;
		/** The tag whose own list this is: said once by the heading, not again on every task. */
		hideTag?: string;
		/** Its list's color: the empty checkbox is edged in it, tying the task to its section's label. */
		color?: Color | null;
		onopen: (task: Task) => void;
	} = $props();

	const title = $derived(value(task, 'title'));
	const done = $derived(value(task, 'done'));
	const doneAt = $derived(value(task, 'doneAt'));
	const isAchieved = $derived(achieved || (bucket && done));
	// Looked up in the index made once per change: searching the records here, in every row, would
	// grow with the square of the list.
	const tags = $derived(
		(amber.index.tags.get(task.identifier) ?? []).filter((tag) => tag.identifier !== hideTag)
	);
	const steps = $derived(amber.index.steps.get(task.identifier) ?? []);
	const stepsDone = $derived(steps.filter((step) => value(step, 'done')).length);
	const category = $derived(showCategory ? categoryLabel(amber.records, task) : undefined);
	const hasNotes = $derived(value(task, 'notes').trim().length > 0);
	// Just achieved, it arrives on the shelf marked for a moment; one already there doesn't.
	// Read once, as the specimen appears: it's the arrival that's marked, not later changes.
	const fresh = untrack(() => achieved && Date.now() - (value(task, 'doneAt') ?? 0) < 3000);
	const menuIdentifier = $props.id();
	const meta = $derived(category || tags.length || steps.length || hasNotes || (done && doneAt));

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const controlsOf = (place: Element | null | undefined) =>
		place ? [...place.querySelectorAll<HTMLElement>('input, button')] : [];

	/**
	 * Moving can take the row out of the page and put it back, which drops focus to the top. It goes
	 * back to the same control in the moved row; from the menu on a touch screen, to its More button;
	 * and to the checkbox when that control is now off, at the top or the bottom of the list.
	 */
	async function move(direction: -1 | 1) {
		if ((direction === -1 && first) || (direction === 1 && last)) return;
		const self = row;
		const active = document.activeElement;
		const fromMenu = active instanceof HTMLElement && !!active.closest('[popover]');
		const place = active instanceof HTMLElement ? controlsOf(self).indexOf(active) : -1;
		self?.querySelector<HTMLElement>('[popover]')?.hidePopover();
		amber.act(direction === -1 ? 'Moved up' : 'Moved down', (context) =>
			moveTask(context, task, direction)
		);
		await tick();
		if (place === -1 || !self?.isConnected) return;
		const control = fromMenu
			? self.querySelector<HTMLElement>('[data-more]')
			: controlsOf(self)[place];
		const target =
			control && isShown(control) && !control.hasAttribute('disabled')
				? control
				: self.querySelector<HTMLElement>('input[type="checkbox"]');
		target?.focus();
	}

	let row: HTMLDivElement | undefined = $state();

	async function toggle(checked: boolean) {
		// Held here: Svelte clears `row` as soon as this row starts to leave.
		const self = row;
		const item = self?.closest('li');
		const neighbors = [item?.nextElementSibling, item?.previousElementSibling];
		const said = bucket
			? checked
				? `Achieved: ${title}`
				: `Not achieved: ${title}`
			: checked
				? `Done: ${title}`
				: `Not done: ${title}`;
		amber.act(said, (context) => setDone(context, task, checked));
		await tick();
		// Ticking can move the task (into Done, or back out). Focus follows it when it can still be
		// seen, and otherwise stays where the task was, on its neighbor, instead of being lost.
		const moved = [...document.querySelectorAll<HTMLElement>('[data-task]')].find(
			(other) => other !== self && other.dataset.task === task.identifier
		);
		if (!moved) return;
		const checkbox = (place: Element | null | undefined) =>
			place?.querySelector<HTMLInputElement>('input[type="checkbox"]');
		const target = [moved, ...neighbors].map(checkbox).find(isShown);
		(target ?? home())?.focus();
	}

	/**
	 * Deleted from the keyboard or the menu: focus goes to the same control on the next task, or the
	 * one before; from the menu, to that task's More button.
	 */
	async function remove(from: HTMLElement) {
		const item = row?.closest('li');
		const fromMenu = !!from.closest('[popover]');
		const place = Math.max(0, controlsOf(row).indexOf(from));
		const neighbors = [item?.nextElementSibling, item?.previousElementSibling].map((neighbor) =>
			fromMenu ? neighbor?.querySelector<HTMLElement>('[data-more]') : controlsOf(neighbor)[place]
		);
		row?.querySelector<HTMLElement>('[popover]')?.hidePopover();
		amber.act(`Deleted: ${title}`, (context) => deleteTask(context, task));
		await tick();
		// Not left to rescueFocus: the row slides away first, so focus isn't lost until it's gone.
		(neighbors.find(isShown) ?? home())?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		const target = event.target;
		if (event.ctrlKey || event.metaKey || event.shiftKey || !(target instanceof HTMLElement))
			return;
		if (event.altKey) {
			if (!movable || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
			event.preventDefault();
			void move(event.key === 'ArrowUp' ? -1 : 1);
		} else if (event.key === 'Delete') {
			// Delete only, not Backspace: Backspace is the key people press to correct a typo, and in a
			// list it would take a whole task with it.
			event.preventDefault();
			void remove(target);
		} else if (event.key === 'Enter' && target.matches('input[type="checkbox"]')) {
			// On the title, Enter already opens the task; on the checkbox it does the same, while Space
			// ticks it.
			event.preventDefault();
			onopen(task);
		}
	}

	const moveButton =
		'inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-text disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted';
	const menuItem =
		'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-base hover:bg-bg disabled:opacity-40 disabled:hover:bg-transparent';
</script>

<!-- A slip in its tray, ruled from the next; on the Achieved shelf, a specimen with its collection
     label: the dream in weight, and when it was achieved. One just achieved arrives with its edge
     drawn in the ticked color, fading to the usual one. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={row}
	data-task={task.identifier}
	class="group flex flex-wrap items-start gap-3 transition-colors motion-reduce:transition-none {achieved
		? `h-full rounded-md border border-control-border bg-surface p-4 ${fresh ? 'motion-safe:animate-achieved' : ''}`
		: 'px-3 py-3 hover:bg-border/50'}"
	{onkeydown}
>
	<!-- The task stays beside its checkbox; with large text, the move buttons wrap below instead.
	     The checkbox (28px), the title's first line (28px) and the buttons share one line's middle:
	     the buttons are taller, so they hang into the row's padding instead of pushing it open. -->
	<div class="flex min-w-0 flex-[1_1_12rem] items-start gap-3">
		<div>
			<Check
				ring={color ? EDGE[color] : undefined}
				checked={done}
				label={bucket
					? done
						? `Mark not achieved: ${title}`
						: `Mark achieved: ${title}`
					: done
						? `Mark not done: ${title}`
						: `Mark done: ${title}`}
				onchange={toggle}
			/>
		</div>
		<div class="min-w-0 flex-1">
			<button
				type="button"
				class="relative block w-full rounded-md text-left leading-7 break-words {touchTarget} {achieved
					? 'text-lg font-semibold'
					: isAchieved
						? 'text-base font-semibold'
						: done
							? 'text-base text-muted line-through decoration-1'
							: 'text-base'}"
				aria-describedby={meta ? `${menuIdentifier}-meta task-open-hint` : 'task-open-hint'}
				onclick={() => onopen(task)}
			>
				<!-- A found word keeps the strike-through of a done task's title. -->
				{#each highlight(title, words) as piece, index (index)}{#if piece.match}<mark
							class="rounded-sm bg-accent text-on-accent {done && !isAchieved
								? 'line-through decoration-1'
								: ''}">{piece.text}</mark
						>{:else}{piece.text}{/if}{/each}
			</button>
			<!-- Read with the title as its description, so moving through the list by arrow, which never
			     lands here, still says a task's date, tags, steps and notes. -->
			{#if meta}
				<div
					id="{menuIdentifier}-meta"
					class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted"
				>
					{#if done && doneAt}<span
							class={isAchieved ? 'rounded-sm border border-border px-1.5 py-0.5 text-text' : ''}
							>{isAchieved ? 'Achieved' : 'Done'} {dateFormat.format(doneAt)}</span
						>{/if}
					{#if category}<span>{category}</span>{/if}
					{#each tags as tag (tag.identifier)}
						{@const color = value(tag, 'color')}
						<span class="inline-flex items-center gap-1">
							{#if color}<span class="size-2 rounded-full {DOT[color]}" aria-hidden="true"
								></span>{/if}#{value(tag, 'name')}
						</span>
					{/each}
					{#if steps.length}
						<span class="inline-flex items-center gap-1"
							><Icon name="steps" class="size-3.5" /><span aria-hidden="true"
								>{stepsDone}/{steps.length}</span
							><span class="sr-only">{stepsDone} of {steps.length} steps done</span></span
						>
					{/if}
					{#if hasNotes}<span class="inline-flex items-center gap-1"
							><Icon name="notes" class="size-3.5" /><span class="sr-only">Has notes</span></span
						>{/if}
					<!-- A pause before the hint that follows it in the description. -->
					<span class="sr-only">.</span>
				</div>
			{/if}
		</div>
	</div>
	{#if movable}
		<!-- With a mouse, the move buttons beside the task, shown on hover or focus, and off at the ends
		     of the list. On a touch screen they'd crowd every row, so the moves and Delete are in one
		     More menu that names the task, as a step's are. -->
		<div
			class="-my-0.5 ml-auto flex shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:hidden"
		>
			<button
				type="button"
				class={moveButton}
				aria-label="Move up: {title}"
				disabled={first}
				onclick={() => void move(-1)}><Icon name="up" /></button
			>
			<button
				type="button"
				class={moveButton}
				aria-label="Move down: {title}"
				disabled={last}
				onclick={() => void move(1)}><Icon name="down" /></button
			>
		</div>
		<button
			type="button"
			data-more
			class="-my-2 -mr-1 ml-auto hidden size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-text pointer-coarse:inline-flex"
			aria-label="More: {title}"
			popovertarget={menuIdentifier}><Icon name="more" class="size-5 stroke-[3.5]" /></button
		>
		<div
			id={menuIdentifier}
			popover
			class="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-2 text-text shadow-2xl backdrop:bg-black/40"
		>
			<p class="truncate px-3 pt-1 pb-2 text-sm text-muted">{title}</p>
			<button type="button" class={menuItem} disabled={first} onclick={() => void move(-1)}
				><Icon name="up" /> Move up</button
			>
			<button type="button" class={menuItem} disabled={last} onclick={() => void move(1)}
				><Icon name="down" /> Move down</button
			>
			<button type="button" class={menuItem} onclick={(event) => void remove(event.currentTarget)}
				><Icon name="trash" /> Delete task</button
			>
		</div>
	{/if}
</div>
