<!-- Picks one of the category colors, or none. A real radio group: arrow keys move, each choice is
     named, and the chosen one is marked by a ring and a check, not by color alone. -->
<script lang="ts">
	import { COLOR_NAMES, DOT } from '#lib/colors.js';
	import { COLORS, type Color } from '#lib/model/list.js';

	let {
		value,
		onchange,
		label
	}: { value: Color | null; onchange: (color: Color | null) => void; label: string } = $props();
	const name = `color-${Math.random().toString(36).slice(2)}`;
	const choices: (Color | null)[] = [null, ...COLORS];
</script>

<fieldset>
	<legend class="mb-2 text-sm font-medium">{label}</legend>
	<div class="flex flex-wrap gap-2">
		{#each choices as choice (choice ?? 'none')}
			<label class="relative cursor-pointer">
				<input
					type="radio"
					{name}
					class="peer sr-only"
					checked={value === choice}
					onchange={() => onchange(choice)}
				/>
				<span
					class="peer-focus-visible:outline-focus flex size-9 items-center justify-center rounded-full border-2 border-transparent text-xs transition-colors peer-checked:border-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 motion-reduce:transition-none"
				>
					{#if choice}
						<span class="size-6 rounded-full {DOT[choice]}" aria-hidden="true"></span>
					{:else}
						<span
							class="flex size-6 items-center justify-center rounded-full border border-dashed border-control-border text-muted"
							aria-hidden="true">–</span
						>
					{/if}
				</span>
				<span class="sr-only">{choice ? COLOR_NAMES[choice] : 'No color'}</span>
			</label>
		{/each}
	</div>
</fieldset>
