<!-- The keyboard shortcuts, and the setting that turns the single-key ones off. Opened from the
     sidebar, or with ? while those are on. -->
<script lang="ts">
	import Box from './Box.svelte';
	import { settings } from '#lib/settings.svelte.js';
	import Sheet from './Sheet.svelte';

	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	const prefix = $props.id();
	const key =
		'inline-block min-w-6 rounded-md border border-control-border px-1.5 py-0.5 text-center font-sans text-xs font-semibold';

	// Each key as it's drawn, and as it's said: symbols like ⌘ and ↑ read badly aloud.
	const shortcuts: { action: string; keys: string[][]; said: string }[] = [
		{ action: 'Add a task', keys: [['N']], said: 'N' },
		{ action: 'Search', keys: [['/']], said: 'Slash' },
		{ action: 'Show these shortcuts', keys: [['?']], said: 'Question mark' },
		{ action: 'Choose several tasks', keys: [['S']], said: 'S' },
		{
			action: 'Go from task to task',
			keys: [['↑'], ['↓']],
			said: 'The up or down arrow, in the list'
		},
		{
			action: 'Go along a task',
			keys: [['←'], ['→']],
			said: 'The left or right arrow, in the list'
		},
		{
			action: 'Go to the first or last task',
			keys: [['Home'], ['End']],
			said: 'Home or End, in the list'
		},
		{
			action: 'Open a task',
			keys: [['Enter']],
			said: 'Enter, on a task'
		},
		{
			action: 'Tick a task',
			keys: [['Space']],
			said: 'Space, on its checkbox'
		},
		{
			action: 'Delete a task',
			keys: [['Delete']],
			said: 'Delete, on a task'
		},
		{
			action: 'Move a task up or down',
			keys: [
				['Alt', '↑'],
				['Alt', '↓']
			],
			said: 'Alt with the up or down arrow'
		},
		{
			action: 'Undo',
			keys: [
				['Ctrl', 'Z'],
				['⌘', 'Z']
			],
			said: 'Control Z, or Command Z on a Mac'
		},
		{ action: 'Clear the search', keys: [['Esc']], said: 'Escape, in the search field' }
	];
</script>

<Sheet {open} title="Keyboard shortcuts" {onclose}>
	<dl class="divide-y divide-border text-sm">
		{#each shortcuts as shortcut (shortcut.action)}
			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
				<dt>{shortcut.action}</dt>
				<dd>
					<span class="flex flex-wrap items-center gap-1.5" aria-hidden="true">
						{#each shortcut.keys as combination, index (index)}
							{#if index > 0}<span class="text-muted">or</span>{/if}
							{#each combination as part, place (place)}
								{#if place > 0}<span class="text-muted">+</span>{/if}<kbd class={key}>{part}</kbd>
							{/each}
						{/each}
					</span>
					<span class="sr-only">{shortcut.said}</span>
				</dd>
			</div>
		{/each}
	</dl>

	<div>
		<!-- A setting: the square box, not the round one that ticks a task off. -->
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
	</div>
</Sheet>
