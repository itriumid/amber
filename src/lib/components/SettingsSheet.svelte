<!-- Settings for this browser: the theme, and whether single keys work as shortcuts. Opened from the
     sidebar on any screen, so a phone reaches them too; the list of shortcuts is a step further, for
     where there's a keyboard. Kept in this browser only (settings.svelte.ts). -->
<script lang="ts">
	import { settings } from '#lib/settings.svelte.js';
	import { smallButton } from '#lib/styles.js';
	import Box from './Box.svelte';
	import Sheet from './Sheet.svelte';
	import ThemeChoice from './ThemeChoice.svelte';

	let {
		open,
		onclose,
		onshortcuts
	}: { open: boolean; onclose: () => void; onshortcuts: () => void } = $props();

	const prefix = $props.id();
</script>

<Sheet {open} title="Settings" {onclose} focusField={false}>
	<ThemeChoice />

	<div>
		<Box
			checked={settings.singleKeyShortcuts}
			describedby="{prefix}-single-key-hint"
			onchange={(on) => settings.setSingleKeyShortcuts(on)}
			><span class="font-medium">Single-key shortcuts</span></Box
		>
		<p id="{prefix}-single-key-hint" class="mt-1.5 text-sm text-muted">
			N, S, / and ? work anywhere outside a text field. Turn them off if you press them by mistake
			or use speech input.
		</p>
		<!-- The whole list, where there's a keyboard to use it. -->
		<div class="mt-3 hidden pointer-fine:block">
			<button type="button" class={smallButton} onclick={onshortcuts}>Keyboard shortcuts</button>
		</div>
	</div>
</Sheet>
