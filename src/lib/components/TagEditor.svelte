<!-- A tag's name and color, and deleting it. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { deleteTag, renameTag, setTagColor } from '#lib/model/actions.js';
	import { get, value, LIMITS } from '#lib/model/list.js';
	import { field, label, secondaryButton } from '#lib/styles.js';
	import ColorChoice from './ColorChoice.svelte';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	let { identifier, onclose }: { identifier: string | undefined; onclose: () => void } = $props();
	const tag = $derived(identifier ? get(amber.records, identifier, 'tag') : undefined);
</script>

<Sheet open={!!tag} title="Tag" {onclose}>
	{#if tag}
		<div>
			<label for="tag-name" class={label}>Name</label>
			<input
				id="tag-name"
				class={field}
				value={value(tag, 'name')}
				maxlength={LIMITS.name}
				onchange={(event) => {
					const changed = amber.act('Renamed', (context) =>
						renameTag(context, tag, event.currentTarget.value)
					);
					if (!changed?.length) event.currentTarget.value = value(tag, 'name');
				}}
			/>
			<p class="mt-1.5 text-sm text-muted">
				Another tag with the same name can't be made; pick a different one.
			</p>
		</div>
		<ColorChoice
			label="Color"
			value={value(tag, 'color')}
			onchange={(color) =>
				amber.act('Color changed', (context) => setTagColor(context, tag, color))}
		/>
		<div class="border-t border-border pt-5">
			<button
				type="button"
				class="{secondaryButton} w-full"
				onclick={() => {
					amber.act(`Deleted: #${value(tag, 'name')}`, (context) => deleteTag(context, tag));
					onclose();
				}}
			>
				<Icon name="trash" /> Delete tag
			</button>
			<p class="mt-2 text-sm text-muted">The tasks stay; only the tag comes off them.</p>
		</div>
	{/if}
</Sheet>
