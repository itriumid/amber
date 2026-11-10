// Everything Amber says, in one place, so the copy can be reviewed without reading markup.
// It's public copy in Itrium's voice: "we", plain words, no abbreviations. See the brand brief.

export const SITE_URL = 'https://amber.itrium.id';
export const MAIN_SITE_URL = 'https://itrium.id';
export const EMAIL = 'hello@itrium.id';
export const SOURCE_URL = 'https://github.com/itriumid/amber';

export const TITLE = 'Amber: lists that stay on your device';
export const DESCRIPTION =
	'Amber is a free to-do and bucket list. Your lists stay on your device, and nobody else can read them. No account, and it works offline.';

export const PROMISE = 'Your lists stay on your device, and nobody else can read them.';
export const PROMISE_DETAIL = 'No account, and it works offline.';
export const STORAGE_NOTE =
	'Your lists live in this browser. Clearing its data for this site deletes them, so keep a copy of anything that matters.';
export const SYNC_NOTE =
	'Syncing with another device passes an encrypted copy through our server for a few minutes, and only your devices can open it.';
export const FOOTNOTE = 'Made by Itrium.';

// Problems with storage, shown above the list.
export const NEWER_FORMAT_PROBLEM =
	'This list was saved by a newer version of Amber, so it can be read but not changed until Amber updates.';
export const NEWER_TAB_PROBLEM =
	'A newer version of Amber is open in another tab, so this one can show your list but not change it. Reload to update.';
export const SAVE_PROBLEM =
	"This browser stopped letting Amber save your list, so your latest changes aren't kept here. Download a copy to keep them safe.";
export const OPEN_PROBLEM =
	"Amber couldn't open its storage in this browser, so your list can't be shown or saved. Reload to try again, or check that this site is allowed to keep data.";
export const OLDER_TAB_PROBLEM =
	'Amber is open in another tab with an older version. Close it and reload.';
export const DOWNLOAD_COPY = 'Download a copy';

// A reminder to download a copy, now and then: the copies Amber keeps by itself are in this
// browser too, and go with it.
export const backupReminder = (lastDownloaded: string | undefined) =>
	lastDownloaded
		? `Your last downloaded copy is from ${lastDownloaded}. If this browser's data is cleared, anything newer goes with it.`
		: "You haven't downloaded a copy of your list yet. If this browser's data is cleared, the list goes with it.";
export const NOT_NOW = 'Not now';
