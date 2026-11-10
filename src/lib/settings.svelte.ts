// Settings for this browser, kept in its storage beside the list but never in it: they aren't
// synced or copied.

import { readDetail, writeDetail } from './storage';

const SINGLE_KEY_SHORTCUTS = 'singleKeyShortcuts';

class Settings {
	/**
	 * N, / and ?, which work anywhere outside a field. They can be turned off: pressed by mistake,
	 * or heard by speech input as a word, a single key does something nobody asked for.
	 */
	singleKeyShortcuts = $state(true);

	async load() {
		try {
			const stored = await readDetail(SINGLE_KEY_SHORTCUTS);
			if (typeof stored === 'boolean') this.singleKeyShortcuts = stored;
		} catch {
			// Storage didn't open: the defaults hold, and the problem above the list says why.
		}
	}

	setSingleKeyShortcuts(on: boolean) {
		this.singleKeyShortcuts = on;
		writeDetail(SINGLE_KEY_SHORTCUTS, on).catch(() => {
			// It still holds until the page is reloaded.
		});
	}
}

export const settings = new Settings();
