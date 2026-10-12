<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Page not found' : 'Something went wrong'} · Itrium</title>
</svelte:head>

<section class="mx-auto max-w-5xl px-5 py-24 sm:px-8">
	<h1 class="text-4xl font-bold tracking-tight">
		{page.status === 404 ? "There's nothing here." : 'Something went wrong.'}
	</h1>
	<p class="mt-5 text-lg text-muted">
		<a href={resolve('/')} class="underline underline-offset-4 hover:text-text"
			>Back to your lists</a
		>
	</p>
</section>
