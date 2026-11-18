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
	import RecoveryCode from './RecoveryCode.svelte';
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

	// A new recovery code, in place of a lost one: shown once, and the sheet stays open until it's
	// kept, as when the list was locked.
	let codePassphrase = $state('');
	let codeProblem = $state<string>();
	let newCode = $state<string>();
	let codeKept = $state(false);
	let mustKeep = $state(false);
	let codeBox: HTMLInputElement | undefined = $state();
	$effect(() => {
		void identifier;
		codePassphrase = '';
		codeProblem = newCode = undefined;
		codeKept = mustKeep = false;
	});

	async function makeRecoveryCode(event: SubmitEvent) {
		event.preventDefault();
		if (!category) return;
		const code = await locks.newRecoveryCode(category, codePassphrase);
		if (!code) {
			codeProblem = "That passphrase doesn't fit. A recovery code can't make another one.";
			return;
		}
		codePassphrase = '';
		codeProblem = undefined;
		codeKept = mustKeep = false;
		newCode = code;
	}
</script>

<!-- Named for what's being edited, so a screen reader hears which one. -->
<Sheet
	open={!!category}
	title={category
		? `${parent ? 'Subcategory' : 'Category'}: ${value(category, 'name')}`
		: 'Category'}
	{onclose}
	held={!!newCode && !codeKept}
	onheld={() => {
		mustKeep = true;
		codeBox?.focus();
	}}
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
			<details class="group/recovery" open={!!newCode}>
				<summary class="cursor-pointer text-sm font-medium">Make a new recovery code</summary>
				<div class="mt-3 space-y-3">
					{#if newCode}
						<p class="text-sm">
							Everything in {value(category, 'name')} is sealed again, so the old code no longer opens
							it, only copies made before now. Keep this one somewhere safe, apart from this device.
						</p>
						<RecoveryCode code={newCode} bind:kept={codeKept} bind:box={codeBox} {mustKeep} />
						<button
							type="button"
							class={secondaryButton}
							disabled={!codeKept}
							onclick={() => (newCode = undefined)}>Done</button
						>
					{:else if !isOpen}
						<p class="text-sm text-muted">
							Open {value(category, 'name')} first, to make a new code.
						</p>
					{:else}
						<form class="space-y-3" onsubmit={makeRecoveryCode}>
							<p class="text-sm text-muted">
								For a lost code. The old one stops working, and the passphrase stays as it is.
							</p>
							<div>
								<label for="{prefix}-code-passphrase" class={label}>Passphrase</label>
								<input
									id="{prefix}-code-passphrase"
									type="password"
									class={field}
									bind:value={codePassphrase}
									oninput={() => (codeProblem = undefined)}
									autocomplete="current-password"
									aria-invalid={!!codeProblem}
									aria-describedby={codeProblem ? `${prefix}-code-problem` : undefined}
								/>
							</div>
							{#if codeProblem}
								<p id="{prefix}-code-problem" class="text-sm" role="alert">{codeProblem}</p>
							{/if}
							<button type="submit" class={secondaryButton} disabled={!codePassphrase}
								>Make a new code</button
							>
						</form>
					{/if}
				</div>
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
