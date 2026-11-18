// Settings for this browser, kept in its storage beside the list but never in it: they aren't
// synced or copied.

import { readDetail, writeDetail } from './storage';

const SINGLE_KEY_SHORTCUTS = 'singleKeyShortcuts';
/** In the browser's local storage, not beside the list: static/theme.js reads it before drawing. */
const THEME = 'amber-theme';

export type Theme = 'device' | 'light' | 'dark';

class Settings {
	/**
	 * N, / and ?, which work anywhere outside a field. They can be turned off: pressed by mistake,
	 * or heard by speech input as a word, a single key does something nobody asked for.
	 */
	singleKeyShortcuts = $state(true);
	/** Light or dark, or whatever the device is set to. */
	theme = $state<Theme>('device');

	async load() {
		try {
			const theme = localStorage.getItem(THEME);
			if (theme === 'light' || theme === 'dark') this.theme = theme;
		} catch {
			// Storage blocked: the device's setting holds.
		}
		try {
			const stored = await readDetail(SINGLE_KEY_SHORTCUTS);
			if (typeof stored === 'boolean') this.singleKeyShortcuts = stored;
		} catch {
			// Storage didn't open: the defaults hold, and the problem above the list says why.
		}
	}

	setTheme(theme: Theme) {
		this.theme = theme;
		const root = document.documentElement;
		if (theme === 'device') delete root.dataset.theme;
		else root.dataset.theme = theme;
		document
			.querySelector('meta[name="color-scheme"]')
			?.setAttribute('content', theme === 'device' ? 'dark light' : theme);
		// The browser's own bar: each color for its scheme, or the chosen one for both.
		for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
			const light =
				theme === 'light' || (theme === 'device' && meta.getAttribute('media')?.includes('light'));
			meta.setAttribute('content', light ? '#FAFAFA' : '#2B2B2B');
		}
		try {
			if (theme === 'device') localStorage.removeItem(THEME);
			else localStorage.setItem(THEME, theme);
		} catch {
			// It still holds until the page is reloaded.
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
