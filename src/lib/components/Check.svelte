<!-- A round checkbox whose check draws itself. It's a real checkbox underneath, so keyboards, screen
     readers and forms treat it as one; the drawing is decoration on top. It sits in a label, so the
     space around it ticks it too: on a touch screen that space reaches 44px, drawn into the margin
     around it, so the circle and the layout stay the size they are. Text passed in sits inside the
     same label. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		checked,
		label,
		onchange,
		small = false,
		disabled = false,
		describedby,
		children
	}: {
		checked: boolean;
		label: string;
		onchange: (checked: boolean) => void;
		small?: boolean;
		disabled?: boolean;
		/** The identifier of a hint, for `aria-describedby`. */
		describedby?: string;
		/** Text beside the box, which ticks it too. Hide it from screen readers: `label` names the box. */
		children?: Snippet;
	} = $props();

	// Svelte skips writing `checked` when it matches the last value it wrote, but a click changes the
	// box without telling it. A row brought back by Undo in the middle of sliding away would then stay
	// ticked, so the box is told every time.
	function keepInStep(input: HTMLInputElement) {
		input.checked = checked;
	}
</script>

<label
	class="inline-flex shrink-0 items-center gap-3 {disabled ? '' : 'cursor-pointer'} {small
		? 'pointer-coarse:-m-2.5 pointer-coarse:p-2.5'
		: 'pointer-coarse:-m-2 pointer-coarse:p-2'}"
>
	<span class="relative inline-grid shrink-0 place-items-center {small ? 'size-6' : 'size-7'}">
		<input
			type="checkbox"
			{checked}
			{@attach keepInStep}
			{disabled}
			aria-label={label}
			aria-describedby={describedby}
			onchange={(event) => onchange(event.currentTarget.checked)}
			class="peer col-start-1 row-start-1 cursor-pointer appearance-none rounded-full border-2 border-control-border transition-colors duration-200 checked:border-accent-edge checked:bg-accent disabled:cursor-not-allowed motion-reduce:transition-none {small
				? 'size-5'
				: 'size-6'}"
		/>
		<svg
			class="pointer-events-none col-start-1 row-start-1 text-on-accent opacity-0 peer-checked:opacity-100 {small
				? 'size-3'
				: 'size-3.5'}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<!-- 24 is the path's length: hidden while unchecked, drawn in when checked. The path is inside
			     the drawing, not beside the box, so `peer-checked` can't reach it: `in-` looks from the drawing,
			     which is beside the box. -->
			<path
				d="M5 12.5l4.5 4.5L19 7.5"
				class="transition-[stroke-dashoffset] duration-300 ease-out [stroke-dasharray:24] [stroke-dashoffset:24] in-[.peer:checked~*]:[stroke-dashoffset:0] motion-reduce:transition-none"
			/>
		</svg>
	</span>
	{@render children?.()}
</label>
