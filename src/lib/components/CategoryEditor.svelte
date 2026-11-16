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
	import Check from './Check.svelte';
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
	const keepDoneHint = $props.id();
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

		<!-- The same round box as a task's. The hint is indented to the words: the box (28px) and the
		     gap (12px). -->
		<div>
			<Check
				checked={value(category, 'keepDone')}
				label="Keep done tasks in view"
				describedby={keepDoneHint}
				onchange={(checked) =>
					amber.act('Setting changed', (context) =>
						updateCategory(context, category, { keepDone: checked })
					)}
			>
				<span class="font-medium" aria-hidden="true">Keep done tasks in view</span>
			</Check>
			<p id={keepDoneHint} class="mt-1 pl-10 text-sm text-muted">
				With the date they were done, like a bucket list. Otherwise they tuck away below.
			</p>
		</div>

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
