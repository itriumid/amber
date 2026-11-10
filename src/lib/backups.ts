// When to remind someone to download a copy of their list. The copies Amber keeps by itself live in
// this browser, beside the list, so clearing its data takes both. A downloaded file is the copy
// that survives that. The reminder comes back after a while or after many new tasks, and never
// more often: someone who says "Not now" isn't asked again for as long.

const DAY = 24 * 60 * 60 * 1000;
export const REMIND_AFTER = { days: 30, tasks: 50 } as const;

export interface BackupNote {
	/** When a copy was last downloaded or shared from this browser; null if never. */
	downloadedAt: number | null;
	/** When the reminder last started counting: a download, "Not now", or the first visit. */
	since: number;
	/** Tasks in the list then. */
	tasks: number;
}

/** What storage held, if it's a note this version understands. */
export function readNote(stored: unknown): BackupNote | undefined {
	if (typeof stored !== 'object' || stored === null) return undefined;
	const { downloadedAt, since, tasks } = stored as Record<string, unknown>;
	if (downloadedAt !== null && typeof downloadedAt !== 'number') return undefined;
	if (typeof since !== 'number' || typeof tasks !== 'number') return undefined;
	return { downloadedAt, since, tasks };
}

/** Whether to remind now: there's a list, and it's been long enough, or it has grown enough. */
export function reminderDue(note: BackupNote, tasks: number, now: number): boolean {
	if (tasks === 0) return false;
	return now - note.since >= REMIND_AFTER.days * DAY || tasks - note.tasks >= REMIND_AFTER.tasks;
}
