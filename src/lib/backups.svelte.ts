// When a copy was last downloaded from this browser, and whether to remind someone to download one.
// Kept in this browser's storage, beside the list, but never in it: it isn't synced or copied.

import { readNote, reminderDue, type BackupNote } from './backups';
import { readDetail, writeDetail } from './storage';

const DETAIL = 'backups';

class Backups {
	/** Undefined until read from storage. */
	note = $state.raw<BackupNote | undefined>(undefined);

	async load(tasks: number) {
		let stored: unknown;
		try {
			stored = await readDetail(DETAIL);
		} catch {
			// Storage didn't open: the problem above the list says so, and a reminder would only add noise.
			return;
		}
		const note = readNote(stored);
		if (note) this.note = note;
		// The first visit starts the count.
		else this.keep({ downloadedAt: null, since: Date.now(), tasks });
	}

	isDue(tasks: number, now = Date.now()) {
		return !!this.note && reminderDue(this.note, tasks, now);
	}

	/** A copy was downloaded or shared: the reminder starts counting again. */
	downloaded(tasks: number) {
		const now = Date.now();
		this.keep({ downloadedAt: now, since: now, tasks });
	}

	/** "Not now": asked again after as long as the first time. */
	dismiss(tasks: number) {
		if (this.note) this.keep({ ...this.note, since: Date.now(), tasks });
	}

	private keep(note: BackupNote) {
		this.note = note;
		writeDetail(DETAIL, note).catch(() => {
			// Not worth interrupting anyone for: at worst the reminder comes again sooner.
		});
	}
}

export const backups = new Backups();
