<!-- One task in the list. Ticking it, opening it and moving it are all here; Alt with the up or down
     arrow moves it from the keyboard, wherever focus is in the row. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { DOT } from '#lib/colors.js';
	import { moveTask, setDone } from '#lib/model/actions.js';
	import { stepsOf, tagsOf, value, type Task } from '#lib/model/list.js';
	import { categoryLabel } from '#lib/views.js';
	import Check from './Check.svelte';
	import Icon from './Icon.svelte';

	let {
		task,
		showCategory = false,
		onopen
	}: { task: Task; showCategory?: boolean; onopen: (task: Task) => void } = $props();

	const title = $derived(value(task, 'title'));
	const done = $derived(value(task, 'done'));
	const doneAt = $derived(value(task, 'doneAt'));
	const tags = $derived(tagsOf(amber.records, task.identifier));
	const steps = $derived(stepsOf(amber.records, task.identifier));
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

	function toggle(checked: boolean) {
		amber.act(checked ? `Done: ${title}` : `Not done: ${title}`, (context) =>
			setDone(context, task, checked)
		);
	}

	function onkeydown(event: KeyboardEvent) {
		if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
		event.preventDefault();
		move(event.key === 'ArrowUp' ? -1 : 1);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface"
	{onkeydown}
>
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
			class="block w-full rounded-md text-left text-base leading-7 break-words {done
				? 'text-muted line-through decoration-1'
				: ''}"
			onclick={() => onopen(task)}
		>
			{title}<span class="sr-only">. Open details</span>
		</button>
		{#if category || tags.length || steps.length || hasNotes || (done && doneAt)}
			<div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
				{#if done && doneAt}<span>Done {dateFormat.format(doneAt)}</span>{/if}
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
						><Icon name="steps" class="size-3.5" />{stepsDone}/{steps.length}<span class="sr-only">
							steps done</span
						></span
					>
				{/if}
				{#if hasNotes}<span class="inline-flex items-center gap-1"
						><Icon name="notes" class="size-3.5" /><span class="sr-only">Has notes</span></span
					>{/if}
			</div>
		{/if}
	</div>
	<div
		class="flex shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100"
	>
		<button
			type="button"
			class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
			aria-label="Move up: {title}"
			onclick={() => move(-1)}><Icon name="up" /></button
		>
		<button
			type="button"
			class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
			aria-label="Move down: {title}"
			onclick={() => move(1)}><Icon name="down" /></button
		>
	</div>
</div>
