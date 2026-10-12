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
- **Works offline,** and installs to the home screen or the dock. Updates wait until you choose
  them.
- **Undo** for everything.

Your lists stay on your device, and nobody else can read them. There's no account, no cookies and
no analytics: everything is kept in your browser's storage (IndexedDB), and a strict
Content-Security-Policy (in [`vite.config.ts`](vite.config.ts) and [`_headers`](_headers))
blocks every connection that isn't to the site itself.

## Your data is safe across versions

What Amber saves has a format version ([`src/lib/model/format.ts`](src/lib/model/format.ts)).
A newer Amber upgrades older data, after keeping a snapshot of it, with migrations that are only
ever added, and tests read a saved list from every past format. Data saved by a newer Amber than
the one open is shown read-only, never rewritten, and fields an older Amber doesn't know are kept
as they are.

Every change is stamped with a hybrid logical clock and merged per field, so lists can later be
combined from several devices without losing edits. Syncing is planned: end-to-end encrypted and
opt-in.

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
