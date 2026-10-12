<!-- Everything about one task: its name, notes, category, tags and steps. Fields save when you leave
     them, and every change can be undone from the message that follows. -->
<script lang="ts">
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
	import { field, label, secondaryButton } from '#lib/styles.js';
	import Check from './Check.svelte';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	let { identifier, onclose }: { identifier: string | undefined; onclose: () => void } = $props();

	const task = $derived(identifier ? get(amber.records, identifier, 'task') : undefined);
	const tree = $derived(categoryTree(amber.records));
	const tags = $derived(allTags(amber.records));
	const steps = $derived(task ? stepsOf(amber.records, task.identifier) : []);

	let newStep = $state('');
	let newTag = $state('');
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
				onchange={(event) =>
					amber.act('Renamed', (context) => setTitle(context, task, event.currentTarget.value))}
			/>
		</div>

		<label class="flex items-center gap-3">
			<Check
				checked={value(task, 'done')}
				label="Done"
				onchange={(checked) =>
					amber.act(checked ? 'Marked done' : 'Marked not done', (context) =>
						setDone(context, task, checked)
					)}
			/>
			<span aria-hidden="true">Done</span>
		</label>

		<div>
			<label for="task-notes" class={label}>Notes</label>
			<textarea
				id="task-notes"
				class="{field} min-h-28 resize-y"
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
							class="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors motion-reduce:transition-none {on
								? 'border-accent-edge bg-accent font-medium text-on-accent'
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

		<fieldset>
			<legend class={label}>Steps <span class="font-normal text-muted">(optional)</span></legend>
			{#if steps.length}
				<ul class="space-y-1">
					{#each steps as step (step.identifier)}
						{@const text = value(step, 'text')}
						<li class="group flex items-center gap-2">
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
								class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm hover:border-control-border focus:border-control-border {value(
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
							<div
								class="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
							>
								<button
									type="button"
									class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
									aria-label="Move up: {text}"
									onclick={() => amber.act('Step moved', (context) => moveStep(context, step, -1))}
									><Icon name="up" /></button
								>
								<button
									type="button"
									class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
									aria-label="Move down: {text}"
									onclick={() => amber.act('Step moved', (context) => moveStep(context, step, 1))}
									><Icon name="down" /></button
								>
								<button
									type="button"
									class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
									aria-label="Make a task of: {text}"
									onclick={() =>
										amber.act(`Made a task: ${text}`, (context) => promoteStep(context, step))}
									><Icon name="promote" /></button
								>
								<button
									type="button"
									class="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-bg hover:text-text"
									aria-label="Delete step: {text}"
									onclick={() => amber.act('Step deleted', (context) => deleteStep(context, step))}
									><Icon name="trash" /></button
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
