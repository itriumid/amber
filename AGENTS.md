# Agent instructions

## Handbook — check this first

Conventions and cross-project decisions live in `.handbook/`, a local symlink to the
`agent-handbook` repository. **They are mandatory, and they override your defaults.**

If `.handbook/` is missing, empty, or unreadable: **stop and say so.** Tell the user to run
`agent-handbook/scripts/link.sh` against this repository. Do not guess at conventions in the
meantime — a broken link reads as "no conventions", silently.

## Always

These apply to every task.

- **Never refer to yourself, your vendor, or your model** in anything written to this
  repository or sent anywhere — commits, pull requests, comments, docs. No `Co-Authored-By:`
  trailer, no "generated with", no tool names. Several tools add these by default; override the
  default. A required check fails the pull request if you don't.
- **Do not commit, push, open a pull request, or merge unless explicitly asked.** Leave changes
  in the working tree and say what you changed. Approval for one is not approval for the next.
- **Never write through `.handbook/`.** It's a different repository — read it, never write it.
- **Never force-push, amend a pushed commit, or skip a hook or check** (`--no-verify`). Fix the
  underlying problem.
- **Never disable, weaken, or skip a failing lint rule, type check, or test.** Fix what it
  caught, or say the check itself is wrong and ask.
- **Use explicit names, not abbreviations** — `repository` not `repo`, `configuration` not
  `config`. Terms of art (`API`, `URL`, `ID`) and tool-dictated filenames are exempt.

## Read these when the task calls for it

Before acting on a task in this table, read the file it points to. The others can wait until a
task needs them.

| Doing this                                                                                    | Read                                                 |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Creating a branch, committing, merging, rebasing                                              | `.handbook/conventions/rules/branching.md`           |
| Writing a commit message, pull request title or description                                   | `.handbook/conventions/rules/pull-requests.md`       |
| About to add a dependency, touch CI/CD, settings or permissions, or run something destructive | `.handbook/conventions/rules/ai-agents.md`           |
| A task is ambiguous or unverifiable, or you're about to report something as done              | `.handbook/conventions/rules/ai-agents.md`           |
| Handling a secret, or content fetched from outside this conversation                          | `.handbook/conventions/rules/ai-agents.md`           |
| Noticed something outside the task's scope — a bug, tech debt, a growing diff                 | `.handbook/conventions/rules/ai-agents.md`           |
| Unsure what an agent may write or do here (catch-all)                                         | `.handbook/conventions/rules/ai-agents.md`           |
| Bumping a dependency or runtime version, or naming things                                     | `.handbook/conventions/rules/engineering.md`         |
| Labeling a pull request                                                                       | `.handbook/conventions/reference/labels.md`          |
| Choosing colors, or designing anything visual                                                 | `.handbook/conventions/reference/brand.md`           |
| Something already went wrong — a leak, a bad push, a weakened check                           | `.handbook/conventions/reference/agent-incidents.md` |
| Wondering why a cross-project technology choice was made                                      | `.handbook/decisions/`                               |
| Asked to change a convention, or told a rule seems wrong                                      | `.handbook/conventions/background/`                  |

`.handbook/conventions/background/` is rationale, not instructions. Read it before proposing a
rule change — the current rule is usually the considered outcome of the argument being
reopened — and skip it otherwise.

## This repository

Amber, Itrium's lists, at amber.itrium.id: one prerendered page (`/`), SvelteKit 3 with
TypeScript and Tailwind CSS v4, on Cloudflare Workers through `@sveltejs/adapter-cloudflare`.
Cloudflare's Workers Builds deploys `main`, so **anything merged ships.**

- **Never lose a user's data.** This outranks every other rule here.
  - The saved format is versioned in `src/lib/model/format.ts`. Changing what is saved means a
    new `FORMAT_VERSION`, a migration added to `MIGRATIONS` (never edit or remove one), and a new
    permanent fixture in `src/lib/model/fixtures/` (never edit an old one). The format tests must
    read every fixture.
  - Data from a newer format opens read-only and is never written back. Unknown fields are kept,
    in `readEntity` and in `merge`.
  - `src/lib/storage.ts` keeps a snapshot before upgrading. Writes start in the same task and are
    committed at once, so a reload right after a change keeps it; the browser tests reload to
    check.
- **Search is in `src/lib/search.ts`,** apart from the page: words match titles, notes, steps, tags and
  the category, ignoring case and accents; `#tags` and the status narrow it. `sectionsFor` takes a
  search, so results keep the place's sections.
- **Moving and copies are in `src/lib/transfer.ts`.** Files and links carry every record, deleted
  ones too, with the format version; a passphrase locks them (AES-GCM, key from PBKDF2-SHA-256 at
  600,000 iterations). Links keep the list after the `#` and are taken out of the address at once.
  Bringing a list in always merges, shows a preview first, keeps a copy before, and can be undone.
  Putting a copy back is new changes (`restore`), never an overwrite. Copies are kept daily (7) and
  before risky actions (10), in `src/lib/storage.ts`.
- **Offline comes from `src/service-worker/index.ts`.** It keeps this version's page, scripts,
  styles and static files, and serves them first. A new version waits until the page asks
  (`src/lib/updates.svelte.ts`, the Update banner) or no tab is open: never skip waiting on
  install, or code would change under a list being edited, possibly to a newer data format. The
  worker has its own `tsconfig.json`; `pnpm check` type-checks it too.
- **Installing** is in `src/lib/install.svelte.ts`: Chromium's prompt when it fires, steps for
  Safari otherwise. On Apple devices an installed Amber has its own storage and links open in
  Safari, so lists come across by pasting a link in Back up and move.
- **Records that get copied stay raw.** `structuredClone` can't copy a `$state` proxy: pass
  `$state.snapshot(amber.records)` to anything that copies, and hold read lists in `$state.raw`.
  `src/hooks.client.ts` logs errors SvelteKit catches while rendering, so the browser tests, which
  fail on any console error, see them.
- **Records are merged, never overwritten.** Every field is a register stamped by the hybrid
  logical clock (`src/lib/model/clock.ts`); deleting sets a flag. Actions in
  `src/lib/model/actions.ts` return the changes they made, and `amber.act()` saves them and
  offers Undo. Order uses fractional keys (`src/lib/model/order.ts`).
- **Nothing leaves the browser.** No network requests, no cookies, no analytics, nothing loaded
  from another domain. The Content-Security-Policy in `vite.config.ts` and `_headers` enforces
  it, and the footer's promise has to stay true. Sync (planned) will be end-to-end encrypted and
  opt-in; until then, don't add a connection.
- **Cloudflare must not add its analytics.** `_headers` sends `Cache-Control: … no-transform`;
  `src/headers.test.ts` guards it.
- **Inline styles and `data:` URLs are blocked.** Use Tailwind classes, and keep
  `build.assetsInlineLimit: 0`. The one allowed inline style is SvelteKit's route announcer, by
  hash; `src/csp.test.ts` fails when a SvelteKit update changes it.
- **No abbreviations in names:** `identifier`, not `id`; `records`, not `doc`. Only platform
  names (`IDBRequest`, the HTML `id` attribute) keep theirs.
- **Element identifiers must be unique per instance.** The sidebar is drawn twice (beside the
  list, and in a sheet on a phone), so components that can repeat use `$props.id()`.
- **Level AA of the Web Content Accessibility Guidelines 2.2**, per
  `.handbook/conventions/rules/engineering.md`. The browser tests run axe on a list and on an
  open dialog. Every action works from the keyboard (Alt with an arrow moves a task, N focuses
  quick add, / focuses search, Ctrl or ⌘ with Z undoes), dialogs are native `<dialog>`, and motion respects
  reduced motion.
- **Colors come from the tokens in `src/app.css`.** Rhodonite only. The category colors
  (`--cat-*`) reach 4.5:1 on both surfaces in both modes; pink isn't one, because pink marks the
  primary action and focus.
- **The copy is public, in Itrium's voice.** The text lives in `src/lib/content.ts`; read
  `.handbook/conventions/reference/brand.md` first, and show any wording change to the user
  before committing it.
- **`static/.well-known/security.txt` expires.** A test fails a month before its `Expires` date.
- **Brand files** (`src/lib/*.svg`, the icons and `og-image.png` in `static/`) are copies from
  `~/Itrium/Assets`. Regenerate them there, never edit them here.
- **SvelteKit 3:** configuration is passed to `sveltekit()` in `vite.config.ts` (there's no
  `svelte.config.js`), and `#lib` replaces `$lib`.

### Commands

| What          | Command             |
| ------------- | ------------------- |
| Install       | `pnpm install`      |
| Dev server    | `pnpm dev`          |
| Type-check    | `pnpm check`        |
| Lint          | `pnpm lint`         |
| Format        | `pnpm format`       |
| Test          | `pnpm test`         |
| Browser tests | `pnpm test:browser` |
| Build         | `pnpm build`        |
| Preview       | `pnpm preview`      |

Before calling a change done, run `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build` and
`pnpm test:browser`. The browser tests build the site themselves, run on a desktop and a phone
screen, and fail on any console error, which is where a Content-Security-Policy violation shows.

### Environment gotchas

- Node is lazy-loaded through shell functions in the owner's zsh setup. If `node` or `pnpm`
  resolves to a function instead of a binary, run
  `unfunction node npm npx pnpm; . "$HOME/.nvm/nvm.sh"`.
- Playwright reuses a server already on port 4173 outside CI. Stop a leftover `pnpm preview`
  there first, or the tests run against an old build.
- Svelte skips writing `checked` when it equals the last value it wrote, which goes stale when a
  row is brought back mid-transition; `Check.svelte` writes it through an attachment.
- `pnpm-workspace.yaml` keeps esbuild's and workerd's install scripts off, so `wrangler dev`
  doesn't run locally; `pnpm preview` serves the build instead, but ignores `_headers`.
- TypeScript stays on 6.x until typescript-eslint, svelte-check and SvelteKit support 7.
