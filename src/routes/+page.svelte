<script lang="ts">
	import { onMount, tick } from 'svelte';
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
	import { install, type Way } from '#lib/install.svelte.js';
	import { updates } from '#lib/updates.svelte.js';
	import { isSearching, parseSearch, STATUSES, type Status } from '#lib/search.js';
	import { isLink, type Source } from '#lib/links.js';
	import { foundCount, sectionsFor, type View } from '#lib/views.js';

	let view = $state<View>({ kind: 'all' });
	let openTask = $state<string | undefined>();
	let openCategory = $state<string | undefined>();
	let openTag = $state<string | undefined>();
	let listsOpen = $state(false);
	let backupOpen = $state(false);
	let bringing = $state<Source>();
	let installSteps = $state<Way>();
	// The sheets for backing up, bringing in and installing load the first time they're opened:
	// most visits never need them, or the code they bring (compression, encryption). Once loaded
	// they stay, so closing one returns focus where it was, as a dialog should.
	let loaded = $state({ backup: false, bringIn: false, install: false });
	$effect(() => {
		if (backupOpen) loaded.backup = true;
		if (bringing) loaded.bringIn = true;
		if (installSteps) loaded.install = true;
	});
	let newTask = $state('');
	let quickAdd: HTMLInputElement | undefined = $state();
	let query = $state('');
	let status = $state<Status>('any');
	let searchField: HTMLInputElement | undefined = $state();

	onMount(() => {
		void amber.open();
		updates.watch();
		install.watch();
	});

	function offerInstall() {
		listsOpen = false;
		if (install.offered === 'prompt') void install.ask();
		else installSteps = install.offered;
	}

	// A link to a list carries it after the `#`. It's taken from the address at once, so it isn't
	// left in the history or bookmarked by accident, and then offered to bring in.
	function takeLink() {
		if (!isLink(location.hash)) return;
		bringing = { link: location.hash };
		history.replaceState(history.state, '', location.pathname + location.search);
	}

	$effect(() => {
		if (amber.ready) takeLink();
	});

	// A place that's been deleted (on this device, or by an undo) falls back to everything.
	$effect(() => {
		if (!amber.ready) return;
		if (view.kind === 'category' && !get(amber.records, view.identifier, 'category'))
			view = { kind: 'all' };
		if (view.kind === 'tag' && !get(amber.records, view.identifier, 'tag')) view = { kind: 'all' };
	});

	const search = $derived(parseSearch(query, status));
	const searching = $derived(isSearching(search));
	const sections = $derived(amber.ready ? sectionsFor(amber.records, view, search) : []);
	const found = $derived(
		searching ? sections.reduce((sum, section) => sum + section.shown.length, 0) : 0
	);
	// Matches the current place hides: offered as a way to search everything instead.
	const elsewhere = $derived(
		searching && view.kind !== 'all'
			? foundCount(amber.records, { kind: 'all' }, search) - found
			: 0
	);
	const tasksWord = (count: number) => (count === 1 ? 'task' : 'tasks');
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
			if (searching) query = '';
			// Quick add is back once the search is cleared and the page has updated.
			void tick().then(() => quickAdd?.focus());
		} else if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
			event.preventDefault();
			searchField?.focus();
		}
	}

	const openDetails = (task: Task) => (openTask = task.identifier);
</script>

<svelte:window {onkeydown} onhashchange={() => amber.ready && takeLink()} />

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
		<search class="ml-auto min-w-0 flex-1 sm:max-w-xs">
			<label for="search" class="sr-only">Search tasks</label>
			<div class="relative">
				<Icon
					name="search"
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
				/>
				<input
					id="search"
					type="search"
					bind:this={searchField}
					bind:value={query}
					class="{field} pr-10 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
					placeholder="Search"
					autocomplete="off"
					enterkeyhint="search"
					disabled={!amber.ready}
					onkeydown={(event) => {
						if (event.key === 'Escape' && query) {
							event.preventDefault();
							query = '';
						}
					}}
				/>
				{#if query}
					<button
						type="button"
						class="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text"
						aria-label="Clear search"
						onclick={() => {
							query = '';
							searchField?.focus();
						}}><Icon name="close" /></button
					>
				{/if}
			</div>
		</search>
		<a
			href={MAIN_SITE_URL}
			rel="external"
			class="hidden shrink-0 text-sm text-muted transition-colors hover:text-text sm:block"
			>by Itrium</a
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
					onbackup={() => (backupOpen = true)}
					oninstall={offerInstall}
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

			<!-- Always there, so screen readers hear the offer when it appears. -->
			<div role="status">
				{#if updates.ready}
					<div
						class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface p-3 text-sm"
						transition:slide={{ duration }}
					>
						<p>A new version of Amber is ready.</p>
						<button
							type="button"
							class="min-h-9 rounded-full bg-accent px-4 font-semibold text-on-accent hover:opacity-85"
							onclick={() => updates.apply()}>Update</button
						>
					</div>
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

			{#if searching}
				<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
					<fieldset class="flex rounded-full border border-control-border p-0.5">
						<legend class="sr-only">Show</legend>
						{#each STATUSES as choice (choice.status)}
							<label class="relative cursor-pointer">
								<input
									type="radio"
									name="status"
									value={choice.status}
									bind:group={status}
									class="peer sr-only"
								/>
								<span
									class="peer-focus-visible:outline-focus flex min-h-9 items-center rounded-full px-4 text-sm transition-colors peer-checked:bg-text peer-checked:font-semibold peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 motion-reduce:transition-none"
									>{choice.label}</span
								>
							</label>
						{/each}
					</fieldset>
					{#if elsewhere > 0}
						<button
							type="button"
							class="min-h-9 rounded-full px-3 text-sm underline underline-offset-4 hover:bg-surface"
							onclick={() => select({ kind: 'all' })}>{elsewhere} more in all tasks</button
						>
					{/if}
				</div>
			{:else}
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
			{/if}
			<!-- Said aloud as results change; empty while not searching. -->
			<p class="sr-only" role="status">
				{searching ? `${found} ${tasksWord(found)} found` : ''}
			</p>

			{#if amber.ready}
				{#if isEmpty}
					<p class="mt-10 text-center text-muted" in:fade={{ duration }}>
						{#if searching}
							No {status === 'any' ? '' : `${status} `}tasks match “{query.trim()}”{view.kind ===
							'all'
								? ''
								: ` in ${heading}`}.
						{:else if view.kind === 'all'}
							Nothing here yet. Add your first task above.
							{#if install.installed && install.apple}
								<span class="mt-2 block text-sm">
									Have a list in Safari? Make a link there in Back up and move, and paste it in
									here.
								</span>
							{/if}
						{:else}
							Nothing here yet.
						{/if}
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
								{#if searching}<span class="font-normal text-muted">{section.shown.length}</span
									>{/if}
							</h2>
							<ul>
								{#each section.shown as task (task.identifier)}
									<li animate:flip={{ duration }} transition:slide={{ duration }}>
										<TaskRow
											{task}
											showCategory={view.kind === 'tag'}
											words={search.words}
											movable={!searching}
											onopen={openDetails}
										/>
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
			onbackup={() => {
				listsOpen = false;
				backupOpen = true;
			}}
			oninstall={offerInstall}
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
{#if loaded.backup}
	{#await import('#lib/components/BackupSheet.svelte') then { default: BackupSheet }}
		<BackupSheet
			open={backupOpen}
			onclose={() => (backupOpen = false)}
			onfile={(file) => {
				backupOpen = false;
				bringing = { file };
			}}
			onlink={(link) => {
				backupOpen = false;
				bringing = { link };
			}}
		/>
	{/await}
{/if}
{#if loaded.install}
	{#await import('#lib/components/InstallSheet.svelte') then { default: InstallSheet }}
		<InstallSheet
			way={installSteps}
			onclose={() => (installSteps = undefined)}
			onbackup={() => {
				installSteps = undefined;
				backupOpen = true;
			}}
		/>
	{/await}
{/if}
{#if loaded.bringIn}
	{#await import('#lib/components/BringInSheet.svelte') then { default: BringInSheet }}
		<BringInSheet source={bringing} onclose={() => (bringing = undefined)} />
	{/await}
{/if}
<Notice />
