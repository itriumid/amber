<!-- What kind of list a category is: a to-do list, whose done tasks fold away; a bucket list, whose
     done ones are achieved and kept on a shelf with their date; or a locked list, encrypted with its
     own passphrase (docs/locked-lists.md). A bucket list is the category's keepDone, and a locked
     list is a category with a lock. Never locked unless chosen. A real radio group, drawn like the
     Any, Open and Done switch: arrow keys move, and the chosen one is filled, not only colored. -->
<script lang="ts" module>
	export type ListKindName = 'todo' | 'bucket' | 'locked';
</script>

<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		kind,
		onchange,
		legend = 'Kind of list'
	}: { kind: ListKindName; onchange: (kind: ListKindName) => void; legend?: string } = $props();

	const name = $props.id();
	// Short on screen, so the three fit the sidebar on one line; said in full, which contains them.
	const kinds: { kind: ListKindName; label: string; short: string; hint: string }[] = [
		{ kind: 'todo', label: 'To-do list', short: 'To-do', hint: 'Done tasks fold away below.' },
		{
			kind: 'bucket',
			label: 'Bucket list',
			short: 'Bucket',
			hint: 'Achieved ones are kept, with the date.'
		},
		{
			kind: 'locked',
			label: 'Locked list',
			short: 'Locked',
			hint: 'Encrypted with its own passphrase, and closed until you open it.'
		}
	];
	const chosen = $derived(kinds.find((each) => each.kind === kind) ?? kinds[0]);
</script>

<fieldset>
	<legend class="mb-1.5 text-sm font-medium">{legend}</legend>
	<div class="inline-flex flex-wrap gap-1 rounded-md border border-control-border p-1">
		{#each kinds as each (each.kind)}
			<label class="relative cursor-pointer">
				<input
					type="radio"
					{name}
					value={each.kind}
					class="peer sr-only"
					checked={each.kind === kind}
					onchange={(event) => {
						onchange(each.kind);
						// A choice that asks for something first (a passphrase) isn't made yet: the radios go
						// back to what the list is. Svelte won't rewrite a value it thinks it already wrote.
						for (const radio of event.currentTarget
							.closest('fieldset')!
							.querySelectorAll<HTMLInputElement>('input[type=radio]'))
							radio.checked = radio.value === kind;
					}}
				/>
				<span
					class="flex min-h-9 items-center gap-1.5 rounded-sm px-3 text-sm transition-colors peer-checked:bg-text peer-checked:font-semibold peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus motion-reduce:transition-none pointer-coarse:min-h-11"
					>{#if each.kind === 'locked'}<Icon name="lock" class="size-3.5" />{/if}<span
						aria-hidden="true">{each.short}</span
					><span class="sr-only">{each.label}</span></span
				>
			</label>
		{/each}
	</div>
	<p class="mt-1.5 text-sm text-muted">{chosen.hint}</p>
</fieldset>
