<!-- A square checkbox, filled in the text color when it's on: for a setting, an acknowledgement or a
     choice, never a task ticked off, which is the round pink box (Check.svelte). The same square as
     choosing tasks. A real checkbox in a label, so the words beside it tick it too; on a touch screen
     the row is 44px high. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		checked = $bindable(false),
		box = $bindable(),
		describedby,
		onchange,
		children
	}: {
		checked?: boolean;
		/** The checkbox, for a sheet to put focus on. */
		box?: HTMLInputElement;
		/** The identifier of a hint, for `aria-describedby`. */
		describedby?: string;
		onchange?: (checked: boolean) => void;
		/** The words beside it, which name it. */
		children: Snippet;
	} = $props();
</script>

<label class="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm pointer-coarse:min-h-11">
	<span class="inline-grid shrink-0 place-items-center">
		<input
			type="checkbox"
			class="peer col-start-1 row-start-1 size-5 cursor-pointer appearance-none rounded-sm border-2 border-control-border checked:border-text checked:bg-text"
			bind:this={box}
			bind:checked
			aria-describedby={describedby}
			onchange={(event) => onchange?.(event.currentTarget.checked)}
		/>
		<Icon
			name="check"
			class="pointer-events-none col-start-1 row-start-1 size-3.5 text-bg opacity-0 peer-checked:opacity-100"
		/>
	</span>
	<span>{@render children()}</span>
</label>
