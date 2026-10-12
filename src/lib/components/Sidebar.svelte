<!-- The places to look at: everything, no category, each category and subcategory, each tag. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { DOT } from '#lib/colors.js';
	import { addCategory } from '#lib/model/actions.js';
	import { categoryTree, tags as allTags, value, LIMITS } from '#lib/model/list.js';
	import { field } from '#lib/styles.js';
	import { install } from '#lib/install.svelte.js';
	import { openCount, type View } from '#lib/views.js';
	import Icon from './Icon.svelte';

	let {
		view,
		onselect,
		oneditcategory,
		onedittag,
		onbackup,
		oninstall
	}: {
		view: View;
		onselect: (view: View) => void;
		oneditcategory: (identifier: string) => void;
		onedittag: (identifier: string) => void;
		onbackup: () => void;
		oninstall: () => void;
	} = $props();

	const tree = $derived(categoryTree(amber.records));
	const tags = $derived(allTags(amber.records));
	let newCategory = $state('');

	const isCurrent = (candidate: View) =>
		candidate.kind === view.kind &&
		('identifier' in candidate
			? 'identifier' in view && candidate.identifier === view.identifier
			: true);

	const item =
		'flex min-h-10 flex-1 items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors hover:bg-surface motion-reduce:transition-none';
	const current = 'bg-surface font-semibold';
	const quiet =
		'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-text motion-reduce:transition-none';
	const editButton =
		'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 hover:bg-surface hover:text-text';
	// The sidebar is drawn twice (beside the list, and in the sheet on a phone), so its identifiers
	// carry a prefix of their own.
	const prefix = $props.id();
</script>

{#snippet place(target: View, name: string, color: string | null, indent = false)}
	{@const count = openCount(amber.records, target)}
	<button
		type="button"
		class="{item} {isCurrent(target) ? current : ''} {indent ? 'pl-8' : ''}"
		aria-current={isCurrent(target) ? 'page' : undefined}
		onclick={() => onselect(target)}
	>
		{#if color}<span class="size-2.5 shrink-0 rounded-full {color}" aria-hidden="true"></span>{/if}
		<span class="min-w-0 flex-1 truncate">{name}</span>
		{#if count}<span class="text-xs text-muted tabular-nums" aria-hidden="true">{count}</span><span
				class="sr-only">{count} to do</span
			>{/if}
	</button>
{/snippet}

<nav aria-label="Lists" class="space-y-6">
	<ul class="space-y-0.5">
		<li class="flex">{@render place({ kind: 'all' }, 'All tasks', null)}</li>
		<li class="flex">{@render place({ kind: 'uncategorized' }, 'No category', null)}</li>
	</ul>

	<section aria-labelledby="{prefix}-categories-heading">
		<h2
			id="{prefix}-categories-heading"
			class="mb-1 px-3 text-xs font-semibold tracking-widest text-muted uppercase"
		>
			Categories
		</h2>
		<ul class="space-y-0.5">
			{#each tree as { category, children } (category.identifier)}
				{@const color = value(category, 'color')}
				<li>
					<div class="group flex items-center">
						{@render place(
							{ kind: 'category', identifier: category.identifier },
							value(category, 'name'),
							color ? DOT[color] : null
						)}
						<button
							type="button"
							class={editButton}
							aria-label="Edit {value(category, 'name')}"
							onclick={() => oneditcategory(category.identifier)}><Icon name="edit" /></button
						>
					</div>
					{#if children.length}
						<ul class="space-y-0.5">
							{#each children as child (child.identifier)}
								{@const childColor = value(child, 'color')}
								<li class="group flex items-center">
									{@render place(
										{ kind: 'category', identifier: child.identifier },
										value(child, 'name'),
										childColor ? DOT[childColor] : null,
										true
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
			class="mt-2 px-1"
			onsubmit={(event) => {
				event.preventDefault();
				const made = amber.act('Category added', (context) => addCategory(context, newCategory));
				if (made && 'category' in made) {
					newCategory = '';
					onselect({ kind: 'category', identifier: made.category.identifier });
				}
			}}
		>
			<label for="{prefix}-new-category" class="sr-only">New category</label>
			<div class="flex gap-1.5">
				<input
					id="{prefix}-new-category"
					class="{field} py-2"
					placeholder="New category"
					bind:value={newCategory}
					maxlength={LIMITS.name}
				/>
				<button
					type="submit"
					class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-control-border hover:bg-surface disabled:opacity-50"
					aria-label="Add category"
					disabled={!newCategory.trim()}><Icon name="plus" /></button
				>
			</div>
		</form>
	</section>

	{#if tags.length}
		<section aria-labelledby="{prefix}-tags-heading">
			<h2
				id="{prefix}-tags-heading"
				class="mb-1 px-3 text-xs font-semibold tracking-widest text-muted uppercase"
			>
				Tags
			</h2>
			<ul class="space-y-0.5">
				{#each tags as tag (tag.identifier)}
					{@const color = value(tag, 'color')}
					<li class="group flex items-center">
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
		</section>
	{/if}
</nav>

<div class="mt-6 space-y-0.5">
	{#if install.offered}
		<button type="button" class={quiet} onclick={oninstall}>
			<Icon name="install" />
			Install Amber
		</button>
	{/if}
	<button type="button" class={quiet} onclick={onbackup}>
		<Icon name="archive" />
		Back up and move
	</button>
</div>
