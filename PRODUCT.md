# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone: the general public, keeping to-dos, a bucket list, or anything else they want to track.
Privacy is a property of the product, not the reason everyone arrives; most people come for a
list that is simple and quick. One person typically uses Amber on one or more of their own
devices (phone and computer), installed to the home screen or dock or in a browser tab.

## Product Purpose

Amber is Itrium's free list application at amber.itrium.id. It holds tasks in categories, with
steps, tags and colors, and keeps them on the device. Success is a list that is always there,
fast to change, never lost, and readable by nobody but its owner.

## Positioning

Privacy and simplicity, with smooth performance. Against Todoist, Apple Reminders or Things:

- **Private by construction.** No account, no cookies, no analytics, nothing loaded from another
  domain. Lists live in the browser's storage; the only network traffic is a sync the person
  starts, encrypted with a key derived from a code the server never sees.
- **Simple.** Deliberately modest features: categories, steps, tags, search, undo. No
  collaboration or reminders service, and no account.
- **Smooth.** One prerendered page, offline-first, every change saved at once.

## Plans

**Amber is a free tool, and stays one: no accounts, no paid tier, nothing kept on our servers**
([0004](docs/decisions/0004-amber-stays-free.md)). Everything it does happens in the browser,
for everyone. Devices stay in step when a person syncs them once with a code, or moves the list
with a file or a link.

- **Locked lists** are a kind of list a person chooses, beside To-do list and Bucket list, for
  passwords and other things that shouldn't sit in plain text. Never the default: an ordinary
  list stays as it is. Encrypted with their own passphrase, closed unless opened, hidden until
  revealed. Not a password manager: no autofill, extension or breach alerts. Built; an outside
  security review comes before Amber calls them safe for passwords.

## Operating Context

- A single page (`/`) that works offline and installs as an app (Chromium's prompt, or steps for
  Safari). On Apple devices an installed Amber has its own storage, so lists move across by
  pasting a link.
- Keyboard-first use on desktop (N for quick add, / for search, Alt with an arrow to move, Ctrl
  or ⌘ with Z to undo); touch on phones, where the sidebar becomes a sheet.
- Moving between devices: download a file, make a link (optionally passphrase-locked), or sync
  with a 16-character code. Bringing a list in always merges, after a preview, and can be undone.
- Updates wait until the person accepts them (the Update banner) or no tab is open.

## Capabilities and Constraints

- **Tasks** in **categories** (one level of subcategories), with **tags** and a color per
  category; **steps** inside a task, any of which can become a task. **Bucket-list categories**
  keep achieved dreams on a shelf of their own, with the date. Quick add takes `#tags` and
  `@Category`; tasks drag to a new place; several can be ticked, moved or deleted at once.
- **Search** across titles, notes, steps, tags and categories, ignoring case and accents; `#tags`
  and Open or Done narrow it.
- **Back up and move**, daily and before-risky-action copies on the device, **sync** through a
  mailbox that keeps nothing (empties after ten minutes, at most 1 MB), **undo** for everything.
- **Never lose a user's data** outranks everything: versioned format, migrations only added,
  newer-format data opens read-only, merges per field, never overwrites.
- Strict Content-Security-Policy: no inline styles, no `data:` URLs, no third-party connections.
  Any new connection is ruled out.
- English only for now; localization is undecided.
- Stack: SvelteKit 3, TypeScript, Tailwind CSS v4, Cloudflare Workers. Merging `main` ships.

## Brand Commitments

- An Itrium product, in Itrium's voice: "we", plain words, no abbreviations, American English.
  Copy lives in `src/lib/content.ts`; wording changes are shown to the owner before committing.
- Rhodonite palette (graphite with pastel pink); pink marks one thing at a time (the primary
  action and focus), never decoration. Rules in `.handbook/itrium/brand.md`.
- Plus Jakarta Sans, self-hosted. The Itrium element-tile logo, copied from `~/Itrium/Assets`,
  never redrawn.
- The footer's promise must stay true: "Your lists stay on your device, and nobody else can read
  them. No account, and it works offline."

## Evidence on Hand

- The live product and its source (open source at github.com/itriumid/amber).
- Brand files: `src/lib/*.svg`, icons and `og-image.png` in `static/`.
- No testimonials, user counts, reviews or press exist. Don't invent them.

## Product Principles

1. **The list is never lost.** Data safety beats any feature, polish or speed.
2. **Nothing leaves without the person starting it, encrypted.** Privacy is structural, not a
   setting.
3. **Simple over complete.** A feature earns its place only if it keeps the list quick to use.
4. **Fast and calm.** Every change lands immediately; updates never change code under an open
   list.
5. **Works for everyone.** Keyboard, screen reader, large text and reduced motion are first-class.

## Accessibility & Inclusion

Level AA of the Web Content Accessibility Guidelines 2.2, checked with axe in the browser tests.
Every action works from the keyboard; dialogs are native `<dialog>`; focus never falls to the top
of the page; text at 200% wraps instead of squeezing; motion respects reduced motion; category
colors reach 4.5:1 on every surface in both light and dark modes.
