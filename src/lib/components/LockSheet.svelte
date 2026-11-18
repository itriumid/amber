<!-- Locking a list, an existing one or a new one by its name (docs/locked-lists.md): a passphrase,
     typed twice or shown, then the recovery code, shown once. A new list is made only here, locked
     from the start. What it protects and what it doesn't is said before anything is locked, and for a
     list that has tasks already, that copies made before still hold them in plain text, with the
     offer to delete this device's own. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { locks } from '#lib/locks.svelte.js';
	import { tasksShownIn } from '#lib/model/actions.js';
	import { get, value } from '#lib/model/list.js';
	import { MINIMUM_PASSPHRASE } from '#lib/sealing.js';
	import { field, label, primaryButton } from '#lib/styles.js';
	import CapsLock from './CapsLock.svelte';
	import Problem from './Problem.svelte';
	import RecoveryCode from './RecoveryCode.svelte';
	import Sheet from './Sheet.svelte';

	let {
		identifier,
		newName,
		onclose,
		onlocked
	}: {
		identifier: string | undefined;
		newName?: string;
		onclose: () => void;
		onlocked?: (identifier: string) => void;
	} = $props();

	const prefix = $props.id();
	const category = $derived(identifier ? get(amber.records, identifier, 'category') : undefined);
	const name = $derived(category ? value(category, 'name') : (newName?.trim() ?? ''));
	const open = $derived(!!category || !!name);
	const hasTasks = $derived(
		category ? tasksShownIn(amber.records, category.identifier).length > 0 : false
	);

	let passphrase = $state('');
	let again = $state('');
	let show = $state(false);
	let deleteCopies = $state(false);
	// How many copies this device keeps have the list in plain text, to offer deleting just those.
	let plainCopies = $state(0);
	$effect(() => {
		const list = category;
		plainCopies = 0;
		if (list && !value(list, 'lock'))
			void locks.plainCopies(list).then((count) => (plainCopies = count));
	});
	let problem = $state<string>();
	let busy = $state(false);
	let recoveryCode = $state<string>();
	let kept = $state(false);
	// Asked to close before the code was kept: said why it stays, and focus goes to the box.
	let mustKeep = $state(false);
	let capsLock = $state(false);
	let keptBox: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (!identifier && !newName) return;
		passphrase = again = '';
		show = deleteCopies = kept = busy = mustKeep = false;
		problem = recoveryCode = undefined;
	});

	async function lock(event: SubmitEvent) {
		event.preventDefault();
		if (!open) return;
		if (passphrase.length < MINIMUM_PASSPHRASE) {
			problem = `Use at least ${MINIMUM_PASSPHRASE} characters. A few words that don't go together are strongest.`;
			return;
		}
		if (!show && again !== passphrase) {
			problem = 'The two passphrases are different. Type the same one in both.';
			return;
		}
		problem = undefined;
		busy = true;
		try {
			if (category) recoveryCode = await locks.lock(category, passphrase, deleteCopies);
			else {
				const made = await locks.lockNew(name, passphrase);
				recoveryCode = made?.recoveryCode;
				if (made) onlocked?.(made.identifier);
			}
			passphrase = again = '';
		} finally {
			busy = false;
		}
	}
</script>

<Sheet
	{open}
	title={recoveryCode ? 'Keep the recovery code' : `Lock ${name}`}
	{onclose}
	held={!!recoveryCode && !kept}
	onheld={() => {
		mustKeep = true;
		keptBox?.focus();
	}}
>
	{#if recoveryCode}
		<p class="text-sm">
			{name} is locked. If you forget its passphrase, this code opens it instead. Nobody else can open
			it without one of them, us included, so keep the code somewhere safe, apart from this device.
		</p>
		<RecoveryCode code={recoveryCode} bind:kept bind:box={keptBox} {mustKeep} />
		<button type="button" class={primaryButton} disabled={!kept} onclick={onclose}>Done</button>
	{:else}
		<form class="space-y-4" onsubmit={lock}>
			<div class="space-y-2 text-sm">
				<p>
					Its tasks are encrypted on this device with a passphrase of their own, and the list stays
					closed until you open it. It closes again when Amber is hidden, and after five minutes
					without use.
				</p>
				<p class="text-muted">
					It isn't a password manager: there's no autofill, and it can't protect against a device or
					browser extension that's already watching what you do.
				</p>
				{#if hasTasks}
					<p>
						Copies made before now, this device's own and any files or links you made, still have
						{name} in plain text.
					</p>
				{/if}
			</div>
			<div>
				<label for="{prefix}-passphrase" class={label}>Passphrase</label>
				<input
					id="{prefix}-passphrase"
					type={show ? 'text' : 'password'}
					class={field}
					bind:value={passphrase}
					oninput={() => (problem = undefined)}
					onkeyup={(event) => (capsLock = event.getModifierState('CapsLock'))}
					autocomplete="new-password"
					autocapitalize="off"
					spellcheck="false"
					aria-invalid={!!problem}
					aria-describedby="{prefix}-hint {problem ? `${prefix}-problem` : ''}"
				/>
				<p id="{prefix}-hint" class="mt-1.5 text-sm text-muted">
					At least {MINIMUM_PASSPHRASE} characters. Forget it and the recovery code, and the list can't
					be opened by anyone.
				</p>
				<CapsLock on={capsLock} />
				{#if problem}<Problem id="{prefix}-problem">{problem}</Problem>{/if}
			</div>
			{#if !show}
				<div>
					<label for="{prefix}-again" class={label}>Type it again</label>
					<input
						id="{prefix}-again"
						type="password"
						class={field}
						bind:value={again}
						oninput={() => (problem = undefined)}
						autocomplete="new-password"
					/>
				</div>
			{/if}
			<label class="flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
				<input type="checkbox" class="size-4 accent-accent-edge" bind:checked={show} />
				Show the passphrase
			</label>
			{#if hasTasks && plainCopies}
				<!-- Only the copies that hold this list in plain text: the others are left alone. -->
				<label class="flex min-h-10 items-center gap-2 text-sm pointer-coarse:min-h-11">
					<input type="checkbox" class="size-4 accent-accent-edge" bind:checked={deleteCopies} />
					Also delete {plainCopies === 1 ? 'the copy' : `the ${plainCopies} copies`} on this device that
					{plainCopies === 1 ? 'has' : 'have'}
					{name} in plain text
				</label>
			{/if}
			<button type="submit" class={primaryButton} disabled={busy || !passphrase}>
				{busy ? 'Locking…' : `Lock ${name}`}
			</button>
		</form>
	{/if}
</Sheet>
