<!-- Under a passphrase field: whether Caps Lock is on, the usual reason one doesn't fit. Read from the
     keys pressed in the field, since a page can't ask before a key is pressed. -->
<script lang="ts">
	let { on }: { on: boolean } = $props();
</script>

<p class="mt-1.5 text-sm" role="status">{on ? 'Caps Lock is on.' : ''}</p>
