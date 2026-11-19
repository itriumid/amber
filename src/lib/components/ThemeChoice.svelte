<!-- Light or dark, or as the device is set: drawn like the kind of list, a real radio group. Kept in
     this browser only (settings.svelte.ts), and applied before drawing by static/theme.js. -->
<script lang="ts">
	import { settings, type Theme } from '#lib/settings.svelte.js';

	const name = $props.id();
	const themes: { theme: Theme; label: string }[] = [
		// The brand's names for the setting: System, Light, Dark.
		{ theme: 'device', label: 'System' },
		{ theme: 'light', label: 'Light' },
		{ theme: 'dark', label: 'Dark' }
	];
</script>

<fieldset>
	<legend class="mb-1.5 text-sm font-medium">Theme</legend>
	<div class="inline-flex flex-wrap gap-1 rounded-md border border-control-border p-1">
		{#each themes as each (each.theme)}
			<label class="relative cursor-pointer">
				<input
					type="radio"
					{name}
					value={each.theme}
					class="peer sr-only"
					checked={settings.theme === each.theme}
					onchange={() => settings.setTheme(each.theme)}
				/>
				<span
					class="flex min-h-9 items-center rounded-sm px-3 text-sm transition-colors peer-checked:bg-surface peer-checked:font-semibold peer-checked:ring-[1.5px] peer-checked:ring-text peer-checked:ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus motion-reduce:transition-none pointer-coarse:min-h-11"
					>{each.label}</span
				>
			</label>
		{/each}
	</div>
</fieldset>
