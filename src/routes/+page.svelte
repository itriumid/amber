<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { crossfade, fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { amber } from '#lib/amber.svelte.js';
	import { DOT, PLATE } from '#lib/colors.js';
	import CategoryEditor from '#lib/components/CategoryEditor.svelte';
	import LockSheet from '#lib/components/LockSheet.svelte';
	import UnlockSheet from '#lib/components/UnlockSheet.svelte';
	import { locks } from '#lib/locks.svelte.js';
	import Icon from '#lib/components/Icon.svelte';
	import Notice from '#lib/components/Notice.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import ShortcutsSheet from '#lib/components/ShortcutsSheet.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import TagEditor from '#lib/components/TagEditor.svelte';
	import TaskDetails from '#lib/components/TaskDetails.svelte';
	import TaskRow from '#lib/components/TaskRow.svelte';
	import Seo from '#lib/Seo.svelte';
	import {
		backupReminder,
		DESCRIPTION,
		DOWNLOAD_COPY,
		FOOTNOTE,
		MAIN_SITE_URL,
		NOT_NOW,
		PROMISE,
		PROMISE_DETAIL,
		SOURCE_URL,
		STORAGE_NOTE,
		SYNC_NOTE,
		TITLE
	} from '#lib/content.js';
	import {
		addTask,
		categoryMention,
		isLockedList,
		placeTask,
		tagByName
	} from '#lib/model/actions.js';
	import { sortable } from '#lib/sortable.js';
	import SelectionBar from '#lib/components/SelectionBar.svelte';
	import { categoryTree, get, tags as allTags, value, LIMITS, type Task } from '#lib/model/list.js';
	import { field, labelPlate, labelShape, smallButton, touchTarget, tray } from '#lib/styles.js';
	import { backups } from '#lib/backups.svelte.js';
	import { home, rescueFocus } from '#lib/focus.js';
	import { roving } from '#lib/roving.js';
	import { settings } from '#lib/settings.svelte.js';
	import { install, type Way } from '#lib/install.svelte.js';
	import { updates } from '#lib/updates.svelte.js';
	import { isSearching, parseSearch, STATUSES, type Status } from '#lib/search.js';
	import { isLink, SYNC_PREFIX, type Source } from '#lib/links.js';
	import { foundCount, sectionsFor, type View } from '#lib/views.js';

	let view = $state<View>({ kind: 'all' });
	let openTask = $state<string | undefined>();
	let openCategory = $state<string | undefined>();
	let openTag = $state<string | undefined>();
	let listsOpen = $state(false);
	let backupOpen = $state(false);
	let shortcutsOpen = $state(false);
	let syncOpen = $state(false);
	let syncCode = $state<string>();
	let bringing = $state<Source>();
	let installSteps = $state<Way>();
	// Locked lists: the one being locked (or the name of a new one), and the one being opened.
	let locking = $state<string>();
	let lockingNew = $state<string>();
	let unlocking = $state<string>();
	// What open locked lists say, opened again whenever the list changes.
	$effect(() => {
		if (amber.ready) void locks.refresh(amber.records);
	});
	// The sheets for syncing, backing up, bringing in and installing load the first time they're opened:
	// most visits never need them, or the code they bring (compression, encryption). Once loaded
	// they stay, so closing one returns focus where it was, as a dialog should.
	let loaded = $state({ sync: false, backup: false, bringIn: false, install: false });
	$effect(() => {
		if (syncOpen) loaded.sync = true;
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
		void settings.load();
		void amber.open().then(() => backups.load(amber.taskCount));
		updates.watch();
		install.watch();
	});

	function openSync() {
		listsOpen = false;
		syncCode = undefined;
		syncOpen = true;
	}

	function offerInstall() {
		listsOpen = false;
		if (install.offered === 'prompt') void install.ask();
		else installSteps = install.offered;
	}

	// A link to a list carries it after the `#`, and a link to sync carries a code. Either is taken
	// from the address at once, so it isn't left in the history or bookmarked by accident; then the
	// list is offered to bring in, or the sync starts.
	function takeLink() {
		const hash = location.hash;
		if (isLink(hash)) bringing = { link: hash };
		else if (hash.startsWith(SYNC_PREFIX)) {
			syncCode = hash.slice(SYNC_PREFIX.length);
			syncOpen = true;
		} else return;
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
	// In a locked list, quick add seals what it adds, and needs the list open.
	const targetLocked = $derived(amber.ready && isLockedList(amber.records, target));
	const targetOpen = $derived(targetLocked && locks.isOpen(target));
	// A locked list in its own place shows even when it's empty: that's where it's opened.
	const isShownSection = (section: (typeof sections)[number]) =>
		section.shown.length > 0 ||
		section.done.length > 0 ||
		(section.locked && view.kind === 'category' && !searching);
	const isEmpty = $derived(!sections.some(isShownSection));
	const duration = $derived(amber.reducedMotion ? 0 : 200);
	// The signature move: on a bucket list, a ticked dream is carried from the tray onto the
	// Achieved shelf (and back), so where it went is seen, not guessed. Everything else slides.
	const [send, receive] = crossfade({
		duration: () => (amber.reducedMotion ? 0 : 450),
		easing: cubicOut,
		fallback: (node) => slide(node, { duration: amber.reducedMotion ? 0 : 200 })
	});
	type Carried = { key: string; bucket: boolean };
	const arrive = (node: Element, { key, bucket }: Carried) =>
		bucket ? receive(node, { key }) : slide(node, { duration });
	const leave = (node: Element, { key, bucket }: Carried) =>
		bucket ? send(node, { key }) : slide(node, { duration });
	const hasTags = $derived(allTags(amber.records).length > 0);

	// Now and then, a reminder to download a copy: the copies kept here go if the browser's data is
	// cleared. Not over a problem, which has its own way forward.
	const backupDue = $derived(
		amber.ready && !amber.problem && !amber.readOnly && backups.isDue(amber.taskCount)
	);
	const lastDownloaded = $derived(
		backups.note?.downloadedAt
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(backups.note.downloadedAt)
			: undefined
	);

	/** The reminder goes once answered; focus, which was on its button, stays nearby. */
	async function answerReminder(download: boolean) {
		if (download) await amber.downloadCopy();
		else backups.dismiss(amber.taskCount);
		await tick();
		rescueFocus();
	}

	function select(next: View) {
		view = next;
		listsOpen = false;
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		// Inside a locked list, # and @ are off: what's typed is the title, sealed as it's added.
		if (targetLocked) {
			if (!targetOpen || !target) return;
			const title = newTask;
			newTask = '';
			void locks.addTask(target, title);
			return;
		}
		const tagView = view.kind === 'tag' ? get(amber.records, view.identifier, 'tag') : undefined;
		// Named with @, the task goes to that category, which may not be the one in view: it's said
		// where, so a task that leaves the screen isn't a task that vanished.
		const mention = categoryMention(amber.records, newTask);
		const mentioned = mention
			? get(amber.records, mention.categoryIdentifier, 'category')
			: undefined;
		// Into a locked list from elsewhere: sealed if it's open, and otherwise it asks to open it
		// first, keeping what was typed.
		if (mentioned && value(mentioned, 'lock')) {
			if (!locks.isOpen(mentioned.identifier)) {
				amber.notice = {
					message: `Open ${value(mentioned, 'name')} first, to add to it`,
					changes: []
				};
				unlocking = mentioned.identifier;
				return;
			}
			const title = mention!.text;
			newTask = '';
			void locks.addTask(mentioned.identifier, title);
			return;
		}
		// An @ that names no category stays in the title; it's said, so a typo isn't missed.
		const unknown = mention ? undefined : newTask.match(/(?:^|\s)@([\p{L}\p{N}_-]+)/u)?.[1];
		const said =
			mentioned && mention?.categoryIdentifier !== target
				? `Added to ${value(mentioned, 'name')}`
				: unknown
					? `Task added. No category is called ${unknown}.`
					: 'Task added';
		const added = amber.act(said, (context) => {
			const result = addTask(context, newTask, target);
			if (result && tagView)
				result.changes.push(...tagByName(context, result.task, [value(tagView, 'name')]));
			return result;
		});
		if (added) newTask = '';
	}

	// Typing is in a field that takes text. A checkbox or a radio button is an input too, but Ctrl or
	// ⌘ with Z and Escape there belong to the page: the checkbox is where focus sits in the list.
	const TEXT_INPUTS = ['text', 'search', 'email', 'url', 'number', 'password', 'tel'];
	function isTyping(element: EventTarget | null) {
		return (
			element instanceof HTMLElement &&
			(element.isContentEditable ||
				element instanceof HTMLTextAreaElement ||
				element instanceof HTMLSelectElement ||
				(element instanceof HTMLInputElement && TEXT_INPUTS.includes(element.type)))
		);
	}

	function onkeydown(event: KeyboardEvent) {
		// Escape leaves choosing tasks, unless a dialog or a field has it.
		if (
			selecting &&
			event.key === 'Escape' &&
			!isTyping(event.target) &&
			!document.querySelector('dialog[open]')
		) {
			event.preventDefault();
			finishSelecting();
			return;
		}
		// In a field, Ctrl or ⌘ with Z belongs to the field: it undoes typing there.
		if (isTyping(event.target)) return;
		// Undo works in a dialog too: that's where steps and tags are taken off.
		if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
			event.preventDefault();
			amber.undo();
			return;
		}
		if (document.querySelector('dialog[open]')) return;
		// Single keys (N, / and ?) can be turned off in Keyboard shortcuts: pressed by mistake, or
		// heard by speech input as a word, they'd do something nobody asked for.
		if (!settings.singleKeyShortcuts || event.metaKey || event.ctrlKey || event.altKey) return;
		if (event.key.toLowerCase() === 'n') {
			event.preventDefault();
			// Quick add is hidden while searching. The search stays as typed: it's said how to get back.
			if (searching) {
				searchField?.focus();
				amber.notice = { message: 'Clear the search to add a task', changes: [] };
			} else quickAdd?.focus();
		} else if (event.key === '/') {
			event.preventDefault();
			searchField?.focus();
		} else if (event.key === '?') {
			event.preventDefault();
			shortcutsOpen = true;
		}
	}

	function openShortcuts() {
		listsOpen = false;
		shortcutsOpen = true;
	}

	const openDetails = (task: Task) => (openTask = task.identifier);

	// Choosing tasks to act on together. Cleared when the place in view changes: a choice made in one
	// list shouldn't act on tasks that can no longer be seen.
	let selecting = $state(false);
	let selected = $state<string[]>([]);
	const toggleSelected = (task: Task) =>
		(selected = selected.includes(task.identifier)
			? selected.filter((identifier) => identifier !== task.identifier)
			: [...selected, task.identifier]);
	/** Focus goes to the first task's box, where choosing starts: the Select button goes away. */
	async function startSelecting() {
		selecting = true;
		await tick();
		(document.querySelector<HTMLElement>('main input[aria-label^="Select:"]') ?? home())?.focus();
	}
	function finishSelecting() {
		selecting = false;
		selected = [];
		// The bar's button that had focus goes with the bar.
		void tick().then(() => rescueFocus());
	}
	// Only the tasks that show a box to choose: done ones folded away and dreams on the shelf aren't
	// chosen without being seen.
	// A locked list's tasks are never chosen with others: what's said after would have to name them.
	const selectAll = () =>
		(selected = sections.flatMap((section) =>
			section.locked
				? []
				: section.shown.filter((task) => !value(task, 'done')).map((task) => task.identifier)
		));
	$effect(() => {
		void view;
		untrack(finishSelecting);
	});

	// While a dragged task is put in its place, the list re-sorts at once: it's already where it was
	// dropped, and sliding it in again from its old place would look like it jumped back first.
	let placing = $state(false);
	async function place(identifier: string, index: number) {
		const task = get(amber.records, identifier, 'task');
		if (!task) return;
		placing = true;
		amber.act('Moved', (context) => placeTask(context, task, index));
		await tick();
		placing = false;
	}

	/**
	 * A field saves when it's left. Before the page goes away or out of sight (a reload, a closed
	 * tab, a phone putting Amber in the background, where it may never come back), the field being
	 * typed in saves as well, so a note half written isn't lost. Saving the same value again changes
	 * nothing, so leaving the field afterward adds no second change to undo.
	 */
	function saveTyping() {
		const field = document.activeElement;
		const typing =
			field instanceof HTMLTextAreaElement ||
			(field instanceof HTMLInputElement && ['text', 'search', ''].includes(field.type));
		if (typing) field.dispatchEvent(new Event('change', { bubbles: true }));
	}
</script>

<svelte:window {onkeydown} onhashchange={() => amber.ready && takeLink()} onpagehide={saveTyping} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'hidden' && saveTyping()} />

<Seo title={TITLE} description={DESCRIPTION} path="/" />

<div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
	<!-- Parts wrap onto a new line rather than squeeze, so large text stays readable. -->
	<header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-5">
		<div class="flex items-center gap-3">
			<button
				type="button"
				class="relative inline-flex size-10 items-center justify-center rounded-lg border border-control-border md:hidden {touchTarget}"
				aria-label="Show lists"
				onclick={() => (listsOpen = true)}
			>
				<Icon name="menu" class="size-5" />
			</button>
			<!-- Amber's icon, as it is: on the graphite page its tile is edged so it doesn't vanish. -->
			<img
				src="/favicon.svg"
				alt=""
				width="32"
				height="32"
				class="size-8 rounded-md outline outline-1 -outline-offset-1 outline-border"
			/>
			<p class="text-xl font-bold tracking-tight">Amber</p>
		</div>
		<!-- The search bar as people know it from every list app: wide, rounded, on its own line on a
		     phone. The cabinet look stays out of the way of finding things. -->
		<search
			class="order-last min-w-0 flex-[1_1_100%] sm:order-none sm:ml-auto sm:max-w-md sm:flex-[1_1_14rem]"
		>
			<label for="search" class="sr-only">Search tasks</label>
			<div class="relative">
				<Icon
					name="search"
					class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
				/>
				<input
					id="search"
					type="search"
					bind:this={searchField}
					bind:value={query}
					class="w-full rounded-xl border border-control-border bg-surface py-2.5 pr-10 pl-10 text-base text-text placeholder:text-muted pointer-coarse:pr-12 [&::-webkit-search-cancel-button]:appearance-none"
					placeholder="Search tasks"
					autocomplete="off"
					enterkeyhint="search"
					aria-keyshortcuts={settings.singleKeyShortcuts ? '/' : undefined}
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
						class="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text pointer-coarse:right-px pointer-coarse:size-11"
						aria-label="Clear search"
						onclick={() => {
							query = '';
							searchField?.focus();
						}}><Icon name="close" /></button
					>
				{/if}
			</div>
		</search>
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
					onsync={openSync}
					oninstall={offerInstall}
					onshortcuts={openShortcuts}
					onlocknew={(name) => (lockingNew = name)}
				/>
			{/if}
		</aside>

		<main id="main" class="min-w-0 pb-32 outline-none" tabindex="-1" {@attach roving}>
			<p id="task-open-hint" hidden>Opens the task's details.</p>
			<div class="flex items-center gap-3">
				<h1 class="min-w-0 truncate text-3xl font-bold tracking-tight">{heading}</h1>
				{#if view.kind === 'category'}
					<button
						type="button"
						class="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-text {touchTarget}"
						aria-label="Edit {heading}"
						onclick={() => view.kind === 'category' && (openCategory = view.identifier)}
					>
						<Icon name="edit" />
					</button>
				{/if}
				{#if !isEmpty && !amber.readOnly && !selecting}
					<!-- Choosing several tasks to tick, move or delete at once (SelectionBar), which has the one
					     Cancel while choosing. -->
					<button type="button" class="ml-auto {smallButton}" onclick={startSelecting}
						>Select</button
					>
				{/if}
			</div>

			<!-- Always there, so screen readers hear the offer when it appears. -->
			<div role="status">
				{#if updates.ready}
					<div
						class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
						transition:slide={{ duration }}
					>
						<p>A new version of Amber is ready.</p>
						<button
							type="button"
							class="relative min-h-9 rounded-md border border-accent-edge bg-accent px-4 font-semibold text-on-accent hover:opacity-85 {touchTarget}"
							onclick={() => updates.apply()}>Update</button
						>
					</div>
				{/if}
			</div>

			{#if amber.problem}
				<!-- A problem gets the stronger control edge and a sign, apart from the calmer notes. -->
				<div class="mt-4 flex gap-3 rounded-lg border border-control-border bg-surface p-3 text-sm">
					<Icon name="alert" class="mt-0.5 size-4 shrink-0" />
					<div class="min-w-0">
						<p role="alert">{amber.problem}</p>
						{#if amber.unsaved}
							<button
								type="button"
								class="mt-3 {smallButton}"
								onclick={() => void amber.downloadCopy()}>{DOWNLOAD_COPY}</button
							>
						{/if}
					</div>
				</div>
			{/if}

			{#if backupDue}
				<div
					class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
				>
					<p class="min-w-0 flex-[1_1_16rem]">{backupReminder(lastDownloaded)}</p>
					<div class="flex flex-wrap gap-2">
						<button type="button" class={smallButton} onclick={() => void answerReminder(true)}
							>{DOWNLOAD_COPY}</button
						>
						<button type="button" class={smallButton} onclick={() => void answerReminder(false)}
							>{NOT_NOW}</button
						>
					</div>
				</div>
			{/if}

			{#if searching}
				<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
					<fieldset class="flex rounded-md border border-control-border p-0.5">
						<legend class="sr-only">Show</legend>
						{#each STATUSES as choice (choice.status)}
							<label class="relative cursor-pointer {touchTarget}">
								<input
									type="radio"
									name="status"
									value={choice.status}
									bind:group={status}
									class="peer sr-only"
								/>
								<span
									class="flex min-h-9 items-center rounded-sm px-4 text-sm transition-colors peer-checked:bg-text peer-checked:font-semibold peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus motion-reduce:transition-none"
									>{choice.label}</span
								>
							</label>
						{/each}
					</fieldset>
					{#if elsewhere > 0}
						<button
							type="button"
							class="relative min-h-9 rounded-md px-3 text-sm underline underline-offset-4 hover:bg-surface {touchTarget}"
							onclick={() => select({ kind: 'all' })}>{elsewhere} more in all tasks</button
						>
					{/if}
				</div>
			{:else}
				<form class="group/quick mt-5" onsubmit={add}>
					<label for="quick-add" class="sr-only">New task</label>
					<div class="flex flex-wrap gap-2">
						<input
							id="quick-add"
							bind:this={quickAdd}
							bind:value={newTask}
							class="{field} min-w-0 flex-[1_1_12rem] py-3 text-base"
							placeholder={targetLocked && !targetOpen
								? `Open ${heading} to add to it`
								: 'Add a task'}
							aria-describedby="quick-add-hint"
							aria-keyshortcuts={settings.singleKeyShortcuts ? 'N' : undefined}
							maxlength={LIMITS.title + 200}
							autocomplete="off"
							disabled={!amber.ready || amber.readOnly || (targetLocked && !targetOpen)}
						/>
						<button
							type="submit"
							class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-accent-edge bg-accent px-4 font-semibold text-on-accent transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:border-control-border disabled:bg-transparent disabled:text-muted disabled:hover:opacity-100 motion-reduce:transition-none"
							disabled={!newTask.trim()}
						>
							<Icon name="plus" /> Add
						</button>
					</div>
					<!-- Shown until the list has a tag, and after that whenever quick add has focus, so # and @
					     stay something to read, not to remember. Its line is kept either way: if it folded
					     away, leaving quick add would move the list under the pointer mid-click. -->
					<p
						id="quick-add-hint"
						class="mt-1.5 text-xs text-muted {hasTags && !targetLocked
							? 'invisible group-focus-within/quick:visible'
							: ''}"
					>
						{#if targetLocked}
							Encrypted as it's added. # and @ are off in a locked list.
						{:else}
							<span class="font-medium">#weekend</span> makes a tag, and
							<span class="font-medium">@Home</span> puts the task in that category.
						{/if}
					</p>
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
							<!-- Only before there are categories: after deleting everything, it isn't news. -->
							{#if !categoryTree(amber.records).length}
								<span class="mt-2 block text-sm">
									Keeping a bucket list? Make a category and choose Bucket list: what you achieve
									stays, with the date.
								</span>
							{/if}
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
					{#if isShownSection(section)}
						{@const open = section.locked && locks.isOpen(section.categoryIdentifier)}
						{@const closed = section.locked && !open}
						{@const inside = section.shown.length + section.done.length}
						<section class="mt-8" aria-labelledby="section-{section.key}">
							<!-- Each section is a drawer's tray: a framed label, then its tasks as ruled slips. -->
							<h2
								id="section-{section.key}"
								class="mb-2 {section.color
									? `${labelShape} ${PLATE[section.color]}`
									: labelPlate} {sections.length > 1 || searching ? '' : 'sr-only'}"
							>
								{#if section.color}<span
										class="size-2.5 rounded-full {DOT[section.color]}"
										aria-hidden="true"
									></span>{/if}
								{section.title}
								{#if section.bucket}<span aria-hidden="true">·</span> Bucket list{/if}
								{#if section.locked}<span aria-hidden="true">·</span> Locked list{/if}
								{#if searching}<span class="font-normal tabular-nums">{section.shown.length}</span
									>{/if}
							</h2>
							{#if section.locked}
								<!-- Its state and the one button that changes it, seen whether or not the label
								     above is: on its own page, a list's label is for screen readers only. -->
								<div
									class="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
								>
									<Icon name={open ? 'unlock' : 'lock'} class="size-4 shrink-0" />
									<p class="min-w-0 flex-[1_1_14rem]">
										{open
											? 'Open. It locks again when Amber is hidden, and after five minutes without use.'
											: inside
												? `Locked, with ${inside} ${tasksWord(inside)} inside.`
												: 'Locked, and empty so far.'}
									</p>
									<button
										type="button"
										class={smallButton}
										aria-label="{open ? 'Lock' : 'Open'} {section.title}"
										onclick={() => {
											if (!section.categoryIdentifier) return;
											if (open) locks.close(section.categoryIdentifier);
											else unlocking = section.categoryIdentifier;
										}}>{open ? 'Lock' : 'Open'}</button
									>
								</div>
							{/if}
							{#if !closed}
								<ul
									class={section.shown.length ? tray : ''}
									{@attach sortable({
										onplace: (identifier, index) => void place(identifier, index),
										enabled: () => !searching && !selecting
									})}
								>
									{#each section.shown as task, index (task.identifier)}
										<li
											class="[-webkit-touch-callout:none] data-dragging:relative data-dragging:z-10 data-dragging:rounded-md data-dragging:bg-surface data-dragging:shadow-xl data-dragging:outline data-dragging:outline-control-border"
											animate:flip={{ duration: placing ? 0 : duration }}
											in:arrive={{ key: task.identifier, bucket: section.bucket }}
											out:leave={{ key: task.identifier, bucket: section.bucket }}
										>
											<TaskRow
												{task}
												showCategory={view.kind === 'tag'}
												words={search.words}
												movable={!searching && !selecting}
												selecting={selecting && !section.locked}
												selected={selected.includes(task.identifier)}
												onselect={toggleSelected}
												lockedIn={section.locked ? section.title : undefined}
												position={index + 1}
												first={index === 0}
												last={index === section.shown.length - 1}
												bucket={section.bucket}
												color={section.color}
												hideTag={view.kind === 'tag' ? view.identifier : undefined}
												onopen={openDetails}
											/>
										</li>
									{/each}
								</ul>
								{#if section.done.length && section.bucket}
									<!-- A bucket list's done tasks are achieved dreams: kept on a shelf of their own,
								     newest first, each with its collection label, never folded away. A dream ticked in
								     the tray is carried onto the shelf, and back if it's unticked. -->
									<!-- Set in under its own list's tray, with a hairline, so it reads as that list's shelf,
								     not a section of its own. -->
									<section
										class="mt-4 ml-3 border-l border-border pt-1 pl-4 sm:ml-4"
										aria-labelledby="achieved-{section.key}"
									>
										<h3
											id="achieved-{section.key}"
											class="mb-2 {section.color
												? `${labelShape} ${PLATE[section.color]}`
												: labelPlate}"
										>
											{sections.length > 1 ? `Achieved in ${section.title}` : 'Achieved'} ({section
												.done.length})
										</h3>
										<ul class="grid gap-2 sm:grid-cols-2">
											{#each section.done as task (task.identifier)}
												<li
													animate:flip={{ duration }}
													in:arrive={{ key: task.identifier, bucket: true }}
													out:leave={{ key: task.identifier, bucket: true }}
												>
													<TaskRow
														{task}
														bucket
														achieved
														movable={false}
														lockedIn={section.locked ? section.title : undefined}
														onopen={openDetails}
													/>
												</li>
											{/each}
										</ul>
									</section>
								{:else if section.done.length}
									<details class="group mt-2">
										<summary
											class="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm text-muted hover:bg-surface hover:text-text pointer-coarse:min-h-11"
										>
											<Icon
												name="down"
												class="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
											/>
											<!-- Framed in its list's color, as the list's own label is: the fold is still that list's. -->
											<span
												class={section.color ? `${labelShape} ${PLATE[section.color]}` : labelPlate}
												>Done ({section.done.length})</span
											>
										</summary>
										<ul class="mt-1 {tray}">
											{#each section.done as task, index (task.identifier)}
												<li transition:slide={{ duration }}>
													<TaskRow
														{task}
														movable={false}
														lockedIn={section.locked ? section.title : undefined}
														position={section.shown.length + index + 1}
														hideTag={view.kind === 'tag' ? view.identifier : undefined}
														onopen={openDetails}
													/>
												</li>
											{/each}
										</ul>
									</details>
								{/if}
							{/if}
						</section>
					{/if}
				{/each}
			{/if}
		</main>
		{#if selecting}
			<SelectionBar {selected} onselectall={selectAll} onfinish={finishSelecting} />
		{/if}
	</div>

	<!-- Room at the bottom so the message with Undo never covers the footer's link. -->
	<footer class="mt-auto border-t border-border pt-8 pb-36 text-sm text-muted">
		<p class="font-medium text-text">{PROMISE}</p>
		<p class="mt-1">{PROMISE_DETAIL} {STORAGE_NOTE} {SYNC_NOTE}</p>
		<p class="mt-4">
			{FOOTNOTE.before}
			<a
				href={MAIN_SITE_URL}
				rel="external"
				class="relative inline-block underline underline-offset-4 hover:text-text {touchTarget}"
				>{FOOTNOTE.name}</a
			>{FOOTNOTE.after}
			<a
				href={SOURCE_URL}
				rel="external"
				class="relative inline-block underline underline-offset-4 hover:text-text {touchTarget}"
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
			onsync={openSync}
			oninstall={offerInstall}
			onshortcuts={openShortcuts}
			onlocknew={(name) => {
				listsOpen = false;
				lockingNew = name;
			}}
		/>
	{/if}
</Sheet>
<ShortcutsSheet open={shortcutsOpen} onclose={() => (shortcutsOpen = false)} />

<TaskDetails identifier={openTask} onclose={() => (openTask = undefined)} />
<CategoryEditor
	identifier={openCategory}
	onclose={() => (openCategory = undefined)}
	onopen={(identifier) => (view = { kind: 'category', identifier })}
	onlock={(identifier) => {
		openCategory = undefined;
		locking = identifier;
	}}
	onopenlock={(identifier) => {
		openCategory = undefined;
		unlocking = identifier;
	}}
/>
<LockSheet
	identifier={locking}
	newName={lockingNew}
	onclose={() => (locking = lockingNew = undefined)}
	onlocked={(identifier) => (view = { kind: 'category', identifier })}
/>
<UnlockSheet identifier={unlocking} onclose={() => (unlocking = undefined)} />
<TagEditor identifier={openTag} onclose={() => (openTag = undefined)} />
{#if loaded.sync}
	{#await import('#lib/components/SyncSheet.svelte') then { default: SyncSheet }}
		<SyncSheet open={syncOpen} code={syncCode} onclose={() => (syncOpen = false)} />
	{/await}
{/if}
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
