<!-- The places to look at: everything, no category, each category and subcategory, each tag. Drawn
     as the drawers of a cabinet: each place a drawer front, its count framed on it, and the open one
     pulled out into the tray. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { DOT } from '#lib/colors.js';
	import { addCategory } from '#lib/model/actions.js';
	import { categoryTree, tags as allTags, value, LIMITS, type Category } from '#lib/model/list.js';
	import { field, labelPlate, touchTarget } from '#lib/styles.js';
	import { install } from '#lib/install.svelte.js';
	import { openCount, type View } from '#lib/views.js';
	import Icon from './Icon.svelte';
	import ListKind, { type ListKindName } from './ListKind.svelte';

	let {
		view,
		onselect,
		oneditcategory,
		onedittag,
		onbackup,
		onsync,
		oninstall,
		onsettings,
		onlocknew,
		beside = false
	}: {
		view: View;
		onselect: (view: View) => void;
		oneditcategory: (identifier: string) => void;
		onedittag: (identifier: string) => void;
		onbackup: () => void;
		onsync: () => void;
		oninstall: () => void;
		onsettings: () => void;
		/** A new locked list, made only once its passphrase is set. */
		onlocknew: (name: string) => void;
		/**
		 * Drawn beside the list, on a wide screen: the open drawer then slides out of the cabinet
		 * into the list's tray, one outlined surface (+page.svelte draws the tray). In the Lists
		 * sheet on a phone it's outlined, but there's no tray beside it to join.
		 */
		beside?: boolean;
	} = $props();

	const tree = $derived(categoryTree(amber.records));
	const tags = $derived(allTags(amber.records));
	let newCategory = $state('');
	let newKind = $state<ListKindName>('todo');

	const isCurrent = (candidate: View) =>
		candidate.kind === view.kind &&
		('identifier' in candidate
			? 'identifier' in view && candidate.identifier === view.identifier
			: true);

	// Closed drawers are plain labels on the cabinet, a front showing only on hover; the open one
	// alone takes the tray's tone, semibold in the text color, and beside the list it runs on into
	// the tray (covering the tray's edge where they meet), so it reads as the drawer pulled out. No
	// outline, in either mode. It slides out over 200ms, at once under reduced motion.
	const front =
		'group flex min-w-0 items-center rounded-md text-muted transition-[margin,background-color,color,border-radius] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-surface hover:text-text motion-reduce:transition-none';
	const open = 'bg-surface font-semibold text-text';
	const joined = 'md:relative md:z-10 md:-mr-px md:rounded-r-none';
	const placeButton =
		'flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 text-left text-sm pointer-coarse:min-h-11';
	const quiet =
		'flex min-h-10 w-full items-center pointer-coarse:min-h-11 gap-2.5 rounded-md px-3 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-text motion-reduce:transition-none';
	const editButton =
		'inline-flex size-9 shrink-0 items-center pointer-coarse:size-11 justify-center rounded-md text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 hover:bg-bg hover:text-text';
	// All tasks and No category can't be edited; a gap the edit button's size keeps their counts in
	// line with the others'.
	const editSpace = 'size-9 shrink-0 pointer-coarse:size-11';
	// The sidebar is drawn twice (beside the list, and in the sheet on a phone), so its identifiers
	// carry a prefix of their own.
	const prefix = $props.id();
	const kindOf = (category: Category): ListKindName =>
		value(category, 'lock') ? 'locked' : value(category, 'keepDone') ? 'bucket' : 'todo';
</script>

{#snippet place(
	target: View,
	name: string,
	color: string | null,
	indent = false,
	kind: ListKindName = 'todo',
	edit?: { label: string; onclick: () => void }
)}
	{@const count = openCount(amber.records, target)}
	{@const here = isCurrent(target)}
	<div
		class="{front} {here ? open : ''} {here && beside ? joined : 'mr-2.5'} {indent ? 'ml-6' : ''}"
	>
		<button
			type="button"
			class={placeButton}
			aria-current={here ? 'page' : undefined}
			onclick={() => onselect(target)}
		>
			{#if color}<span class="size-2.5 shrink-0 rounded-full {color}" aria-hidden="true"
				></span>{/if}
			<span class="min-w-0 flex-1 truncate">{name}</span>
			<!-- A bucket list says so from the start, before anything on it is achieved. -->
			{#if kind === 'bucket'}<Icon name="star" class="size-3.5 shrink-0 opacity-70" /><span
					class="sr-only">bucket list</span
				>{:else if kind === 'locked'}<Icon name="lock" class="size-3.5 shrink-0 opacity-70" /><span
					class="sr-only">locked list</span
				>{/if}
			<!-- Every category and tag says how many are left, 0 too: a drawer with nothing on it, rather
			     than one that looks broken. All tasks and No category say it only when there are some. -->
			{#if count || target.kind === 'category' || target.kind === 'tag'}<span
					class="rounded-sm border px-1.5 text-xs tabular-nums {here
						? 'border-text'
						: 'border-border text-muted'}"
					aria-hidden="true">{count}</span
				><span class="sr-only">{count} to do</span>{/if}
		</button>
		{#if edit}
			<button type="button" class={editButton} aria-label={edit.label} onclick={edit.onclick}
				><Icon name="edit" /></button
			>
		{:else}
			<!-- The pencil's room, so every count lines up. -->
			<span class={editSpace} aria-hidden="true"></span>
		{/if}
	</div>
{/snippet}

<!-- The cabinet: a body one step under the page, its drawers along it. Beside the list it has no
     right edge, so the open drawer can run straight on into the tray. -->
<nav
	aria-label="Lists"
	class="space-y-6 border border-border bg-cabinet py-3 pl-2.5 {beside
		? 'rounded-l-lg border-r-0'
		: 'rounded-lg'}"
>
	<ul class="space-y-1.5">
		<li>{@render place({ kind: 'all' }, 'All tasks', null)}</li>
		<li>{@render place({ kind: 'uncategorized' }, 'No category', null)}</li>
	</ul>

	<!-- Groups with a name, not headings: the page's own heading comes first in the outline. -->
	<div role="group" aria-labelledby="{prefix}-categories-heading">
		<p id="{prefix}-categories-heading" class="mb-2 {labelPlate}">Categories</p>
		<ul class="space-y-1.5">
			{#each tree as { category, children } (category.identifier)}
				{@const color = value(category, 'color')}
				<li>
					{@render place(
						{ kind: 'category', identifier: category.identifier },
						value(category, 'name'),
						color ? DOT[color] : null,
						false,
						kindOf(category),
						{
							label: `Edit ${value(category, 'name')}`,
							onclick: () => oneditcategory(category.identifier)
						}
					)}
					{#if children.length}
						<ul class="mt-1.5 space-y-1.5">
							{#each children as child (child.identifier)}
								{@const childColor = value(child, 'color')}
								<li>
									{@render place(
										{ kind: 'category', identifier: child.identifier },
										value(child, 'name'),
										childColor ? DOT[childColor] : null,
										true,
										kindOf(child),
										{
											label: `Edit ${value(child, 'name')}`,
											onclick: () => oneditcategory(child.identifier)
										}
									)}
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
		<form
			class="group/new mt-2 mr-2.5"
			onsubmit={(event) => {
				event.preventDefault();
				if (newKind === 'locked') {
					if (!newCategory.trim()) return;
					onlocknew(newCategory);
					newCategory = '';
					newKind = 'todo';
					return;
				}
				const made = amber.act('Category added', (context) =>
					addCategory(context, newCategory, null, newKind === 'bucket')
				);
				if (made && 'category' in made) {
					newCategory = '';
					newKind = 'todo';
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
				<ListKind kind={newKind} onchange={(kind) => (newKind = kind)} />
			</div>
		</form>
	</div>

	{#if tags.length}
		<div role="group" aria-labelledby="{prefix}-tags-heading">
			<p id="{prefix}-tags-heading" class="mb-2 {labelPlate}">Tags</p>
			<ul class="space-y-1.5">
				{#each tags as tag (tag.identifier)}
					{@const color = value(tag, 'color')}
					<li>
						{@render place(
							{ kind: 'tag', identifier: tag.identifier },
							`#${value(tag, 'name')}`,
							color ? DOT[color] : null,
							false,
							'todo',
							{ label: `Edit #${value(tag, 'name')}`, onclick: () => onedittag(tag.identifier) }
						)}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</nav>

<div class="mt-6 mr-2.5 space-y-0.5">
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
	<button type="button" class={quiet} onclick={onsettings}>
		<Icon name="settings" />
		Settings
	</button>
</div>
