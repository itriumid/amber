<!-- How to install Amber in Safari, which has no prompt of its own, and how to bring the list
     along: on Apple devices an installed Amber keeps its own storage, apart from Safari's. -->
<script lang="ts">
	import type { Way } from '#lib/install.svelte.js';
	import Sheet from './Sheet.svelte';

	let {
		way,
		onclose,
		onbackup
	}: { way: Way | undefined; onclose: () => void; onbackup: () => void } = $props();

	const heading = 'mb-2 text-base font-semibold';
</script>

<Sheet open={way === 'apple-phone' || way === 'apple-computer'} title="Install Amber" {onclose}>
	<section>
		<h3 class={heading}>In Safari</h3>
		<ol class="list-decimal space-y-1 pl-5 text-sm">
			{#if way === 'apple-phone'}
				<li>Tap <span class="font-semibold">Share</span> in Safari's toolbar.</li>
				<li>Choose <span class="font-semibold">Add to Home Screen</span>.</li>
			{:else}
				<li>Choose <span class="font-semibold">File</span> in the menu bar.</li>
				<li>Choose <span class="font-semibold">Add to Dock</span>.</li>
			{/if}
		</ol>
		<p class="mt-3 text-sm text-muted">
			Installed, Amber opens like an application and works offline. Safari can also clear a site's
			data when it hasn't been opened for a while; an installed Amber keeps its list.
		</p>
	</section>

	<section>
		<h3 class={heading}>Bring your list along</h3>
		<p class="text-sm">
			The installed Amber starts with a list of its own. To bring this one there:
		</p>
		<ol class="mt-2 list-decimal space-y-1 pl-5 text-sm">
			<li>
				Here, open <button
					type="button"
					class="font-semibold underline underline-offset-4"
					onclick={onbackup}>Back up and move</button
				>, make a link, and copy it.
			</li>
			<li>In the installed Amber, open Back up and move, and paste the link.</li>
		</ol>
	</section>
</Sheet>
