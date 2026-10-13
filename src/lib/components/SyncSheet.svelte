<!-- Syncing with another device, once: this device shows a code and waits, or takes a code from
     the other one. Either way both end up with everything, and the server keeps nothing. -->
<script lang="ts">
	import { amber } from '#lib/amber.svelte.js';
	import { SYNC_PREFIX } from '#lib/links.js';
	import type { Entity } from '#lib/model/list.js';
	import { field, label, smallButton } from '#lib/styles.js';
	import {
		cancel,
		collect,
		fetchList,
		leave,
		readCode,
		reply,
		showCode,
		type Mailbox,
		type Problem
	} from '#lib/sync.js';
	import { isNothing, previewMerge, summarize, type Reading } from '#lib/transfer.js';
	import { updates } from '#lib/updates.svelte.js';
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
		| { kind: 'waiting'; code: string; mailbox: Mailbox }
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

	const heading = 'mb-1 text-base font-semibold';
	const hint = 'text-sm text-muted';
	const primary = `${smallButton} border-transparent bg-accent font-semibold text-on-accent hover:bg-accent hover:opacity-85`;

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
		stage = { kind: 'waiting', ...left };
		stop = new AbortController();
		const outcome = await collect(left.mailbox, stop.signal);
		if (!outcome) return;
		if ('problem' in outcome) {
			stage = {
				kind: 'problem',
				message:
					outcome.problem === 'gone'
						? 'The code ran out before the other device used it. Start again.'
						: PROBLEMS[outcome.problem]
			};
			return;
		}
		const wrong = unusable(outcome);
		if (wrong || outcome.kind !== 'list') {
			stage = wrong ?? { kind: 'choose' };
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
			<button type="button" class="{primary} mt-3" onclick={start}>Get a code</button>
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
			Waiting for the other device… The code works once, for ten minutes. Keep this open until it's
			done.
		</p>
	{:else if stage.kind === 'done'}
		<div role="status">
			<p class="text-base font-medium">{stage.message}</p>
			<p class="mt-2 text-sm text-muted">{stage.detail}</p>
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
