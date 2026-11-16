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
