<!-- A tag's name and color, and deleting it. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { clean, deleteTag, renameTag, setTagColor } from '#lib/model/actions.js';
	import { findTag, get, value, LIMITS } from '#lib/model/list.js';
	import { field, label, secondaryButton } from '#lib/styles.js';
	import ColorChoice from './ColorChoice.svelte';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	let { identifier, onclose }: { identifier: string | undefined; onclose: () => void } = $props();
	const tag = $derived(identifier ? get(amber.records, identifier, 'tag') : undefined);

	/** The other tag that already has the name typed, if renaming stopped on one. */
	let clash: string | undefined = $state();
	// A different tag, or none, starts without the error.
	$effect(() => {
		void identifier;
		clash = undefined;
	});
</script>

<Sheet open={!!tag} title={tag ? `Tag: #${value(tag, 'name')}` : 'Tag'} {onclose}>
	{#if tag}
		<div>
			<label for="tag-name" class={label}>Name</label>
			<input
				id="tag-name"
				class={field}
				value={value(tag, 'name')}
				maxlength={LIMITS.name}
				aria-invalid={clash ? 'true' : undefined}
				aria-describedby={clash ? 'tag-name-error' : undefined}
				oninput={() => (clash = undefined)}
				onchange={(event) => {
					const typed = event.currentTarget.value;
					const changed = amber.act('Renamed', (context) => renameTag(context, tag, typed));
					if (changed?.length) return;
					// Kept as typed when the name is taken, so it can be changed; put back otherwise.
					const name = clean(typed, LIMITS.name).replace(/^#/, '');
					const other = name ? findTag(amber.records, name) : undefined;
					if (other && other.identifier !== tag.identifier) clash = value(other, 'name');
					else event.currentTarget.value = value(tag, 'name');
				}}
			/>
			{#if clash}
				<p id="tag-name-error" class="mt-1.5 text-sm" role="alert">
					There's already a tag called #{clash}. Pick a different name.
				</p>
			{/if}
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
