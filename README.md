# Amber

[Itrium](https://itrium.id)'s lists, live at [amber.itrium.id](https://amber.itrium.id): to-dos,
a bucket list, anything you want to keep track of.

- **Tasks** in **categories** (one level of subcategories), with **tags** and a color for each.
- **Steps** inside a task, when it needs them, and any step can become a task of its own.
- **Your order:** move tasks with their buttons, or with Alt and the arrow keys.
- **Bucket-list categories** keep done tasks in view, with the date they were done.
- **Search** across titles, notes, steps, tags and categories, without caring about case or
  accents. `#tags` and Open or Done narrow it.
- **Back up and move:** download the list as a file or make a link, optionally locked with a
  passphrase, and bring it in on another device. Bringing a list in merges it, after showing what
  would change. Amber also keeps copies on the device each day, and any of them can be put back.
- **Sync with another device:** get a code on one and enter it on the other, or send it the link,
  and both end up with everything from both. The list passes through our server encrypted, and
  only your devices can open it.
- **Works offline,** and installs to the home screen or the dock. Updates wait until you choose
  them.
- **Undo** for everything.

Your lists stay on your devices, and nobody else can read them, us included. There's no account,
no cookies and no analytics: everything is kept in your browser's storage (IndexedDB), and a
strict Content-Security-Policy (in [`vite.config.ts`](vite.config.ts) and [`_headers`](_headers))
blocks every connection that isn't to the site itself. The only thing Amber ever sends is a sync
you start, encrypted.

## Your data is safe across versions

What Amber saves has a format version ([`src/lib/model/format.ts`](src/lib/model/format.ts)).
A newer Amber upgrades older data, after keeping a snapshot of it, with migrations that are only
ever added, and tests read a saved list from every past format. Data saved by a newer Amber than
the one open is shown read-only, never rewritten, and fields an older Amber doesn't know are kept
as they are.

Every change is stamped with a hybrid logical clock and merged per field, so lists can later be
combined from several devices without losing edits. That's what bringing in a list and syncing
do.

## How sync works

Sync is a mailbox, not storage: there's no account, and nothing is kept.

1. The device you start on makes a code: 16 characters, 80 random bits. From it, HKDF-SHA-256
   derives two things, the mailbox's name and an AES-GCM key. The device leaves its list in the
   mailbox, compressed and encrypted.
2. The other device, given the code, derives the same name and key, takes the list, merges it into
   its own, and leaves the result as the reply, encrypted the same way.
3. The first device, which asks every few seconds, takes the reply and merges it in. The mailbox
   is empty again.

Our server sees a mailbox name, which is a hash it can't turn back into the code, and encrypted
bytes it has no key for. It never sees the code or the key. Each part is locked to its place, the
list or the reply, so the server can't pass one off as the other, and anything changed on the way
fails to open. A mailbox works once, empties after ten minutes whether it was used or not, and
holds at most 1 MB.

The code is the only secret, so enter it only on your own devices. Once it's been used, it's
worth nothing.

The device's half is in [`src/lib/sync.ts`](src/lib/sync.ts). The server's rules are in
[`sync/mailbox.ts`](sync/mailbox.ts), and [`sync/index.ts`](sync/index.ts) is the Cloudflare
Worker around them, which only the site can reach.

## Stack

[SvelteKit](https://svelte.dev/docs/kit) with TypeScript and [Tailwind CSS](https://tailwindcss.com),
prerendered and served by [Cloudflare Workers](https://developers.cloudflare.com/workers/).
Cloudflare builds and deploys `main` itself, so merging a pull request publishes it.

## Developing

```sh
pnpm install
pnpm dev
```

| What          | Command                                            |
| ------------- | -------------------------------------------------- |
| Type-check    | `pnpm check`                                       |
| Lint          | `pnpm lint` (Prettier, then ESLint)                |
| Format        | `pnpm format`                                      |
| Test          | `pnpm test`                                        |
| Browser tests | `pnpm test:browser` (builds, then runs Playwright) |
| Build         | `pnpm build`                                       |
| Preview build | `pnpm build && pnpm preview`                       |

The browser tests need Chromium once: `pnpm exec playwright install chromium`.

The list's rules (records, merging, ordering, every action) are in
[`src/lib/model`](src/lib/model), apart from the pages, and are tested. The text of the site is
in [`src/lib/content.ts`](src/lib/content.ts).

## License

The code is [MIT](LICENSE). The Itrium name and logo aren't covered by it: please don't use
them for your own work.
