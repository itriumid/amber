// Where keyboard focus goes when the element holding it disappears: a ticked task moving to Done,
// a deleted task whose dialog closes. Left alone, focus falls to the top of the page and someone
// using a keyboard or a screen reader loses their place.

/**
 * Whether an element can be seen. Not `offsetParent`: Chrome hides the inside of a closed
 * <details> with `content-visibility`, which `offsetParent` doesn't notice.
 */
export const isShown = (element: HTMLElement | null | undefined): element is HTMLElement =>
	!!element?.isConnected && element.checkVisibility();

/** True when nothing useful has focus any more. */
export function isLost(): boolean {
	const active = document.activeElement;
	return !active || active === document.body || !active.isConnected;
}

/** Quick add when it's there, otherwise the list itself. */
function home(): HTMLElement | null {
	const quickAdd = document.getElementById('quick-add') as HTMLInputElement | null;
	if (isShown(quickAdd) && !quickAdd.disabled) return quickAdd;
	return document.getElementById('main');
}

/** Gives focus a sensible place to land, if it has been lost. */
export function rescueFocus(...candidates: (HTMLElement | null | undefined)[]) {
	if (!isLost()) return;
	const target = candidates.find(isShown);
	(target ?? home())?.focus();
}
