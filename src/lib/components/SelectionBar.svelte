<!-- What can be done to several tasks at once: tick them, move them to a category, or delete them.
     Each is one change, with one Undo for all of them. The bar floats at the bottom of the screen
     while tasks are being selected; the message with Undo waits until it's gone, then says what
     was done. -->
<script lang="ts">
	import { untrack } from 'svelte';
	import { amber } from '#lib/amber.svelte.js';
	import { deleteTask, setCategory, setDone, shownCategory } from '#lib/model/actions.js';
	import { categoryTree, get, value, type Task } from '#lib/model/list.js';
	import type { Context, Change } from '#lib/model/list.js';
	import { noticePlace } from '#lib/notice.svelte.js';
	import { smallButton } from '#lib/styles.js';

	let {
		selected,
		onselectall,
		onfinish
	}: {
		selected: string[];
		onselectall: () => void;
		/** Selecting is over: after an action, or Cancel. */
		onfinish: () => void;
	} = $props();

	const prefix = $props.id();
	const tasks = $derived(
		selected.map((identifier) => get(amber.records, identifier, 'task')).filter((task) => !!task)
	);
	const tree = $derived(categoryTree(amber.records));
	const tasksWord = (count: number) => (count === 1 ? 'task' : 'tasks');
	// When every chosen task is in a bucket list, ticking them is achieving them, said as it is when
	// one is ticked.
	const allDreams = $derived(
		tasks.length > 0 &&
			tasks.every((task) => {
				const place = shownCategory(amber.records, task);
				const category = place ? get(amber.records, place, 'category') : undefined;
				return category ? value(category, 'keepDone') : false;
			})
	);

	$effect(() => {
		untrack(() => noticePlace.opened('selection'));
		return () => noticePlace.closed('selection');
	});

	async function remove() {
		const chosen = tasks;
		if (!chosen.length) return;
		// Several at once is a lot at once: a copy is kept first, as the Back up sheet promises.
		if (chosen.length > 1) await amber.keepCopy(`Before deleting ${chosen.length} tasks`);
		act(`Deleted ${chosen.length} ${tasksWord(chosen.length)}`, (context, task) =>
			deleteTask(context, task)
		);
	}

	function act(message: string, change: (context: Context, task: Task) => Change[]) {
		const chosen = tasks;
		if (!chosen.length) return;
		amber.act(message, (context) => chosen.flatMap((task) => change(context, task)));
		onfinish();
	}

	function moveTo(place: string) {
		const category = place === 'none' ? undefined : get(amber.records, place, 'category');
		const name = category ? value(category, 'name') : 'No category';
		act(`Moved ${tasks.length} ${tasksWord(tasks.length)} to ${name}`, (context, task) =>
			setCategory(context, task, category ? category.identifier : null)
		);
	}
</script>

<div
	role="group"
	aria-label="Selected tasks"
	class="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-[min(40rem,calc(100%-2rem))] flex-wrap items-center gap-2 rounded-lg border border-control-border bg-surface p-2 pl-4 text-sm shadow-lg"
>
	<p class="mr-auto font-medium" role="status">{tasks.length} selected</p>
	<button type="button" class={smallButton} onclick={onselectall}>Select all</button>
	<button
		type="button"
		class={smallButton}
		disabled={!tasks.length}
		onclick={() =>
			act(
				allDreams ? `Marked ${tasks.length} achieved` : `Marked ${tasks.length} done`,
				(context, task) => setDone(context, task, true)
			)}>{allDreams ? 'Mark achieved' : 'Mark done'}</button
	>
	<label for="{prefix}-move" class="sr-only">Move to a category</label>
	<select
		id="{prefix}-move"
		class="{smallButton} cursor-pointer bg-surface"
		disabled={!tasks.length}
		value=""
		onchange={(event) => moveTo(event.currentTarget.value)}
	>
		<option value="" disabled>Move to…</option>
		<option value="none">No category</option>
		<!-- Not into a locked list: moving several at once can't seal them on the way. One task's
		     sheet can, with the list open. -->
		{#each tree as { category, children } (category.identifier)}
			{#if !value(category, 'lock')}
				<option value={category.identifier}>{value(category, 'name')}</option>
			{/if}
			{#each children as child (child.identifier)}
				{#if !value(child, 'lock')}
					<option value={child.identifier}
						>{value(category, 'name')} › {value(child, 'name')}</option
					>
				{/if}
			{/each}
		{/each}
	</select>
	<button type="button" class={smallButton} disabled={!tasks.length} onclick={() => void remove()}
		>Delete</button
	>
	<button type="button" class={smallButton} onclick={onfinish}>Cancel</button>
</div>
