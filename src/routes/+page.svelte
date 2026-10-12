<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import { amber } from '#lib/amber.svelte.js';
	import { DOT, EDGE } from '#lib/colors.js';
	import CategoryEditor from '#lib/components/CategoryEditor.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Notice from '#lib/components/Notice.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import TagEditor from '#lib/components/TagEditor.svelte';
	import TaskDetails from '#lib/components/TaskDetails.svelte';
	import TaskRow from '#lib/components/TaskRow.svelte';
	import Seo from '#lib/Seo.svelte';
	import {
		DESCRIPTION,
		FOOTNOTE,
		MAIN_SITE_URL,
		PROMISE,
		PROMISE_DETAIL,
		SOURCE_URL,
		STORAGE_NOTE,
		TITLE
	} from '#lib/content.js';
	import { addTask, tagByName } from '#lib/model/actions.js';
	import { get, value, LIMITS, type Task } from '#lib/model/list.js';
	import { field } from '#lib/styles.js';
	import { sectionsFor, type View } from '#lib/views.js';

	let view = $state<View>({ kind: 'all' });
	let openTask = $state<string | undefined>();
	let openCategory = $state<string | undefined>();
	let openTag = $state<string | undefined>();
	let listsOpen = $state(false);
	let newTask = $state('');
	let quickAdd: HTMLInputElement | undefined = $state();

	onMount(() => {
		void amber.open();
	});

	// A place that's been deleted (on this device, or by an undo) falls back to everything.
	$effect(() => {
		if (!amber.ready) return;
		if (view.kind === 'category' && !get(amber.records, view.identifier, 'category'))
			view = { kind: 'all' };
		if (view.kind === 'tag' && !get(amber.records, view.identifier, 'tag')) view = { kind: 'all' };
	});

	const sections = $derived(amber.ready ? sectionsFor(amber.records, view) : []);
	const heading = $derived.by(() => {
		if (view.kind === 'all') return 'All tasks';
		if (view.kind === 'uncategorized') return 'No category';
		if (view.kind === 'tag') {
			const tag = get(amber.records, view.identifier, 'tag');
			return tag ? `#${value(tag, 'name')}` : 'All tasks';
		}
		const category = get(amber.records, view.identifier, 'category');
		return category ? value(category, 'name') : 'All tasks';
	});
	const target = $derived(view.kind === 'category' ? view.identifier : null);
	const isEmpty = $derived(
		sections.every((section) => !section.shown.length && !section.done.length)
	);
	const duration = $derived(amber.reducedMotion ? 0 : 200);

	function select(next: View) {
		view = next;
		listsOpen = false;
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		const tagView = view.kind === 'tag' ? get(amber.records, view.identifier, 'tag') : undefined;
		const added = amber.act('Task added', (context) => {
			const result = addTask(context, newTask, target);
			if (result && tagView)
				result.changes.push(...tagByName(context, result.task, [value(tagView, 'name')]));
			return result;
		});
		if (added) newTask = '';
	}

	function isTyping(element: EventTarget | null) {
		return (
			element instanceof HTMLElement &&
			(element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
		);
	}

	function onkeydown(event: KeyboardEvent) {
		if (isTyping(event.target) || document.querySelector('dialog[open]')) return;
		if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
			event.preventDefault();
			amber.undo();
		} else if (event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
			event.preventDefault();
			quickAdd?.focus();
		}
	}

	const openDetails = (task: Task) => (openTask = task.identifier);
</script>

<svelte:window {onkeydown} />

<Seo title={TITLE} description={DESCRIPTION} path="/" />

<div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
	<header class="flex items-center justify-between gap-4 py-5">
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="inline-flex size-10 items-center justify-center rounded-lg border border-control-border md:hidden"
				aria-label="Show lists"
				onclick={() => (listsOpen = true)}
			>
				<Icon name="menu" class="size-5" />
			</button>
			<p class="text-xl font-bold tracking-tight">Amber</p>
		</div>
		<a
			href={MAIN_SITE_URL}
			rel="external"
			class="text-sm text-muted transition-colors hover:text-text">by Itrium</a
		>
	</header>

	<div class="grid flex-1 gap-8 md:grid-cols-[15rem_1fr]">
		<aside class="hidden md:block">
			{#if amber.ready}
				<Sidebar
					{view}
					onselect={select}
					oneditcategory={(identifier) => (openCategory = identifier)}
					onedittag={(identifier) => (openTag = identifier)}
				/>
			{/if}
		</aside>

		<main id="main" class="min-w-0 pb-32">
			<div class="flex items-center gap-3">
				<h1 class="min-w-0 truncate text-3xl font-bold tracking-tight">{heading}</h1>
				{#if view.kind === 'category'}
					<button
						type="button"
						class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-text"
						aria-label="Edit {heading}"
						onclick={() => view.kind === 'category' && (openCategory = view.identifier)}
					>
						<Icon name="edit" />
					</button>
				{/if}
			</div>

			{#if amber.problem}
				<p
					class="mt-4 rounded-lg border-l-4 border-accent-edge bg-surface p-3 text-sm"
					role="alert"
				>
					{amber.problem}
				</p>
			{/if}

			<form class="mt-5" onsubmit={add}>
				<label for="quick-add" class="sr-only">New task</label>
				<div class="flex gap-2">
					<input
						id="quick-add"
						bind:this={quickAdd}
						bind:value={newTask}
						class="{field} py-3 text-base"
						placeholder="Add a task. #words become tags"
						maxlength={LIMITS.title + 200}
						autocomplete="off"
						disabled={!amber.ready || amber.readOnly}
					/>
					<button
						type="submit"
						class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-opacity hover:opacity-85 disabled:opacity-50"
						disabled={!newTask.trim()}
					>
						<Icon name="plus" /> Add
					</button>
				</div>
			</form>

			{#if amber.ready}
				{#if isEmpty}
					<p class="mt-10 text-center text-muted" in:fade={{ duration }}>
						{view.kind === 'all'
							? 'Nothing here yet. Add your first task above.'
							: 'Nothing here yet.'}
					</p>
				{/if}

				{#each sections as section (section.key)}
					{#if section.shown.length || section.done.length}
						<section class="mt-8" aria-labelledby="section-{section.key}">
							<h2
								id="section-{section.key}"
								class="mb-2 flex items-center gap-2 border-l-2 pl-3 text-sm font-semibold {section.color
									? EDGE[section.color]
									: 'border-border'} {sections.length > 1 ? '' : 'sr-only'}"
							>
								{#if section.color}<span
										class="size-2.5 rounded-full {DOT[section.color]}"
										aria-hidden="true"
									></span>{/if}
								{section.title}
							</h2>
							<ul>
								{#each section.shown as task (task.identifier)}
									<li animate:flip={{ duration }} transition:slide={{ duration }}>
										<TaskRow {task} showCategory={view.kind === 'tag'} onopen={openDetails} />
									</li>
								{/each}
							</ul>
							{#if section.done.length}
								<details class="group mt-2">
									<summary
										class="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm text-muted hover:bg-surface hover:text-text"
									>
										<Icon
											name="down"
											class="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
										/>
										Done ({section.done.length})
									</summary>
									<ul class="mt-1">
										{#each section.done as task (task.identifier)}
											<li transition:slide={{ duration }}>
												<TaskRow {task} onopen={openDetails} />
											</li>
										{/each}
									</ul>
								</details>
							{/if}
						</section>
					{/if}
				{/each}
			{/if}
		</main>
	</div>

	<!-- Room at the bottom so the message with Undo never covers the footer's link. -->
	<footer class="mt-auto border-t border-border pt-8 pb-24 text-sm text-muted">
		<p class="font-medium text-text">{PROMISE}</p>
		<p class="mt-1">{PROMISE_DETAIL} {STORAGE_NOTE}</p>
		<p class="mt-4">
			{FOOTNOTE}
			<a href={SOURCE_URL} rel="external" class="underline underline-offset-4 hover:text-text"
				>The source</a
			>.
		</p>
	</footer>
</div>

<Sheet open={listsOpen} title="Lists" onclose={() => (listsOpen = false)}>
	{#if amber.ready}
		<Sidebar
			{view}
			onselect={select}
			oneditcategory={(identifier) => {
				listsOpen = false;
				openCategory = identifier;
			}}
			onedittag={(identifier) => {
				listsOpen = false;
				openTag = identifier;
			}}
		/>
	{/if}
</Sheet>

<TaskDetails identifier={openTask} onclose={() => (openTask = undefined)} />
<CategoryEditor
	identifier={openCategory}
	onclose={() => (openCategory = undefined)}
	onopen={(identifier) => (view = { kind: 'category', identifier })}
/>
<TagEditor identifier={openTag} onclose={() => (openTag = undefined)} />
<Notice />
