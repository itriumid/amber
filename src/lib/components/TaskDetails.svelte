<!-- Everything about one task: its name, notes, category, tags and steps. Fields save when you leave
     them, and every change can be undone from the message that follows. -->
<script lang="ts">
	import { tick } from 'svelte';
	import { amber } from '#lib/amber.svelte.js';
	import { DOT } from '#lib/colors.js';
	import {
		addStep,
		deleteStep,
		deleteTask,
		hasTag,
		moveStep,
		promoteStep,
		setCategory,
		setDone,
		setNotes,
		setStepDone,
		setStepText,
		setTagged,
		setTitle,
		shownCategory,
		tagByName
	} from '#lib/model/actions.js';
	import { categoryTree, get, stepsOf, tags as allTags, value, LIMITS } from '#lib/model/list.js';
	import { field, label, secondaryButton, touchTarget, touchText } from '#lib/styles.js';
	import { rescueFocus } from '#lib/focus.js';
	import Check from './Check.svelte';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	let { identifier, onclose }: { identifier: string | undefined; onclose: () => void } = $props();

	const task = $derived(identifier ? get(amber.records, identifier, 'task') : undefined);
	const tree = $derived(categoryTree(amber.records));
	const tags = $derived(allTags(amber.records));
	const steps = $derived(task ? stepsOf(amber.records, task.identifier) : []);

	let newStep = $state('');
	let untitled = $state(false);
	// A different task, or the same one opened again, starts without the message.
	$effect(() => {
		void identifier;
		untitled = false;
	});
	let newTag = $state('');

	/**
	 * Call before a step's button takes the step away (deleted, or made a task), so focus doesn't
	 * fall to the top of the page: it goes to the same button on the step that takes its place, the
	 * one before when it was the last, or the field for a new step when none are left. From the menu
	 * on a touch screen, that's the next step's More button.
	 */
	async function keepFocus(button: HTMLButtonElement) {
		const row = button.closest('li');
		const fromMenu = !!button.closest('[popover]');
		const place = row ? [...row.querySelectorAll('button')].indexOf(button) : -1;
		const neighbor = row?.nextElementSibling ?? row?.previousElementSibling;
		await tick();
		rescueFocus(
			fromMenu
				? neighbor?.querySelector<HTMLElement>('[data-more]')
				: neighbor?.querySelectorAll('button')[place],
			document.getElementById('new-step')
		);
	}

	const iconButton =
		'inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text';
	const menuItem =
		'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-base hover:bg-bg';
</script>

<Sheet open={!!task} title="Task details" {onclose}>
	{#if task}
		<div>
			<label for="task-title" class={label}>Task</label>
			<input
				id="task-title"
				class={field}
				value={value(task, 'title')}
				maxlength={LIMITS.title}
				aria-describedby={untitled ? 'task-title-problem' : undefined}
				oninput={() => (untitled = false)}
				onchange={(event) => {
					// A task needs a name. Emptied, the name it had is put back, and it's said why, rather
					// than leaving a blank field that looks saved and isn't.
					if (!event.currentTarget.value.trim()) {
						event.currentTarget.value = value(task, 'title');
						untitled = true;
						return;
					}
					amber.act('Renamed', (context) => setTitle(context, task, event.currentTarget.value));
				}}
			/>
			{#if untitled}
				<p id="task-title-problem" class="mt-1.5 text-sm" role="alert">
					A task needs a name, so the one it had is kept.
				</p>
			{/if}
		</div>

		<div>
			<Check
				checked={value(task, 'done')}
				label="Done"
				onchange={(checked) =>
					amber.act(checked ? 'Marked done' : 'Marked not done', (context) =>
						setDone(context, task, checked)
					)}><span aria-hidden="true">Done</span></Check
			>
		</div>

		<div>
			<label for="task-notes" class={label}>Notes</label>
			<textarea
				id="task-notes"
				class="{field} field-sizing-content max-h-80 min-h-20 resize-y"
				value={value(task, 'notes')}
				maxlength={LIMITS.notes}
				onchange={(event) =>
					amber.act('Notes saved', (context) => setNotes(context, task, event.currentTarget.value))}
			></textarea>
		</div>

		<div>
			<label for="task-category" class={label}>Category</label>
			<select
				id="task-category"
				class={field}
				value={shownCategory(amber.records, task) ?? ''}
				onchange={(event) =>
					amber.act('Category changed', (context) =>
						setCategory(context, task, event.currentTarget.value || null)
					)}
			>
				<option value="">No category</option>
				{#each tree as { category, children } (category.identifier)}
					<option value={category.identifier}>{value(category, 'name')}</option>
					{#each children as child (child.identifier)}
						<option value={child.identifier}
							>{value(category, 'name')} › {value(child, 'name')}</option
						>
					{/each}
				{/each}
			</select>
		</div>

		<fieldset>
			<legend class={label}>Tags</legend>
			{#if tags.length}
				<div class="flex flex-wrap gap-2">
					{#each tags as tag (tag.identifier)}
						{@const on = hasTag(amber.records, task, tag)}
						{@const color = value(tag, 'color')}
						<button
							type="button"
							aria-pressed={on}
							class="relative inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors motion-reduce:transition-none {touchTarget} {on
								? 'border-text bg-text font-medium text-bg'
								: 'border-control-border hover:bg-bg'}"
							onclick={() =>
								amber.act(
									on ? `Untagged #${value(tag, 'name')}` : `Tagged #${value(tag, 'name')}`,
									(context) => setTagged(context, task, tag, !on)
								)}
						>
							{#if on}<Icon name="check" class="size-3.5" />{:else if color}<span
									class="size-2.5 rounded-full {DOT[color]}"
									aria-hidden="true"
								></span>{/if}
							#{value(tag, 'name')}
						</button>
					{/each}
				</div>
			{/if}
			<form
				class="mt-3 flex gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					const names = newTag.split(/[\s,]+/).map((name) => name.replace(/^#/, ''));
					if (amber.act('Tagged', (context) => tagByName(context, task, names))) newTag = '';
					else newTag = '';
				}}
			>
				<label for="new-tag" class="sr-only">New tag</label>
				<input
					id="new-tag"
					class={field}
					placeholder="New tag"
					bind:value={newTag}
					maxlength={LIMITS.name}
				/>
				<button type="submit" class={secondaryButton} disabled={!newTag.trim()}>Add</button>
			</form>
		</fieldset>

		<!-- A fieldset is as wide as its content by default; this one fits the sheet. A step's text keeps
		     at least 12rem: where that and the buttons don't fit, as with large text, the buttons move to
		     a line of their own instead of squeezing it. On a touch screen the four buttons are one More
		     button, whose menu names the step and labels each action: four bare icons per step crowded
		     every row and could be taken for the next step's. Alt with the up or down arrow moves a
		     step, as it moves a task. -->
		<fieldset class="min-w-0">
			<legend class={label}>Steps <span class="font-normal text-muted">(optional)</span></legend>
			{#if steps.length}
				<ul class="space-y-1">
					{#each steps as step (step.identifier)}
						{@const text = value(step, 'text')}
						<!-- On a touch screen each step is 44px high and spaced out, so the box's wider hit area meets nothing. -->
						<!-- The row hears Alt with an arrow from the controls inside it, as a task's row does; it's
						     never focused or clicked itself. -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<li
							class="group flex flex-wrap items-center gap-x-2 pointer-coarse:min-h-11 pointer-coarse:gap-x-3"
							onkeydown={(event) => {
								if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
								event.preventDefault();
								const direction = event.key === 'ArrowUp' ? -1 : 1;
								amber.act('Step moved', (context) => moveStep(context, step, direction));
							}}
						>
							<div class="flex min-w-0 flex-[1_1_12rem] items-center gap-2 pointer-coarse:gap-3">
								<Check
									small
									checked={value(step, 'done')}
									label={value(step, 'done') ? `Mark not done: ${text}` : `Mark done: ${text}`}
									onchange={(checked) =>
										amber.act(checked ? 'Step done' : 'Step not done', (context) =>
											setStepDone(context, step, checked)
										)}
								/>
								<label class="sr-only" for="step-{step.identifier}">Step</label>
								<input
									id="step-{step.identifier}"
									class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm {touchText} hover:border-control-border focus:border-control-border pointer-coarse:min-h-11 {value(
										step,
										'done'
									)
										? 'text-muted line-through'
										: ''}"
									value={text}
									maxlength={LIMITS.step}
									onchange={(event) =>
										amber.act('Step renamed', (context) =>
											setStepText(context, step, event.currentTarget.value)
										)}
								/>
							</div>
							<div
								class="ml-auto flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:hidden"
							>
								<button
									type="button"
									class={iconButton}
									aria-label="Move up: {text}"
									title="Move up"
									onclick={() => amber.act('Step moved', (context) => moveStep(context, step, -1))}
									><Icon name="up" /></button
								>
								<button
									type="button"
									class={iconButton}
									aria-label="Move down: {text}"
									title="Move down"
									onclick={() => amber.act('Step moved', (context) => moveStep(context, step, 1))}
									><Icon name="down" /></button
								>
								<button
									type="button"
									class={iconButton}
									aria-label="Make a task of: {text}"
									title="Make a task of this step"
									onclick={(event) => {
										void keepFocus(event.currentTarget);
										amber.act(`Made a task: ${text}`, (context) => promoteStep(context, step));
									}}><Icon name="promote" /></button
								>
								<button
									type="button"
									class={iconButton}
									aria-label="Delete step: {text}"
									title="Delete step"
									onclick={(event) => {
										void keepFocus(event.currentTarget);
										amber.act('Step deleted', (context) => deleteStep(context, step));
									}}><Icon name="trash" /></button
								>
							</div>
							<button
								type="button"
								data-more
								class="ml-auto hidden size-11 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text pointer-coarse:inline-flex"
								aria-label="More: {text}"
								popovertarget="step-menu-{step.identifier}"><Icon name="more" /></button
							>
							<div
								id="step-menu-{step.identifier}"
								popover
								class="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-2 text-text shadow-2xl backdrop:bg-black/40"
							>
								<p class="truncate px-3 pt-1 pb-2 text-sm text-muted">{text}</p>
								<button
									type="button"
									class={menuItem}
									onclick={(event) => {
										event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
										amber.act('Step moved', (context) => moveStep(context, step, -1));
									}}><Icon name="up" /> Move up</button
								>
								<button
									type="button"
									class={menuItem}
									onclick={(event) => {
										event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
										amber.act('Step moved', (context) => moveStep(context, step, 1));
									}}><Icon name="down" /> Move down</button
								>
								<button
									type="button"
									class={menuItem}
									onclick={(event) => {
										void keepFocus(event.currentTarget);
										amber.act(`Made a task: ${text}`, (context) => promoteStep(context, step));
									}}><Icon name="promote" /> Make a task of this step</button
								>
								<button
									type="button"
									class={menuItem}
									onclick={(event) => {
										void keepFocus(event.currentTarget);
										amber.act('Step deleted', (context) => deleteStep(context, step));
									}}><Icon name="trash" /> Delete step</button
								>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
			<form
				class="mt-3 flex gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					if (amber.act('Step added', (context) => addStep(context, task, newStep))) newStep = '';
				}}
			>
				<label for="new-step" class="sr-only">New step</label>
				<input
					id="new-step"
					class={field}
					placeholder="Add a step"
					bind:value={newStep}
					maxlength={LIMITS.step}
				/>
				<button type="submit" class={secondaryButton} disabled={!newStep.trim()}>Add</button>
			</form>
		</fieldset>

		<div class="border-t border-border pt-5">
			<button
				type="button"
				class="{secondaryButton} w-full"
				onclick={() => {
					amber.act(`Deleted: ${value(task, 'title')}`, (context) => deleteTask(context, task));
					onclose();
				}}
			>
				<Icon name="trash" /> Delete task
			</button>
		</div>
	{/if}
</Sheet>
