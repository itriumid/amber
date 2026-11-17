<!-- A category's settings: its name, whether it's a to-do, bucket or locked list, a locked list's
     passphrase, its color, its subcategories, its place in the list, and deleting it. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { locks } from '#lib/locks.svelte.js';
	import { MINIMUM_PASSPHRASE } from '#lib/sealing.js';
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
	import ListKind, { type ListKindName } from './ListKind.svelte';
	import Sheet from './Sheet.svelte';

	let {
		identifier,
		onclose,
		onopen,
		onlock,
		onopenlock
	}: {
		identifier: string | undefined;
		onclose: () => void;
		onopen: (identifier: string) => void;
		/** Asks for a passphrase and locks the list. */
		onlock: (identifier: string) => void;
		/** Asks for a locked list's passphrase, to open it. */
		onopenlock: (identifier: string) => void;
	} = $props();

	const category = $derived(identifier ? get(amber.records, identifier, 'category') : undefined);
	const parent = $derived(
		category ? get(amber.records, value(category, 'parentIdentifier'), 'category') : undefined
	);
	const siblings = $derived(category ? categorySiblings(amber.records, category) : []);
	const position = $derived(
		category ? siblings.findIndex((sibling) => sibling.identifier === category.identifier) : -1
	);
	let newChild = $state('');
	const locked = $derived(!!category && !!value(category, 'lock'));
	const isOpen = $derived(!!category && locks.isOpen(category.identifier));
	const kind = $derived<ListKindName>(
		locked ? 'locked' : category && value(category, 'keepDone') ? 'bucket' : 'todo'
	);

	function choose(next: ListKindName) {
		if (!category || next === kind) return;
		if (next === 'locked') return onlock(category.identifier);
		if (locked) {
			// Making it ordinary needs it open, to put its tasks back in plain text.
			if (isOpen) locks.unlockForGood(category, next === 'bucket');
			else onopenlock(category.identifier);
			return;
		}
		amber.act(next === 'bucket' ? 'Made a bucket list' : 'Made a to-do list', (context) =>
			updateCategory(context, category, { keepDone: next === 'bucket' })
		);
	}

	const prefix = $props.id();
	let current = $state('');
	let next = $state('');
	let again = $state('');
	let passphraseProblem = $state<string>();
	let passphraseChanged = $state(false);

	async function changePassphrase(event: SubmitEvent) {
		event.preventDefault();
		if (!category) return;
		if (next.length < MINIMUM_PASSPHRASE)
			passphraseProblem = `Use at least ${MINIMUM_PASSPHRASE} characters for the new one.`;
		else if (next !== again)
			passphraseProblem = 'The two new passphrases are different. Type the same one in both.';
		else if (!(await locks.changePassphrase(category, current, next)))
			passphraseProblem = "The current passphrase or recovery code doesn't fit.";
		else {
			current = next = again = '';
			passphraseProblem = undefined;
			passphraseChanged = true;
		}
	}
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

		<div>
			<ListKind {kind} onchange={choose} />
			{#if locked}
				<p class="mt-1.5 text-sm text-muted">
					{isOpen
						? 'Choosing another kind puts its tasks back in plain text.'
						: 'To make it another kind, open it first.'}
				</p>
			{/if}
		</div>

		{#if locked}
			<details class="group/passphrase">
				<summary class="cursor-pointer text-sm font-medium">Change the passphrase</summary>
				<form class="mt-3 space-y-3" onsubmit={changePassphrase}>
					<div>
						<label for="{prefix}-current" class={label}>Current passphrase or recovery code</label>
						<input
							id="{prefix}-current"
							type="password"
							class={field}
							bind:value={current}
							autocomplete="current-password"
						/>
					</div>
					<div>
						<label for="{prefix}-next" class={label}>New passphrase</label>
						<input
							id="{prefix}-next"
							type="password"
							class={field}
							bind:value={next}
							autocomplete="new-password"
						/>
					</div>
					<div>
						<label for="{prefix}-again" class={label}>Type the new one again</label>
						<input
							id="{prefix}-again"
							type="password"
							class={field}
							bind:value={again}
							autocomplete="new-password"
						/>
					</div>
					{#if passphraseProblem}<p class="text-sm" role="alert">{passphraseProblem}</p>{/if}
					<p class="text-sm" role="status">{passphraseChanged ? 'Passphrase changed.' : ''}</p>
					<button
						type="submit"
						class={secondaryButton}
						disabled={!current || !next}
						onclick={() => (passphraseChanged = false)}>Change passphrase</button
					>
				</form>
			</details>
		{/if}

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
				onclick={async () => {
					if (locked) {
						// Its tasks go with it, so a copy is kept first, as for deleting several tasks.
						await amber.keepCopy(`Before deleting ${value(category, 'name')}`);
						amber.act(`Deleted: ${value(category, 'name')} and its tasks`, (context) =>
							deleteCategory(context, category)
						);
					} else
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
				{locked
					? "Deleting a locked list deletes its tasks too, since they can't be read anywhere else."
					: "Deleting keeps the tasks: a subcategory's move to its parent, a category's to No category."}
			</p>
		</div>
	{/if}
</Sheet>
