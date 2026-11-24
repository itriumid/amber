// Settings for this browser, kept in its storage beside the list but never in it: they aren't
// synced or copied.

import { readDetail, writeDetail } from './storage';

const SINGLE_KEY_SHORTCUTS = 'singleKeyShortcuts';
/** In the browser's local storage, not beside the list: static/theme.js reads it before drawing. */
const THEME = 'amber-theme';

export type Theme = 'device' | 'light' | 'dark';

const LIGHT = '(prefers-color-scheme: light)';

/** The theme the page shows for a setting: the one chosen, or the device's. */
function shown(theme: Theme): 'light' | 'dark' {
	if (theme !== 'device') return theme;
	return matchMedia(LIGHT).matches ? 'light' : 'dark';
}

/**
 * Shows a theme, the way static/theme.js does before drawing. With `fade`, the whole page fades
 * from the old theme to the new (app.css sets how long), instead of a dark screen turning white at
 * once. Fading every element's colors instead would also run on the first drawing and on top of
 * the page's own transitions.
 */
function show(theme: 'light' | 'dark', fade: boolean) {
	const apply = () => {
		document.documentElement.dataset.theme = theme;
		document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
		// The browser's own bar takes the page's color.
		for (const meta of document.querySelectorAll('meta[name="theme-color"]'))
			meta.setAttribute('content', theme === 'light' ? '#FAFAFA' : '#2B2B2B');
	};
	if (
		fade &&
		document.documentElement.dataset.theme !== theme &&
		'startViewTransition' in document &&
		!matchMedia('(prefers-reduced-motion: reduce)').matches
	)
		document.startViewTransition(apply);
	else apply();
}

class Settings {
	/**
	 * N, S, / and ?, which work anywhere outside a field. They can be turned off: pressed by mistake,
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
		// static/theme.js pinned the device's theme before drawing, so the stylesheet doesn't
		// switch on its own when the device does: the page fades to it here. Brought up to date
		// first, in case the device switched while the page was loading.
		if (this.theme === 'device') show(shown('device'), false);
		matchMedia(LIGHT).addEventListener('change', () => {
			if (this.theme === 'device') show(shown('device'), true);
		});
		try {
			const stored = await readDetail(SINGLE_KEY_SHORTCUTS);
			if (typeof stored === 'boolean') this.singleKeyShortcuts = stored;
		} catch {
			// Storage didn't open: the defaults hold, and the problem above the list says why.
		}
	}

	setTheme(theme: Theme) {
		this.theme = theme;
		show(shown(theme), true);
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
