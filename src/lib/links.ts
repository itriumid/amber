// What a link to a list looks like: the list rides after the `#`, which browsers never send to a
// server. Apart from the code that reads and writes links, so the page can spot one without
// loading that code.

export const LINK_PREFIX = { open: '#list=', locked: '#locked=' } as const;

export function isLink(hash: string): boolean {
	return hash.startsWith(LINK_PREFIX.open) || hash.startsWith(LINK_PREFIX.locked);
}

/** Where a list being brought in comes from. */
export type Source = { file: string } | { link: string };
