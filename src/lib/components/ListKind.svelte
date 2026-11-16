<!-- What kind of list a category is: a to-do list, whose done tasks fold away, or a bucket list,
     whose done ones are achieved and kept on a shelf with their date. Saved as the category's
     keepDone. A real radio group, drawn like the Any, Open and Done switch: arrow keys move, and the
     chosen one is filled, not only colored. -->
<script lang="ts">
	let {
		bucket,
		onchange,
		legend = 'Kind of list'
	}: { bucket: boolean; onchange: (bucket: boolean) => void; legend?: string } = $props();

	const name = $props.id();
	const kinds = [
		{ bucket: false, label: 'To-do list', hint: 'Done tasks fold away below.' },
		{ bucket: true, label: 'Bucket list', hint: 'Achieved ones are kept, with the date.' }
	];
	const chosen = $derived(kinds.find((kind) => kind.bucket === bucket) ?? kinds[0]);
</script>

<fieldset>
	<legend class="mb-1.5 text-sm font-medium">{legend}</legend>
	<div class="inline-flex flex-wrap gap-1 rounded-md border border-control-border p-1">
		{#each kinds as kind (kind.label)}
			<label class="relative cursor-pointer">
				<input
					type="radio"
					{name}
					class="peer sr-only"
					checked={kind.bucket === bucket}
					onchange={() => onchange(kind.bucket)}
				/>
				<span
					class="flex min-h-9 items-center rounded-sm px-4 text-sm transition-colors peer-checked:bg-text peer-checked:font-semibold peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus motion-reduce:transition-none pointer-coarse:min-h-11"
					>{kind.label}</span
				>
			</label>
		{/each}
	</div>
	<p class="mt-1.5 text-sm text-muted">{chosen.hint}</p>
</fieldset>
