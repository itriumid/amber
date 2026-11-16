<!-- One task in the list. Ticking it, opening it and moving it are all here. From the keyboard,
     wherever focus is in the row: Alt with the up or down arrow moves it, Enter opens it, and Delete
     deletes it, with Undo. In search results the words found are marked, and moving is off: with
     tasks hidden in between, a move wouldn't show. Going from row to row is in roving.ts. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { DOT } from '#lib/colors.js';
	import { categoryLabel, deleteTask, moveTask, setDone } from '#lib/model/actions.js';
	import { value, type Task } from '#lib/model/list.js';
	import { tick } from 'svelte';
	import { isShown } from '#lib/focus.js';
	import { highlight } from '#lib/search.js';
	import Check from './Check.svelte';
	import Icon from './Icon.svelte';
	import { touchTarget } from '#lib/styles.js';

	let {
		task,
		showCategory = false,
		words = [],
		movable = true,
		achieved = false,
		onopen
	}: {
		task: Task;
		showCategory?: boolean;
		/** Search words to mark in the title. */
		words?: string[];
		movable?: boolean;
		/** On a bucket list's Achieved shelf: done, said as achieved. */
		achieved?: boolean;
		onopen: (task: Task) => void;
	} = $props();

	const title = $derived(value(task, 'title'));
	const done = $derived(value(task, 'done'));
	const doneAt = $derived(value(task, 'doneAt'));
	// Looked up in the index made once per change: searching the records here, in every row, would
	// grow with the square of the list.
	const tags = $derived(amber.index.tags.get(task.identifier) ?? []);
	const steps = $derived(amber.index.steps.get(task.identifier) ?? []);
	const stepsDone = $derived(steps.filter((step) => value(step, 'done')).length);
	const category = $derived(showCategory ? categoryLabel(amber.records, task) : undefined);
	const hasNotes = $derived(value(task, 'notes').trim().length > 0);

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	function move(direction: -1 | 1) {
		amber.act(direction === -1 ? 'Moved up' : 'Moved down', (context) =>
			moveTask(context, task, direction)
		);
	}

	let row: HTMLDivElement | undefined = $state();

	async function toggle(checked: boolean) {
		// Held here: Svelte clears `row` as soon as this row starts to leave.
		const self = row;
		const item = self?.closest('li');
		const neighbors = [item?.nextElementSibling, item?.previousElementSibling];
		amber.act(checked ? `Done: ${title}` : `Not done: ${title}`, (context) =>
			setDone(context, task, checked)
		);
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
		(target ?? document.getElementById('quick-add'))?.focus();
	}

	/** Deleted from the keyboard: focus goes to the same control on the next task, or the one before. */
	async function remove(from: HTMLElement) {
		const item = row?.closest('li');
		const controls = row ? [...row.querySelectorAll<HTMLElement>('input, button')] : [];
		const place = Math.max(0, controls.indexOf(from));
		const neighbors = [item?.nextElementSibling, item?.previousElementSibling].map(
			(neighbor) => neighbor?.querySelectorAll<HTMLElement>('input, button')[place]
		);
		amber.act(`Deleted: ${title}`, (context) => deleteTask(context, task));
		await tick();
		// Not left to rescueFocus: the row slides away first, so focus isn't lost until it's gone.
		(neighbors.find(isShown) ?? document.getElementById('quick-add'))?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		const target = event.target;
		if (event.ctrlKey || event.metaKey || event.shiftKey || !(target instanceof HTMLElement))
			return;
		if (event.altKey) {
			if (!movable || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
			event.preventDefault();
			move(event.key === 'ArrowUp' ? -1 : 1);
		} else if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			void remove(target);
		} else if (event.key === 'Enter' && target.matches('input[type="checkbox"]')) {
			// On the title, Enter already opens the task; on the checkbox it does the same, while Space
			// ticks it.
			event.preventDefault();
			onopen(task);
		}
	}
</script>

<!-- Hovered, the row shows as a card, with an edge: on the light page, white alone barely shows. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={row}
	data-task={task.identifier}
	class="group flex flex-wrap items-start gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-surface motion-reduce:transition-none"
	{onkeydown}
>
	<!-- The task stays beside its checkbox; with large text, the move buttons wrap below instead. -->
	<div class="flex min-w-0 flex-[1_1_12rem] items-start gap-3">
		<div class="pt-0.5">
			<Check
				checked={done}
				label={done ? `Mark not done: ${title}` : `Mark done: ${title}`}
				onchange={toggle}
			/>
		</div>
		<div class="min-w-0 flex-1">
			<button
				type="button"
				class="relative block w-full rounded-md text-left text-base leading-7 break-words {touchTarget} {done
					? 'text-muted line-through decoration-1'
					: ''}"
				aria-describedby="task-open-hint"
				onclick={() => onopen(task)}
			>
				{#each highlight(title, words) as piece, index (index)}{#if piece.match}<mark
							class="rounded-sm bg-accent text-on-accent">{piece.text}</mark
						>{:else}{piece.text}{/if}{/each}
			</button>
			{#if category || tags.length || steps.length || hasNotes || (done && doneAt)}
				<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
					{#if done && doneAt}<span
							>{achieved ? 'Achieved' : 'Done'} {dateFormat.format(doneAt)}</span
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
				</div>
			{/if}
		</div>
	</div>
	{#if movable}
		<div
			class="ml-auto flex shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
		>
			<button
				type="button"
				class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text pointer-coarse:size-11"
				aria-label="Move up: {title}"
				onclick={() => move(-1)}><Icon name="up" /></button
			>
			<button
				type="button"
				class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text pointer-coarse:size-11"
				aria-label="Move down: {title}"
				onclick={() => move(1)}><Icon name="down" /></button
			>
		</div>
	{/if}
</div>
