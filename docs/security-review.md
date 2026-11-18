# A brief for an outside security review

Amber is a free to-do and bucket-list web app at amber.itrium.id that keeps lists in the
browser. This brief is for someone reviewing its security from outside Itrium. It says what we'd
like reviewed and why, where everything is, what an internal review already found, and what we
chose to accept. Its first purpose: Amber doesn't call locked lists safe for passwords until a
review like this one has happened.

## What we'd like reviewed

1. **Locked lists**, first and most. A list a person chooses to lock: its entries' names, notes
   and steps are encrypted on the device with a key wrapped by a passphrase and by a recovery
   code. People will keep passwords, door codes and account numbers in them. The design and
   threat model are in [`locked-lists.md`](locked-lists.md); please read it before the code, and
   tell us where the code and the document disagree.
2. **What leaves the device**: backup files and links (plain, scrambled, or locked with a
   passphrase), and sync, which passes an encrypted list through a mailbox on our server for at
   most ten minutes.
3. **The page itself**: the Content-Security-Policy, the service worker that serves it offline,
   and anything that could get a script into the page, since a script in the page can read an
   open locked list.

Not in scope: Cloudflare's own platform, the browser, and a device or browser extension that's
already compromised, which no web page can defend against (the threat model says so).

## Where things are

| What                                                     | Where                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Encryption for locked lists                              | `src/lib/sealing.ts`, with the key derivation it shares in `src/lib/transfer.ts` (`keyFrom`)                              |
| Open lists, keys in memory, closing, sealing what's sent | `src/lib/locks.svelte.ts`                                                                                                 |
| The actions that lock, unlock and move                   | `src/lib/model/actions.ts`, the locked-lists section                                                                      |
| Merging records from another copy                        | `src/lib/model/list.ts` (`merge`), and its previews in `src/lib/transfer.ts`                                              |
| The saved format, and what a record must look like       | `src/lib/model/format.ts`; fixtures in `src/lib/model/fixtures/`                                                          |
| Files and links                                          | `src/lib/transfer.ts`; one of every kind in `src/lib/fixtures/files/`                                                     |
| Sync, on the device                                      | `src/lib/sync.ts`: a 16-character code (80 bits) goes through HKDF to the mailbox's name and an AES-GCM key               |
| Sync, on the server                                      | `sync/mailbox.ts` (the rules, tested in Node) and `sync/index.ts` (the Worker and Durable Object)                         |
| What's kept on the device                                | `src/lib/storage.ts`: IndexedDB, with daily copies (7) and copies before risky actions (10)                               |
| Undo                                                     | `src/lib/amber.svelte.ts` (`act`, `forget`, `undo`)                                                                       |
| Content-Security-Policy                                  | `vite.config.ts` and `_headers`; guarded by `src/csp.test.ts` and `src/headers.test.ts`                                   |
| The pages that show locked lists                         | `src/lib/components/` (`LockSheet`, `UnlockSheet`, `TaskRow`, `TaskDetails`, `CategoryEditor`), `src/routes/+page.svelte` |

The choices, in short: PBKDF2-SHA-256 at 600,000 iterations from the passphrase, AES-GCM with a
fresh 96-bit IV for every value, each value bound to its record and field as additional data, a
random 256-bit data key per list held only as a key the browser won't export, and a 120-bit
recovery code. Every field is a register stamped by a hybrid logical clock, and copies merge
field by field.

## Running it

`pnpm install`, then `pnpm dev` for the app, `pnpm test` for the unit tests and `pnpm test:browser`
for the browser tests (they build the site, and run on a desktop and a phone screen). The test
files worth reading first: `src/lib/sealing.test.ts`, `src/lib/model/locked.test.ts`,
`src/lib/files.test.ts`, `src/lib/transfer.test.ts`, and the locked-list tests near the end of
`tests/amber.test.ts`.

## What the internal review found

An internal review on 18 November 2026, by a reviewer who hadn't written the code, found these;
all are fixed and tested unless they're under the next heading.

| Finding                                                                                                     | Severity | Fixed in |
| ----------------------------------------------------------------------------------------------------------- | -------- | -------- |
| After a list closed itself, Undo brought it back unlocked and in plain text, and saved that                 | Critical | #44      |
| Tasks and steps deleted before locking kept their plain text, and files, links and sync carry them          | High     | #44      |
| Moving several tasks at once into a locked list skipped sealing them                                        | High     | #44      |
| An edit from a device that didn't know the list was locked stayed in plain text                             | High     | #44      |
| A list being opened while the page was hidden stayed open                                                   | Low      | #44      |
| A lock asking for billions of PBKDF2 rounds could hang the page                                             | Low      | #44      |
| A sync or a list brought in could take a lock off, add one or change one without saying so                  | Medium   | #45      |
| A new passphrase or recovery code kept the same data key, so old copies plus the old secret opened new data | Medium   | #44, #45 |
| A recovery code copied stayed on the clipboard                                                              | Low      | #45      |

## What we chose to accept

- **An older value brought back.** A sealed value is bound to its record and field, not to the
  write that made it. Someone who edits a file to stamp an entry's older notes as newer, and gets
  its owner to bring the file in, rolls those notes back. Binding each value to its write would make
  every Undo of a locked entry look like this attack. Bringing a list in shows what it changes
  first, and can be undone.
- **Plain copies made before a list was locked.** Files and links made earlier, and for a while
  the browser's own deleted storage, still have it. Amber says so when locking, and offers to
  delete this device's copies that hold the list in plain text.
- **Names while open.** An open locked list shows its entries' names, so the right one can be
  found; their notes, where the secret goes, stay hidden until revealed. Closed, nothing shows.
- **Scrambled files aren't locked.** A file without a passphrase is encrypted under a key anyone
  can make from Amber's source, so it isn't readable at a glance. It's described that way, never
  as locked.

## What we'd most like to hear

- Anything that lets a closed locked list be read on the device, or any part of it leave the
  device unsealed.
- Anything in merging that loses data or opens a list without its passphrase.
- Whether the parameters above are right for passwords kept by the general public, on phones.
- Where the threat model in [`locked-lists.md`](locked-lists.md) promises more than the code does.
