<!-- A category's settings: its name, color, whether done tasks stay in view (for bucket lists),
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

<Sheet open={!!category} title={parent ? 'Subcategory' : 'Category'} {onclose}>
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

		<ColorChoice
			label="Color"
			value={value(category, 'color')}
			onchange={(color) =>
				amber.act('Color changed', (context) => updateCategory(context, category, { color }))}
		/>

		<label class="flex items-start gap-3">
			<input
				type="checkbox"
				class="mt-1 size-5 shrink-0 accent-[var(--accent-edge)]"
				checked={value(category, 'keepDone')}
				onchange={(event) =>
					amber.act('Setting changed', (context) =>
						updateCategory(context, category, { keepDone: event.currentTarget.checked })
					)}
			/>
			<span>
				<span class="font-medium">Keep done tasks in view</span>
				<span class="block text-sm text-muted"
					>With the date they were done, like a bucket list. Otherwise they tuck away below.</span
				>
			</span>
		</label>

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
					<input id="new-subcategory" class={field} bind:value={newChild} maxlength={LIMITS.name} />
					<button type="submit" class={secondaryButton} disabled={!newChild.trim()}>Add</button>
				</div>
			</form>
		{/if}

		<div class="flex flex-wrap gap-2 border-t border-border pt-5">
			<button
				type="button"
				class={secondaryButton}
				disabled={position <= 0}
				onclick={() => amber.act('Moved up', (context) => moveCategory(context, category, -1))}
			>
				<Icon name="up" /> Move up
			</button>
			<button
				type="button"
				class={secondaryButton}
				disabled={position < 0 || position >= siblings.length - 1}
				onclick={() => amber.act('Moved down', (context) => moveCategory(context, category, 1))}
			>
				<Icon name="down" /> Move down
			</button>
			<button
				type="button"
				class="{secondaryButton} ml-auto"
				onclick={() => {
					amber.act(`Deleted ${value(category, 'name')}. Its tasks are kept`, (context) =>
						deleteCategory(context, category)
					);
					if (parent) onopen(parent.identifier);
					onclose();
				}}
			>
				<Icon name="trash" /> Delete
			</button>
		</div>
		<p class="text-sm text-muted">
			Deleting keeps the tasks: a subcategory's move to its parent, a category's to No category.
		</p>
	{/if}
</Sheet>
