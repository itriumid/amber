<!-- A category's settings: its name, whether it's a to-do list or a bucket list, its color,
     its subcategories, its place in the list, and deleting it. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import {
		addCategory,
		categorySiblings,
		deleteCategory,
		moveCategory,
		updateCategory
	} from '#lib/model/actions.js';
	import { get, value, LIMITS } from '#lib/model/list.js';
	import { field, label, secondaryButton } from '#lib/styles.js';
	import ColorChoice from './ColorChoice.svelte';
	import Icon from './Icon.svelte';
	import ListKind from './ListKind.svelte';
	import Sheet from './Sheet.svelte';

	let {
		identifier,
		onclose,
		onopen
	}: { identifier: string | undefined; onclose: () => void; onopen: (identifier: string) => void } =
		$props();

	const category = $derived(identifier ? get(amber.records, identifier, 'category') : undefined);
	const parent = $derived(
		category ? get(amber.records, value(category, 'parentIdentifier'), 'category') : undefined
	);
	const siblings = $derived(category ? categorySiblings(amber.records, category) : []);
	const position = $derived(
		category ? siblings.findIndex((sibling) => sibling.identifier === category.identifier) : -1
	);
	let newChild = $state('');
</script>

<!-- Named for what's being edited, so a screen reader hears which one. -->
<Sheet
	open={!!category}
	title={category
		? `${parent ? 'Subcategory' : 'Category'}: ${value(category, 'name')}`
		: 'Category'}
	{onclose}
>
	{#if category}
		<div>
			<label for="category-name" class={label}>Name</label>
			<input
				id="category-name"
				class={field}
				value={value(category, 'name')}
				maxlength={LIMITS.name}
				onchange={(event) =>
					amber.act('Renamed', (context) =>
						updateCategory(context, category, { name: event.currentTarget.value })
					)}
			/>
			{#if parent}<p class="mt-1.5 text-sm text-muted">Inside {value(parent, 'name')}</p>{/if}
		</div>

		<ListKind
			bucket={value(category, 'keepDone')}
			onchange={(bucket) =>
				amber.act(bucket ? 'Made a bucket list' : 'Made a to-do list', (context) =>
					updateCategory(context, category, { keepDone: bucket })
				)}
		/>

		<ColorChoice
			label="Color"
			value={value(category, 'color')}
			onchange={(color) =>
				amber.act('Color changed', (context) => updateCategory(context, category, { color }))}
		/>

		{#if !parent}
			<form
				class="space-y-2"
				onsubmit={(event) => {
					event.preventDefault();
					const made = amber.act('Subcategory added', (context) =>
						addCategory(context, newChild, category.identifier)
					);
					if (made && 'category' in made) {
						newChild = '';
					}
				}}
			>
				<label for="new-subcategory" class={label}>Add a subcategory</label>
				<div class="flex gap-2">
					<input
						id="new-subcategory"
						class={field}
						placeholder="New subcategory"
						bind:value={newChild}
						maxlength={LIMITS.name}
					/>
					<button type="submit" class={secondaryButton} disabled={!newChild.trim()}
						><Icon name="plus" class="size-4" />Add</button
					>
				</div>
			</form>
		{/if}

		<!-- Moving, then deleting on its own below a line, as in a task's and a tag's sheets. -->
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="{secondaryButton} flex-[1_1_8rem]"
				disabled={position <= 0}
				onclick={() => amber.act('Moved up', (context) => moveCategory(context, category, -1))}
			>
				<Icon name="up" /> Move up
			</button>
			<button
				type="button"
				class="{secondaryButton} flex-[1_1_8rem]"
				disabled={position < 0 || position >= siblings.length - 1}
				onclick={() => amber.act('Moved down', (context) => moveCategory(context, category, 1))}
			>
				<Icon name="down" /> Move down
			</button>
		</div>
		<div class="border-t border-border pt-5">
			<button
				type="button"
				class="{secondaryButton} w-full"
				onclick={() => {
					amber.act(`Deleted: ${value(category, 'name')}, tasks kept`, (context) =>
						deleteCategory(context, category)
					);
					if (parent) onopen(parent.identifier);
					onclose();
				}}
			>
				<Icon name="trash" /> Delete {parent ? 'subcategory' : 'category'}
			</button>
			<p class="mt-2 text-sm text-muted">
				Deleting keeps the tasks: a subcategory's move to its parent, a category's to No category.
			</p>
		</div>
	{/if}
</Sheet>
