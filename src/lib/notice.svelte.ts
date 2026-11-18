// Where the message with Undo shows. An open dialog makes the page under it unreachable, to the
// mouse, the keyboard and screen readers alike, so while one is open the message shows at the
// bottom of the topmost dialog instead of the page's. Otherwise Undo would be out of reach exactly
// where steps and tags are taken off.

class NoticePlace {
	/** The dialogs open now, in the order they opened: the last one is on top. */
	dialogs = $state.raw<string[]>([]);
	/** Hovered or focused, the message stays until it's left. */
	paused = $state(false);

	/** The dialog the message shows in, or undefined for the page. */
	get top(): string | undefined {
		return this.dialogs.at(-1);
	}

	/** Where each message first showed: the dialog on top then, or undefined for the page. */
	private origins = new WeakMap<object, string | undefined>();

	/**
	 * Whether a message shows in this place (a dialog's identifier, or undefined for the page). It
	 * shows where it was raised, and only there: "Step done" from a task's sheet doesn't follow into
	 * Back up and move, where its Undo would undo something out of sight. Raised in a dialog that has
	 * since closed, it shows on the page, unless another dialog is open.
	 */
	shows(notice: object, place: string | undefined): boolean {
		if (!this.origins.has(notice)) this.origins.set(notice, this.top);
		const origin = this.origins.get(notice);
		if (place !== this.top) return false;
		if (place === undefined) return true;
		return origin === place;
	}

	opened(identifier: string) {
		this.dialogs = [...this.dialogs.filter((other) => other !== identifier), identifier];
	}

	closed(identifier: string) {
		this.dialogs = this.dialogs.filter((other) => other !== identifier);
		// The message under the pointer or focus may have gone with the dialog.
		this.paused = false;
	}
}

export const noticePlace = new NoticePlace();
