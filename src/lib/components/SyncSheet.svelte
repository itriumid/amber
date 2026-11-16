<!-- Syncing with another device, once: this device shows a code and waits, or takes a code from
     the other one. Either way both end up with everything, and the server keeps nothing. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { SYNC_PREFIX } from '#lib/links.js';
	import type { Entity } from '#lib/model/list.js';
	import { field, label, primaryButton, smallButton } from '#lib/styles.js';
	import {
		cancel,
		collect,
		fetchList,
		leave,
		LIFETIME,
		readCode,
		reply,
		showCode,
		type Mailbox,
		type Problem
	} from '#lib/sync.js';
	import {
		deletedByMerge,
		isNothing,
		previewMerge,
		summarize,
		type Reading
	} from '#lib/transfer.js';
	import { updates } from '#lib/updates.svelte.js';
	import DeletedByMerge from './DeletedByMerge.svelte';
	import Sheet from './Sheet.svelte';

	let {
		open,
		code: given,
		onclose
	}: {
		open: boolean;
		/** A code from a link: joined as soon as the sheet opens. */
		code: string | undefined;
		onclose: () => void;
	} = $props();

	type Stage =
		| { kind: 'choose' }
		| { kind: 'working'; message: string }
		| { kind: 'waiting'; code: string; mailbox: Mailbox; until: number }
		| {
				kind: 'confirm';
				summary: string;
				deletions: number;
				titles: string[];
				answer: (go: boolean) => void;
		  }
		| { kind: 'done'; message: string; detail: string }
		| { kind: 'newer' }
		| { kind: 'problem'; message: string };

	const prefix = $props.id();
	let stage = $state.raw<Stage>({ kind: 'choose' });
	let entered = $state('');
	let enteredProblem = $state<string>();
	let copied = $state(false);
	/** Phones and some desktops can hand the link to another app, which beats the clipboard. */
	let canShare = $state(false);
	let stop: AbortController | undefined;

	// While a code waits, the time it has left, in whole minutes: a countdown in seconds would be
	// read out by a screen reader every second, and it's minutes that tell someone whether to hurry.
	let now = $state(Date.now());
	$effect(() => {
		if (stage.kind !== 'waiting') return;
		now = Date.now();
		const timer = setInterval(() => (now = Date.now()), 5_000);
		return () => clearInterval(timer);
	});
	const minutesLeft = $derived(
		stage.kind === 'waiting' ? Math.max(1, Math.ceil((stage.until - now) / 60_000)) : 0
	);

	const heading = 'mb-1 text-base font-semibold';
	const hint = 'text-sm text-muted';
	const primary = primaryButton;

	const PROBLEMS: Record<Problem, string> = {
		'too-large': 'This list is too long to sync. Download a file in Back up and move instead.',
		offline: "Amber can't reach our server. Check the connection and try again.",
		gone: "That code isn't open anymore. Codes work once, for ten minutes. Start again on the device that showed it.",
		taken: 'That code has already been used. Start again on the device that showed it.',
		server: 'Something went wrong on our side. Try again in a minute.'
	};

	$effect(() => {
		if (!open) return;
		stage = { kind: 'choose' };
		entered = '';
		enteredProblem = undefined;
		copied = false;
		canShare = !!navigator.canShare?.({ url: location.origin });
		if (!given) return;
		const code = readCode(given);
		if (code) void join(code);
		else
			stage = {
				kind: 'problem',
				message: "That link's code is incomplete. Enter the code instead."
			};
	});

	/**
	 * When merging would delete anything here, it's said first, with the tasks named, and nothing
	 * happens until it's agreed to: the same as bringing a list in, which never deletes unseen.
	 */
	function agreed(records: Entity[]): Promise<boolean> {
		const preview = previewMerge($state.snapshot(amber.records), records);
		const deletions = preview.tasks.deleted + preview.categories.deleted + preview.tags.deleted;
		if (!deletions) return Promise.resolve(true);
		return new Promise((answer) => {
			stage = {
				kind: 'confirm',
				summary: summarize(preview),
				deletions,
				titles: deletedByMerge($state.snapshot(amber.records), records),
				answer
			};
		});
	}

	/** What merging a list in did here, said after it's done. */
	async function mergeIn(records: Entity[]) {
		const preview = previewMerge($state.snapshot(amber.records), records);
		if (isNothing(preview)) return 'Nothing changed on this device.';
		await amber.mergeIn(records, 'Synced with another device');
		return `On this device: ${summarize(preview)} You can undo it.`;
	}

	/** A list that came back but can't be merged: from a newer Amber, or unreadable. */
	function unusable(reading: Reading): Stage | undefined {
		if (reading.kind === 'newer') return { kind: 'newer' };
		if (reading.kind !== 'list')
			return { kind: 'problem', message: "The list that came back couldn't be read. Start again." };
		return undefined;
	}

	async function start() {
		stage = { kind: 'working', message: 'Getting a code…' };
		const left = await leave($state.snapshot(amber.records));
		if ('problem' in left) {
			stage = { kind: 'problem', message: PROBLEMS[left.problem] };
			return;
		}
		stage = { kind: 'waiting', ...left, until: Date.now() + LIFETIME };
		stop = new AbortController();
		const outcome = await collect(left.mailbox, stop.signal);
		if (!outcome) return;
		if ('problem' in outcome) {
			stage = {
				kind: 'problem',
				message:
					outcome.problem === 'gone'
						? "The other device didn't sync, or the code ran out first. Start again if you still want to."
						: PROBLEMS[outcome.problem]
			};
			return;
		}
		const wrong = unusable(outcome);
		if (wrong || outcome.kind !== 'list') {
			stage = wrong ?? { kind: 'choose' };
			return;
		}
		if (!(await agreed(outcome.records))) {
			stage = {
				kind: 'done',
				message: 'Nothing changed on this device.',
				detail: 'The other device already has both lists; this one stays as it was.'
			};
			return;
		}
		stage = {
			kind: 'done',
			message: 'Both devices have the same list now.',
			detail: await mergeIn(outcome.records)
		};
	}

	async function join(code: string) {
		stage = { kind: 'working', message: 'Syncing…' };
		const fetched = await fetchList(code);
		if ('problem' in fetched) {
			stage = { kind: 'problem', message: PROBLEMS[fetched.problem] };
			return;
		}
		const wrong = unusable(fetched.reading);
		if (wrong || fetched.reading.kind !== 'list') {
			stage = wrong ?? { kind: 'choose' };
			return;
		}
		if (!(await agreed(fetched.reading.records))) {
			// The other device stops waiting: its code is closed, and nothing merged on either side.
			await cancel(fetched.mailbox);
			stage = { kind: 'done', message: 'Nothing changed on either device.', detail: '' };
			return;
		}
		stage = { kind: 'working', message: 'Syncing…' };
		const detail = await mergeIn(fetched.reading.records);
		const problem = await reply(fetched.mailbox, $state.snapshot(amber.records));
		stage = problem
			? {
					kind: 'problem',
					message: `This device has everything now, but the other one didn't get its copy. ${PROBLEMS[problem]}`
				}
			: { kind: 'done', message: 'Done. The other device finishes in a moment.', detail };
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const code = readCode(entered);
		if (!code) {
			enteredProblem = 'A code has 16 letters and numbers. Check it and try again.';
			return;
		}
		void join(code);
	}

	const linkFor = (code: string) => `${location.origin}/${SYNC_PREFIX}${code}`;

	async function copyLink(code: string) {
		await navigator.clipboard.writeText(linkFor(code));
		copied = true;
	}

	async function shareLink(code: string) {
		try {
			await navigator.share({ title: 'Sync with Amber', url: linkFor(code) });
		} catch {
			// Closing the share sheet without picking anything lands here too; there's nothing to say.
		}
	}

	function close() {
		stop?.abort();
		if (stage.kind === 'waiting') void cancel(stage.mailbox);
		stage = { kind: 'choose' };
		onclose();
	}
</script>

<Sheet {open} title="Sync with another device" onclose={close}>
	{#if amber.readOnly}
		<p class="text-sm">Your list can't be changed until Amber is updated, so it can't sync yet.</p>
	{:else if stage.kind === 'choose'}
		<p class={hint}>
			Both devices end up with everything from both. The list passes through our server encrypted,
			for a few minutes at most, and only your devices can open it.
		</p>

		<section aria-labelledby="{prefix}-start">
			<h3 id="{prefix}-start" class={heading}>Start on this device</h3>
			<p class={hint}>Get a code here, then enter it on the other device.</p>
			<button type="button" class="{primary} mt-3" data-autofocus onclick={start}>Get a code</button
			>
		</section>

		<section aria-labelledby="{prefix}-join">
			<h3 id="{prefix}-join" class={heading}>Or enter a code</h3>
			<form onsubmit={submit}>
				<label for="{prefix}-code" class={label}>Code from the other device</label>
				<div class="flex gap-2">
					<input
						id="{prefix}-code"
						class="{field} min-w-0 font-mono uppercase"
						bind:value={entered}
						oninput={() => (enteredProblem = undefined)}
						autocomplete="off"
						autocapitalize="characters"
						spellcheck="false"
						aria-invalid={!!enteredProblem}
						aria-describedby={enteredProblem ? `${prefix}-code-problem` : undefined}
					/>
					<button type="submit" class="{smallButton} shrink-0" disabled={!entered.trim()}
						>Sync</button
					>
				</div>
				{#if enteredProblem}
					<p id="{prefix}-code-problem" class="mt-1.5 text-sm" role="alert">{enteredProblem}</p>
				{/if}
			</form>
		</section>
	{:else if stage.kind === 'working'}
		<p class="text-sm" role="status">{stage.message}</p>
	{:else if stage.kind === 'waiting'}
		{@const code = stage.code}
		<div>
			<p class={hint}>
				On the other device, open Amber, choose Sync with another device and enter this code. Or
				send it the link.
			</p>
			<p class="mt-4 text-center font-mono text-2xl font-semibold tracking-wider">
				{showCode(code)}
			</p>
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				{#if canShare}
					<button type="button" class={smallButton} onclick={() => shareLink(code)}
						>Share a link</button
					>
				{/if}
				<button type="button" class={smallButton} onclick={() => copyLink(code)}>
					{copied ? 'Copied' : 'Copy a link'}
				</button>
			</div>
			<p class="sr-only" role="status">{copied ? 'Link copied' : ''}</p>
		</div>
		<p class="text-sm" role="status">
			Waiting for the other device… The code works once, for {minutesLeft === 1
				? 'less than a minute'
				: `${minutesLeft} more minutes`}. Keep this open until it's done.
		</p>
	{:else if stage.kind === 'confirm'}
		{@const confirm = stage}
		<div>
			<p class="text-base font-medium">{confirm.summary}</p>
			<DeletedByMerge titles={confirm.titles} total={confirm.deletions} />
		</div>
		<div class="flex flex-wrap gap-2">
			<!-- Focus moves here as the question appears: what had it is gone with the stage before. -->
			<button
				type="button"
				class={primary}
				{@attach (button) => button.focus()}
				onclick={() => confirm.answer(true)}>Sync</button
			>
			<button type="button" class={smallButton} onclick={() => confirm.answer(false)}
				>Don't sync</button
			>
		</div>
	{:else if stage.kind === 'done'}
		<div role="status">
			<p class="text-base font-medium">{stage.message}</p>
			{#if stage.detail}<p class="mt-2 text-sm text-muted">{stage.detail}</p>{/if}
		</div>
		<button type="button" class={smallButton} onclick={close}>Close</button>
	{:else if stage.kind === 'newer'}
		<p class="text-sm" role="alert">
			The other device has a newer version of Amber. Update Amber here, then sync again.
		</p>
		<button type="button" class={smallButton} onclick={() => updates.apply()}>Update Amber</button>
	{:else}
		<p class="text-sm" role="alert">{stage.message}</p>
		<button type="button" class={smallButton} onclick={() => (stage = { kind: 'choose' })}
			>Start again</button
		>
	{/if}
</Sheet>
