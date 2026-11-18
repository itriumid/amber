<!-- What a merge says when it would add, take off or change a locked list's lock: a lock from
     somewhere else leaves the list's entries sealed under a key nobody here has. Shown before
     bringing a list in and before syncing. -->
<script lang="ts">
	import type { LockChange } from '#lib/transfer.js';
	import Problem from './Problem.svelte';

	let { changes }: { changes: LockChange[] } = $props();
	const said = (each: LockChange) =>
		each.change === 'removed'
			? `Makes ${each.name} an ordinary list again.`
			: each.change === 'added'
				? `Locks ${each.name}, with a passphrase set on the other list.`
				: `Changes the passphrase that opens ${each.name}.`;
</script>

{#each changes as each (each.name)}
	<Problem>{said(each)} If that wasn't you, on another device of yours, don't go on.</Problem>
{/each}
