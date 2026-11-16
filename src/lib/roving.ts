// Moving through the task list from the keyboard. Every row keeps its own native controls (the
// checkbox, the title that opens the task, the move buttons), so screen readers read the list as
// they always have; what changes is Tab. Only one control in the whole list takes part in Tab, so
// getting past forty tasks is one key press, not a hundred and sixty. Inside the list, the up and
// down arrows go from task to task, keeping to the same control, and left and right go along a row.
// This is a roving tabindex, the pattern the WAI-ARIA Authoring Practices give for a composite
// widget. It isn't a grid or a listbox role: a listbox can't hold controls, and a grid would make
// screen readers announce rows and columns a list doesn't have.

import { isShown } from './focus';

const ROW = '[data-task]';
const CONTROL = 'input[type="checkbox"], button';

const rowsIn = (container: HTMLElement) =>
	[...container.querySelectorAll<HTMLElement>(ROW)].filter(isShown);

const controlsIn = (row: Element) =>
	[...row.querySelectorAll<HTMLElement>(CONTROL)].filter(
		(control) => control.closest(ROW) === row && !control.hasAttribute('disabled')
	);

/** The one control the list lets Tab land on. */
function setStop(container: HTMLElement, stop: HTMLElement | undefined) {
	for (const row of container.querySelectorAll(ROW))
		for (const control of controlsIn(row)) control.tabIndex = control === stop ? 0 : -1;
}

/** Keeps the stop where it is while it's still there, and otherwise on the first task. */
function settle(container: HTMLElement) {
	const current = [...container.querySelectorAll<HTMLElement>(`${ROW} [tabindex="0"]`)].find(
		isShown
	);
	const first = rowsIn(container)[0];
	setStop(container, current ?? (first ? controlsIn(first)[0] : undefined));
}

/** A Svelte attachment for the element holding the task list. */
export function roving(container: HTMLElement) {
	settle(container);
	// Tasks come and go (added, ticked into Done, found by a search, a <details> opened), so the stop
	// is checked again whenever the list changes.
	const observer = new MutationObserver(() => settle(container));
	observer.observe(container, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['open']
	});

	function onfocusin(event: FocusEvent) {
		const target = event.target;
		if (target instanceof HTMLElement && target.closest(ROW) && target.matches(CONTROL))
			setStop(container, target);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const row = target.closest<HTMLElement>(ROW);
		if (!row || !container.contains(row)) return;
		const controls = controlsIn(row);
		const place = Math.max(0, controls.indexOf(target));
		const rows = rowsIn(container);
		const index = rows.indexOf(row);
		let next: HTMLElement | undefined;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			const other = rows[index + (event.key === 'ArrowDown' ? 1 : -1)];
			if (other) {
				const otherControls = controlsIn(other);
				next = otherControls[Math.min(place, otherControls.length - 1)];
			}
		} else if (event.key === 'Home' || event.key === 'End') {
			const other = event.key === 'Home' ? rows[0] : rows.at(-1);
			if (other) next = controlsIn(other)[0];
		} else if (event.key === 'ArrowRight') {
			next = controls[place + 1];
		} else if (event.key === 'ArrowLeft') {
			next = controls[place - 1];
		} else return;
		// The page doesn't scroll by the arrow, whether or not there's somewhere to go.
		event.preventDefault();
		next?.focus();
	}

	container.addEventListener('focusin', onfocusin);
	container.addEventListener('keydown', onkeydown);
	return () => {
		observer.disconnect();
		container.removeEventListener('focusin', onfocusin);
		container.removeEventListener('keydown', onkeydown);
	};
}
