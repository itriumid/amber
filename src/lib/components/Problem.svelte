<!-- Something to fix before going on, under the field it's about: the warning sign and the words, as
     the problem notice has them, never pink. Said as soon as it appears. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let { id, children }: { id?: string; children: Snippet } = $props();
</script>

<p {id} class="mt-1.5 flex gap-1.5 text-sm" role="alert">
	<Icon name="alert" class="mt-0.5 size-4 shrink-0" />
	<span>{@render children()}</span>
</p>
