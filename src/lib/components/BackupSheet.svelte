<!-- Keeping copies of the list and moving it: a file, a link, a file brought in, and the copies
     this device keeps by itself. Nothing here leaves the browser unless someone takes it. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { backups } from '#lib/backups.svelte.js';
	import { isLink, LINK_PREFIX } from '#lib/links.js';
	import { listSnapshots, type Snapshot } from '#lib/storage.js';
	import { field, label, primaryButton, smallButton, touchTarget } from '#lib/styles.js';
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
		onfile,
		onlink
	}: {
		open: boolean;
		onclose: () => void;
		onfile: (text: string) => void;
		/** A link pasted in: on Apple devices, how a list gets from Safari into an installed Amber. */
		onlink: (hash: string) => void;
	} = $props();

	const prefix = $props.id();
	let passphrase = $state('');
	// Typed twice, unless it's shown: a typo in a passphrase nobody can see would lock the list away
	// for good, since nobody, us included, can open it without the exact one.
	let again = $state('');
	let showPassphrase = $state(false);
	let mismatch = $state(false);
	let againInput: HTMLInputElement | undefined = $state();
	let link = $state<string>();
	let linkProblem = $state<string>();
	let copied = $state(false);
	let busy = $state(false);
	let canShareFiles = $state(false);
	let snapshots = $state.raw<Snapshot[]>([]);
	let confirming = $state<number>();
	let fileInput: HTMLInputElement | undefined = $state();
	let pasted = $state('');
	let pasteProblem = $state<string>();

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

	/** The passphrase to lock with, or false when it was typed twice and the two differ. */
	function lock(): string | undefined | false {
		if (!passphrase) return undefined;
		if (!showPassphrase && again !== passphrase) {
			mismatch = true;
			againInput?.focus();
			return false;
		}
		return passphrase;
	}

	const file = async (key: string | undefined) =>
		new File([await toFile($state.snapshot(amber.records), key)], fileName(), {
			type: 'application/json'
		});

	async function download() {
		const key = lock();
		if (key === false) return;
		busy = true;
		try {
			const url = URL.createObjectURL(await file(key));
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = fileName();
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
			backups.downloaded(amber.taskCount);
		} finally {
			busy = false;
		}
	}

	async function share() {
		const key = lock();
		if (key === false) return;
		busy = true;
		try {
			await navigator.share({ files: [await file(key)], title: 'Amber' });
			backups.downloaded(amber.taskCount);
		} catch {
			// Closing the share sheet without picking anything lands here too; there's nothing to say.
		} finally {
			busy = false;
		}
	}

	async function makeLink() {
		const key = lock();
		if (key === false) return;
		busy = true;
		copied = false;
		try {
			const hash = await toLink($state.snapshot(amber.records), key);
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

	function openLink(event: SubmitEvent) {
		event.preventDefault();
		// Anything around the link (a message it came in, a stray space) is left behind.
		const start = Math.max(pasted.indexOf(LINK_PREFIX.open), pasted.indexOf(LINK_PREFIX.locked));
		const hash = start === -1 ? '' : pasted.slice(start).trim().split(/\s/)[0];
		if (!isLink(hash)) {
			pasteProblem = "That isn't a link to a list from Amber.";
			return;
		}
		pasted = '';
		pasteProblem = undefined;
		onlink(hash);
	}

	async function putBack(snapshot: Snapshot) {
		await amber.restoreSnapshot(snapshot);
		onclose();
	}
</script>

<!-- Grouped by what someone came to do: keep a copy, or move the list. Downloading is the main
     action, since it's what the backup reminder asks for. The passphrase is folded away: it's
     optional, and a password field first makes keeping a copy look like a security procedure. The
     copies this device keeps come last, with the one warning that they go if the browser's data is
     cleared. -->
<Sheet {open} title="Back up and move" {onclose}>
	<section aria-labelledby="{prefix}-file">
		<h3 id="{prefix}-file" class={heading}>Keep a copy</h3>
		<p class={hint}>
			Download your list as a file, to keep somewhere safe or open on another device.
		</p>
		<p class="mt-2 text-sm">
			{#if backups.note?.downloadedAt}
				Last downloaded {when.format(backups.note.downloadedAt)}.
			{:else}
				Not downloaded from this browser yet.
			{/if}
			{#if snapshots.length}
				This device also keeps {snapshots.length === 1 ? 'one copy' : `${snapshots.length} copies`},
				listed at the end.
			{/if}
		</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<button type="button" class={primaryButton} disabled={busy} onclick={download}>
				{#if passphrase}<Icon name="lock" />{/if}Download a file
			</button>
			{#if canShareFiles}
				<button type="button" class={smallButton} disabled={busy} onclick={share}
					>Share the file</button
				>
			{/if}
		</div>

		<details class="group mt-4" open={!!passphrase}>
			<summary
				class="relative flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium {touchTarget}"
			>
				<Icon name="lock" class="size-4" />
				Lock the file and the link
				<span class="font-normal text-muted">(optional)</span>
				<Icon
					name="down"
					class="ml-auto size-4 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
				/>
			</summary>
			<div class="mt-2 space-y-3">
				<div>
					<label for="{prefix}-passphrase" class={label}>Passphrase</label>
					<input
						id="{prefix}-passphrase"
						type={showPassphrase ? 'text' : 'password'}
						class={field}
						bind:value={passphrase}
						oninput={() => {
							link = undefined;
							mismatch = false;
						}}
						autocomplete="new-password"
						autocapitalize="off"
						spellcheck="false"
						aria-describedby="{prefix}-passphrase-hint"
					/>
					<p id="{prefix}-passphrase-hint" class="mt-1.5 {hint}">
						Nobody can open the file or the link without it, us included, so keep it somewhere safe.
						Changing it means making the link again.
					</p>
				</div>
				{#if !showPassphrase}
					<div>
						<label for="{prefix}-again" class={label}>Type it again</label>
						<input
							bind:this={againInput}
							id="{prefix}-again"
							type="password"
							class={field}
							bind:value={again}
							oninput={() => (mismatch = false)}
							autocomplete="new-password"
							aria-invalid={mismatch}
							aria-describedby={mismatch ? `${prefix}-mismatch` : undefined}
						/>
						{#if mismatch}
							<p id="{prefix}-mismatch" class="mt-1.5 text-sm" role="alert">
								The two passphrases are different. Type the same one in both.
							</p>
						{/if}
					</div>
				{/if}
				<label class="relative flex min-h-10 items-center gap-2 text-sm {touchTarget}">
					<input
						type="checkbox"
						class="size-4 accent-accent-edge"
						bind:checked={showPassphrase}
						onchange={() => (mismatch = false)}
					/>
					Show the passphrase
				</label>
			</div>
		</details>
	</section>

	<section aria-labelledby="{prefix}-move">
		<h3 id="{prefix}-move" class={heading}>Move to another device</h3>
		<p class={hint}>
			A link holds the whole list and never passes through a server of ours. Open it on the other
			device to bring the list there. To keep two devices in step, use Sync with another device
			instead.
		</p>
		{#if !passphrase}
			<p class="mt-2 text-sm">Anyone with the link can read the list, unless you lock it.</p>
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

		<h4 id="{prefix}-bring" class="mt-6 text-sm font-semibold">Bring in a list</h4>
		<p class="mt-1 {hint}">
			From a file or a link made in Amber. It's added to your list: nothing you have is lost, and
			you can undo it.
		</p>
		<label
			class="{smallButton} mt-3 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
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
		<form class="mt-4" onsubmit={openLink}>
			<label for="{prefix}-paste" class={label}>Or paste a link</label>
			<div class="flex gap-2">
				<input
					id="{prefix}-paste"
					class="{field} min-w-0"
					bind:value={pasted}
					oninput={() => (pasteProblem = undefined)}
					autocomplete="off"
					aria-invalid={!!pasteProblem}
					aria-describedby={pasteProblem ? `${prefix}-paste-problem` : undefined}
				/>
				<button
					type="submit"
					class="{smallButton} shrink-0"
					disabled={!pasted.trim() || amber.readOnly}>Open</button
				>
			</div>
			{#if pasteProblem}
				<p id="{prefix}-paste-problem" class="mt-1.5 text-sm" role="alert">{pasteProblem}</p>
			{/if}
		</form>
	</section>

	<section aria-labelledby="{prefix}-copies">
		<h3 id="{prefix}-copies" class={heading}>Copies on this device</h3>
		<p class={hint}>
			Amber keeps a copy each day, and before anything that changes a lot at once. Putting one back
			can be undone too. They're in this browser with your list, so if its data is cleared, they go
			with it.
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
											class="{smallButton} border-accent-edge bg-accent font-semibold text-on-accent hover:bg-accent hover:opacity-85"
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
