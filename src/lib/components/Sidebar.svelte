<!-- The places to look at: everything, no category, each category and subcategory, each tag. Drawn
     as the drawers of a cabinet: each place a drawer front, its count framed on it, and the open one
     pulled out in graphite. -->
<script lang="ts">
	import { settings } from '#lib/settings.svelte.js';
	import { amber } from '#lib/amber.svelte.js';
	import { DOT } from '#lib/colors.js';
	import { addCategory } from '#lib/model/actions.js';
	import { categoryTree, tags as allTags, value, LIMITS } from '#lib/model/list.js';
	import { field, labelPlate, touchTarget } from '#lib/styles.js';
	import { install } from '#lib/install.svelte.js';
	import { openCount, type View } from '#lib/views.js';
	import Icon from './Icon.svelte';
	import ListKind from './ListKind.svelte';

	let {
		view,
		onselect,
		oneditcategory,
		onedittag,
		onbackup,
		onsync,
		oninstall,
		onshortcuts
	}: {
		view: View;
		onselect: (view: View) => void;
		oneditcategory: (identifier: string) => void;
		onedittag: (identifier: string) => void;
		onbackup: () => void;
		onsync: () => void;
		oninstall: () => void;
		onshortcuts: () => void;
	} = $props();

	const tree = $derived(categoryTree(amber.records));
	const tags = $derived(allTags(amber.records));
	let newCategory = $state('');
	let newBucket = $state(false);

	const isCurrent = (candidate: View) =>
		candidate.kind === view.kind &&
		('identifier' in candidate
			? 'identifier' in view && candidate.identifier === view.identifier
			: true);

	const item =
		'flex min-h-10 min-w-0 flex-1 items-center pointer-coarse:min-h-11 gap-2.5 rounded-md border border-border bg-surface px-3 text-left text-sm transition-colors hover:border-control-border motion-reduce:transition-none';
	const current = 'border-text bg-text font-semibold text-bg hover:border-text';
	const quiet =
		'flex min-h-10 w-full items-center pointer-coarse:min-h-11 gap-2.5 rounded-md px-3 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-text motion-reduce:transition-none';
	const editButton =
		'inline-flex size-9 shrink-0 items-center pointer-coarse:size-11 justify-center rounded-md text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 hover:bg-surface hover:text-text';
	// All tasks and No category can't be edited; a gap the edit button's size keeps their counts in
	// line with the others'.
	const editSpace = 'size-9 shrink-0 pointer-coarse:size-11';
	// The sidebar is drawn twice (beside the list, and in the sheet on a phone), so its identifiers
	// carry a prefix of their own.
	const prefix = $props.id();
</script>

{#snippet place(target: View, name: string, color: string | null, indent = false, bucket = false)}
	{@const count = openCount(amber.records, target)}
	<button
		type="button"
		class="{item} {isCurrent(target) ? current : ''} {indent ? 'pl-8' : ''}"
		aria-current={isCurrent(target) ? 'page' : undefined}
		onclick={() => onselect(target)}
	>
		{#if color}<span class="size-2.5 shrink-0 rounded-full {color}" aria-hidden="true"></span>{/if}
		<span class="min-w-0 flex-1 truncate">{name}</span>
		<!-- A bucket list says so from the start, before anything on it is achieved. -->
		{#if bucket}<Icon name="star" class="size-3.5 shrink-0 opacity-70" /><span class="sr-only"
				>bucket list</span
			>{/if}
		{#if count}<span
				class="rounded-sm border px-1.5 text-xs tabular-nums {isCurrent(target)
					? 'border-bg/40'
					: 'border-border text-muted'}"
				aria-hidden="true">{count}</span
			><span class="sr-only">{count} to do</span>{/if}
	</button>
{/snippet}

<nav aria-label="Lists" class="space-y-6">
	<ul class="space-y-1.5">
		<li class="flex gap-1">
			{@render place({ kind: 'all' }, 'All tasks', null)}<span class={editSpace} aria-hidden="true"
			></span>
		</li>
		<li class="flex gap-1">
			{@render place({ kind: 'uncategorized' }, 'No category', null)}<span
				class={editSpace}
				aria-hidden="true"
			></span>
		</li>
	</ul>

	<!-- Groups with a name, not headings: the page's own heading comes first in the outline. -->
	<div role="group" aria-labelledby="{prefix}-categories-heading">
		<p id="{prefix}-categories-heading" class="mb-2 {labelPlate}">Categories</p>
		<ul class="space-y-1.5">
			{#each tree as { category, children } (category.identifier)}
				{@const color = value(category, 'color')}
				<li>
					<div class="group flex items-center gap-1">
						{@render place(
							{ kind: 'category', identifier: category.identifier },
							value(category, 'name'),
							color ? DOT[color] : null,
							false,
							value(category, 'keepDone')
						)}
						<button
							type="button"
							class={editButton}
							aria-label="Edit {value(category, 'name')}"
							onclick={() => oneditcategory(category.identifier)}><Icon name="edit" /></button
						>
					</div>
					{#if children.length}
						<ul class="mt-1.5 space-y-1.5">
							{#each children as child (child.identifier)}
								{@const childColor = value(child, 'color')}
								<li class="group flex items-center gap-1">
									{@render place(
										{ kind: 'category', identifier: child.identifier },
										value(child, 'name'),
										childColor ? DOT[childColor] : null,
										true,
										value(child, 'keepDone')
									)}
									<button
										type="button"
										class={editButton}
										aria-label="Edit {value(child, 'name')}"
										onclick={() => oneditcategory(child.identifier)}><Icon name="edit" /></button
									>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
		<form
			class="group/new mt-2"
			onsubmit={(event) => {
				event.preventDefault();
				const made = amber.act('Category added', (context) =>
					addCategory(context, newCategory, null, newBucket)
				);
				if (made && 'category' in made) {
					newCategory = '';
					newBucket = false;
					onselect({ kind: 'category', identifier: made.category.identifier });
				}
			}}
		>
			<label for="{prefix}-new-category" class="sr-only">New category</label>
			<div class="flex gap-1.5">
				<input
					id="{prefix}-new-category"
					class="{field} min-w-0 py-2"
					placeholder="New category"
					bind:value={newCategory}
					maxlength={LIMITS.name}
				/>
				<button
					type="submit"
					class="relative inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md border border-control-border px-3 text-sm font-medium hover:bg-surface disabled:opacity-50 {touchTarget}"
					aria-label="Add category"
					disabled={!newCategory.trim()}><Icon name="plus" class="size-4" />Add</button
				>
			</div>
			<!-- Asked as the category is made, since it's what a bucket list is: shown as soon as the
			     field has focus, so the choice is seen before a name is thought of, and kept once there's
			     a name. -->
			<div class="mt-3 {newCategory.trim() ? '' : 'hidden group-focus-within/new:block'}">
				<ListKind bucket={newBucket} onchange={(bucket) => (newBucket = bucket)} />
			</div>
		</form>
	</div>

	{#if tags.length}
		<div role="group" aria-labelledby="{prefix}-tags-heading">
			<p id="{prefix}-tags-heading" class="mb-2 {labelPlate}">Tags</p>
			<ul class="space-y-1.5">
				{#each tags as tag (tag.identifier)}
					{@const color = value(tag, 'color')}
					<li class="group flex items-center gap-1">
						{@render place(
							{ kind: 'tag', identifier: tag.identifier },
							`#${value(tag, 'name')}`,
							color ? DOT[color] : null
						)}
						<button
							type="button"
							class={editButton}
							aria-label="Edit #{value(tag, 'name')}"
							onclick={() => onedittag(tag.identifier)}><Icon name="edit" /></button
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</nav>

<div class="mt-6 space-y-0.5">
	{#if install.offered}
		<button type="button" class={quiet} onclick={oninstall}>
			<Icon name="install" />
			Install Amber
		</button>
	{/if}
	<button type="button" class={quiet} onclick={onsync}>
		<Icon name="sync" />
		Sync with another device
	</button>
	<button type="button" class={quiet} onclick={onbackup}>
		<Icon name="archive" />
		Back up and move
	</button>
	<!-- With a mouse or a trackpad, where there's likely a keyboard. A touch screen has no use for the
	     shortcuts, except to turn the single-key ones back on: with them off, ? can't open the sheet. -->
	<div class={settings.singleKeyShortcuts ? 'hidden pointer-fine:block' : ''}>
		<button type="button" class={quiet} onclick={onshortcuts}>
			<Icon name="keyboard" />
			Keyboard shortcuts
		</button>
	</div>
</div>
