// Dragging a task to a new place in its list. With a mouse, by the grip that shows at a task's left
// on hover; on a touch screen, by holding a task for a moment and then moving it, so a quick swipe
// still scrolls the page. The task lifts and follows the pointer, the others make room, and letting
// go puts it there as one change, with Undo. Escape puts it back. Moving from the keyboard stays as
// it was (Alt with an arrow, and the move buttons), and so does the More menu on a touch screen:
// dragging is a quicker way for those who can, not the only way.
//
// Positions are set through the element's style object, which the Content-Security-Policy allows;
// it's style written into the markup that it blocks.

const HOLD = 450;
/** How far a finger may wander while holding before it counts as a scroll instead. */
const SLOP = 8;

interface Options {
	/** Puts the task at `index` among the others in this list (0 is the top). */
	onplace: (identifier: string, index: number) => void;
	/** Whether dragging is on: off while searching, where a move wouldn't show. */
	enabled: () => boolean;
}

export function sortable(options: Options) {
	return (list: HTMLElement) => {
		let pending:
			| { item: HTMLElement; x: number; y: number; timer?: ReturnType<typeof setTimeout> }
			| undefined;
		let drag:
			| {
					item: HTMLElement;
					items: HTMLElement[];
					from: number;
					to: number;
					y: number;
					height: number;
			  }
			| undefined;
		const instant = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

		const itemOf = (target: EventTarget | null) => {
			const item = target instanceof Element ? target.closest('li') : null;
			return item?.parentElement === list ? (item as HTMLElement) : undefined;
		};

		function begin() {
			if (!pending) return;
			const items = [...list.children].filter(
				(child): child is HTMLElement => child instanceof HTMLElement
			);
			const from = items.indexOf(pending.item);
			if (from === -1) return;
			drag = {
				item: pending.item,
				items,
				from,
				to: from,
				y: pending.y,
				height: pending.item.offsetHeight
			};
			pending = undefined;
			drag.item.dataset.dragging = '';
			for (const item of items)
				if (item !== drag.item)
					item.style.transition = instant() ? 'none' : 'transform 150ms ease-out';
			navigator.vibrate?.(10);
		}

		function follow(y: number) {
			if (!drag) return;
			const moved = y - drag.y;
			drag.item.style.transform = `translateY(${moved}px)`;
			// Where its middle is now, against the others' middles where they stood.
			const middle = drag.item.offsetTop + drag.height / 2 + moved;
			let to = drag.from;
			drag.items.forEach((item, index) => {
				if (item === drag!.item) return;
				const theirs = item.offsetTop + item.offsetHeight / 2;
				if (index < drag!.from && middle < theirs) to = Math.min(to, index);
				if (index > drag!.from && middle > theirs) to = Math.max(to, index);
			});
			drag.to = to;
			drag.items.forEach((item, index) => {
				if (item === drag!.item) return;
				const shift =
					index > drag!.from && index <= to
						? -drag!.height
						: index < drag!.from && index >= to
							? drag!.height
							: 0;
				item.style.transform = shift ? `translateY(${shift}px)` : '';
			});
		}

		function finish(keep: boolean) {
			if (pending?.timer) clearTimeout(pending.timer);
			pending = undefined;
			if (!drag) return;
			const { item, items, from, to } = drag;
			drag = undefined;
			delete item.dataset.dragging;
			for (const each of items) {
				each.style.transform = '';
				each.style.transition = '';
			}
			const identifier = item.querySelector<HTMLElement>('[data-task]')?.dataset.task;
			if (keep && identifier && to !== from) options.onplace(identifier, to);
			// The press that ended a drag isn't also a click on whatever is under it.
			list.addEventListener('click', swallow, { capture: true, once: true });
			setTimeout(() => list.removeEventListener('click', swallow, { capture: true }), 0);
		}

		const swallow = (event: Event) => {
			event.stopPropagation();
			event.preventDefault();
		};

		function onpointerdown(event: PointerEvent) {
			if (!options.enabled() || event.button !== 0 || drag) return;
			const item = itemOf(event.target);
			if (!item || !(event.target instanceof Element)) return;
			if (event.pointerType === 'mouse') {
				// With a mouse, only by the grip: everywhere else in the row, a click is a click.
				if (!event.target.closest('[data-drag]')) return;
				event.preventDefault();
				pending = { item, x: event.clientX, y: event.clientY };
			} else {
				// Holding the checkbox ticks it, and the More button opens its menu.
				if (event.target.closest('input, [data-more]')) return;
				pending = { item, x: event.clientX, y: event.clientY };
				pending.timer = setTimeout(begin, HOLD);
			}
		}

		function onpointermove(event: PointerEvent) {
			if (drag) {
				event.preventDefault();
				follow(event.clientY);
				return;
			}
			if (!pending) return;
			const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
			if (event.pointerType === 'mouse') {
				if (distance > 4) begin();
			} else if (distance > SLOP) finish(false);
		}

		// While dragging on a touch screen, the finger moves the task, not the page.
		const holdScroll = (event: TouchEvent) => {
			if (drag) event.preventDefault();
		};
		const onkeydown = (event: KeyboardEvent) => {
			if (drag && event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				finish(false);
			}
		};
		const onup = () => finish(true);
		const oncancel = () => finish(false);
		// A long press would otherwise also bring up the browser's own menu for the text under it.
		const oncontextmenu = (event: Event) => {
			if (drag || pending?.timer) event.preventDefault();
		};

		list.addEventListener('pointerdown', onpointerdown);
		list.addEventListener('contextmenu', oncontextmenu);
		window.addEventListener('pointermove', onpointermove, { passive: false });
		window.addEventListener('pointerup', onup);
		window.addEventListener('pointercancel', oncancel);
		window.addEventListener('keydown', onkeydown, { capture: true });
		document.addEventListener('touchmove', holdScroll, { passive: false });
		return () => {
			finish(false);
			list.removeEventListener('pointerdown', onpointerdown);
			list.removeEventListener('contextmenu', oncontextmenu);
			window.removeEventListener('pointermove', onpointermove);
			window.removeEventListener('pointerup', onup);
			window.removeEventListener('pointercancel', oncancel);
			window.removeEventListener('keydown', onkeydown, { capture: true });
			document.removeEventListener('touchmove', holdScroll);
		};
	};
}
