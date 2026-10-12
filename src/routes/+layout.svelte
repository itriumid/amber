<script lang="ts">
	import '../app.css';

	const { children } = $props();
</script>

<a
	href="#main"
	class="absolute -top-full left-4 z-40 rounded-b-lg bg-accent px-4 py-2 font-semibold text-on-accent focus:top-0"
	>Skip to the list</a
>

{@render children()}
