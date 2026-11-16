<!-- What a merge says when it would delete something: plainly, with the tasks named, since the
     promise is that nothing is lost and a deletion from the other list is the exception. Shown
     before bringing a list in and before syncing. -->
<script lang="ts">
	let { titles, total }: { titles: string[]; total: number } = $props();
</script>

<p class="mt-2 text-sm">
	{total === 1 ? 'One was' : `${total} were`} deleted on the other list, so {total === 1
		? "it'll"
		: "they'll"} be deleted here too. You can undo it afterward.
</p>
{#if titles.length}
	<details class="mt-2 text-sm">
		<summary class="cursor-pointer font-medium underline underline-offset-4">Show which</summary>
		<ul class="mt-2 list-disc space-y-1 pl-5 text-muted">
			{#each titles as title, index (index)}
				<li>{title}</li>
			{/each}
		</ul>
	</details>
{/if}
