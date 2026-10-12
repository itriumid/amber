<!-- Small line icons drawn here, so nothing is loaded from elsewhere. Decorative: the control that
     holds one always has its own name. -->
<script lang="ts">
	const PATHS = {
		plus: 'M12 5v14M5 12h14',
		close: 'M6 6l12 12M18 6L6 18',
		up: 'M6 15l6-6 6 6',
		down: 'M6 9l6 6 6-6',
		trash:
			'M5 7h14M10 11v6M14 11v6M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2',
		menu: 'M4 7h16M4 12h16M4 17h16',
		edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
		notes: 'M6 4h9l3 3v13H6zM9 11h6M9 15h6',
		steps: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
		promote: 'M12 19V5M6 11l6-6 6 6',
		tag: 'M4 4h7l9 9-7 7-9-9V4zM8 8h.01',
		check: 'M5 12l5 5L19 7',
		search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4'
	} as const;

	let { name, class: className = 'size-4' }: { name: keyof typeof PATHS; class?: string } =
		$props();
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	fill="none"
	viewBox="0 0 24 24"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={PATHS[name]} />
</svg>
