<!-- Keeping copies of the list and moving it: a file, a link, a file brought in, and the copies
     this device keeps by itself. Nothing here leaves the browser unless someone takes it. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { listSnapshots, type Snapshot } from '#lib/storage.js';
	import { field, label, smallButton } from '#lib/styles.js';
	import {
		fileName,
		isNothing,
		LINK_LIMIT,
		previewRestore,
		summarize,
		toFile,
		toLink
	} from '#lib/transfer.js';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	let {
		open,
		onclose,
		onfile
	}: { open: boolean; onclose: () => void; onfile: (text: string) => void } = $props();

	const prefix = $props.id();
	let passphrase = $state('');
	let link = $state<string>();
	let linkProblem = $state<string>();
	let copied = $state(false);
	let busy = $state(false);
	let canShareFiles = $state(false);
	let snapshots = $state.raw<Snapshot[]>([]);
	let confirming = $state<number>();
	let fileInput: HTMLInputElement | undefined = $state();

	const heading = 'mb-1 text-base font-semibold';
	const hint = 'text-sm text-muted';
	const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' });

	$effect(() => {
		if (!open) return;
		link = undefined;
		linkProblem = undefined;
		confirming = undefined;
		canShareFiles = !!navigator.canShare?.({
			files: [new File(['{}'], 'amber.json', { type: 'application/json' })]
		});
		listSnapshots()
			.then((found) => (snapshots = found))
			.catch(() => (snapshots = []));
	});

	const file = async () =>
		new File([await toFile($state.snapshot(amber.records), passphrase || undefined)], fileName(), {
			type: 'application/json'
		});

	async function download() {
		busy = true;
		try {
			const url = URL.createObjectURL(await file());
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = fileName();
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
		} finally {
			busy = false;
		}
	}

	async function share() {
		busy = true;
		try {
			await navigator.share({ files: [await file()], title: 'Amber' });
		} catch {
			// Closing the share sheet without picking anything lands here too; there's nothing to say.
		} finally {
			busy = false;
		}
	}

	async function makeLink() {
		busy = true;
		copied = false;
		try {
			const hash = await toLink($state.snapshot(amber.records), passphrase || undefined);
			if (location.origin.length + hash.length > LINK_LIMIT) {
				link = undefined;
				linkProblem = 'This list is too long for a link. Download a file instead.';
			} else {
				linkProblem = undefined;
				link = `${location.origin}/${hash}`;
			}
		} finally {
			busy = false;
		}
	}

	async function copyLink() {
		if (!link) return;
		await navigator.clipboard.writeText(link);
		copied = true;
	}

	async function openFile() {
		const chosen = fileInput?.files?.[0];
		if (!chosen) return;
		const text = await chosen.text();
		if (fileInput) fileInput.value = '';
		onfile(text);
	}

	async function putBack(snapshot: Snapshot) {
		await amber.restoreSnapshot(snapshot);
		onclose();
	}
</script>

<Sheet {open} title="Back up and move" {onclose}>
	<div>
		<label for="{prefix}-passphrase" class={label}
			>Passphrase <span class="font-normal text-muted">(optional)</span></label
		>
		<input
			id="{prefix}-passphrase"
			type="password"
			class={field}
			bind:value={passphrase}
			oninput={() => (link = undefined)}
			autocomplete="new-password"
			aria-describedby="{prefix}-passphrase-hint"
		/>
		<p id="{prefix}-passphrase-hint" class="mt-1.5 {hint}">
			Locks the file and the link. Nobody can open them without it, us included, so keep it
			somewhere safe.
		</p>
	</div>

	<section aria-labelledby="{prefix}-file">
		<h3 id="{prefix}-file" class={heading}>Keep a copy</h3>
		<p class={hint}>
			Download your list as a file, to keep somewhere safe or open on another device.
		</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<button type="button" class={smallButton} disabled={busy} onclick={download}>
				{#if passphrase}<Icon name="lock" />{/if}Download a file
			</button>
			{#if canShareFiles}
				<button type="button" class={smallButton} disabled={busy} onclick={share}
					>Share the file</button
				>
			{/if}
		</div>
	</section>

	<section aria-labelledby="{prefix}-link">
		<h3 id="{prefix}-link" class={heading}>Move with a link</h3>
		<p class={hint}>
			The link holds the whole list. Open it on another device to bring the list there. It never
			passes through a server of ours.
		</p>
		{#if !passphrase}
			<p class="mt-2 text-sm">
				Anyone with the link can read the list. Add a passphrase to lock it.
			</p>
		{/if}
		<div class="mt-3 flex flex-wrap gap-2">
			<button type="button" class={smallButton} disabled={busy} onclick={makeLink}>
				{#if passphrase}<Icon name="lock" />{/if}Make a link
			</button>
		</div>
		{#if linkProblem}
			<p class="mt-2 text-sm" role="alert">{linkProblem}</p>
		{/if}
		{#if link}
			<div class="mt-3 flex gap-2">
				<label for="{prefix}-made-link" class="sr-only">Link to the list</label>
				<input
					id="{prefix}-made-link"
					class="{field} min-w-0 font-mono text-xs"
					readonly
					value={link}
					onfocus={(event) => event.currentTarget.select()}
				/>
				<button type="button" class="{smallButton} shrink-0" onclick={copyLink}>
					{copied ? 'Copied' : 'Copy'}
				</button>
			</div>
			<p class="sr-only" role="status">{copied ? 'Link copied' : ''}</p>
		{/if}
	</section>

	<section aria-labelledby="{prefix}-bring">
		<h3 id="{prefix}-bring" class={heading}>Bring in a list</h3>
		<p class={hint}>
			Open a file from Amber. It's added to your list: nothing you have is lost, and you can undo
			it.
		</p>
		<label
			class="{smallButton} has-focus-visible:outline-focus mt-3 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
		>
			Open a file
			<input
				bind:this={fileInput}
				type="file"
				accept="application/json,.json"
				class="sr-only"
				disabled={amber.readOnly}
				onchange={openFile}
			/>
		</label>
	</section>

	<section aria-labelledby="{prefix}-copies">
		<h3 id="{prefix}-copies" class={heading}>Copies on this device</h3>
		<p class={hint}>
			Amber keeps a copy each day, and before anything that changes a lot at once. Putting one back
			can be undone too.
		</p>
		{#if snapshots.length}
			<ul class="mt-3 divide-y divide-border">
				{#each snapshots as snapshot (snapshot.key)}
					<li class="py-3">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0 text-sm">
								<p class="font-medium">{when.format(snapshot.takenAt)}</p>
								<p class="text-muted">
									{snapshot.reason} · {snapshot.tasks}
									{snapshot.tasks === 1 ? 'task' : 'tasks'}
								</p>
							</div>
							{#if confirming !== snapshot.key}
								<button
									type="button"
									class="{smallButton} shrink-0"
									disabled={amber.readOnly}
									onclick={() => (confirming = snapshot.key)}
									aria-label="Put back the copy from {when.format(snapshot.takenAt)}"
									>Put back</button
								>
							{/if}
						</div>
						{#if confirming === snapshot.key}
							{@const preview = previewRestore($state.snapshot(amber.records), snapshot.records)}
							<div class="mt-3 rounded-lg bg-bg p-3 text-sm">
								{#if isNothing(preview)}
									<p>Your list is the same as this copy.</p>
									<button
										type="button"
										class="{smallButton} mt-3"
										onclick={() => (confirming = undefined)}>Close</button
									>
								{:else}
									<p>{summarize(preview)}</p>
									<div class="mt-3 flex gap-2">
										<button
											type="button"
											class="{smallButton} border-transparent bg-accent font-semibold text-on-accent hover:bg-accent hover:opacity-85"
											onclick={() => putBack(snapshot)}>Put it back</button
										>
										<button
											type="button"
											class={smallButton}
											onclick={() => (confirming = undefined)}>Cancel</button
										>
									</div>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-3 text-sm text-muted">
				None yet. The first is kept tomorrow, or before you bring in a list.
			</p>
		{/if}
	</section>
</Sheet>
