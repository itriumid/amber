# 0002. Locked lists, chosen by the person, never the default

Status: proposed

## Context

Many people don't use a password manager. They keep passwords, door codes and account numbers
in a notes app, a screenshot, or a list like Amber's, in plain text that anyone holding the
unlocked phone or laptop can read. Amber's lists are plain text in the browser's storage too.

We want Amber to be a safer place for those things, without becoming a password manager:
autofill, a browser extension and breach alerts are a different product, with a different
level of risk and upkeep, competing with free, audited ones.

## Decision

**A locked list is a kind of list a person chooses**, beside To-do list and Bucket list, when
making a category or later in its editor. No list is ever locked by default, and nothing about
an ordinary list or task changes.

- **Encrypted on the device, apart from the rest.** A locked list's tasks (titles, notes and
  steps) are encrypted with a key made from the list's own passphrase, the way locked files are
  made today (PBKDF2 with SHA-256, 600,000 iterations, then AES-GCM). The key is kept in memory
  only while the list is open.
- **Closed unless opened.** It locks itself when the page is hidden, after a few minutes without
  use, and when its Lock button is pressed. Closed, it shows its name and that it's locked, and
  nothing else.
- **Out of sight when open.** An entry's text shows as dots until it's revealed. A Copy button
  copies it and tries to clear the clipboard about 30 seconds later; a page can only do that
  while it has focus, so it's said as trying.
- **Nowhere else.** A locked list's tasks are never in search results, counts that name them,
  tags, or the Undo message's text. Backups, links and sync carry them still encrypted.
- **No way back in without the passphrase.** If it's forgotten, the list can't be opened, by
  anyone, us included. That's said plainly when the list is locked, with a nudge to download a
  backup. Changing the passphrase needs the current one.
- **Unlocking a list for good** (back to an ordinary list) needs the passphrase and says what it
  does.
- **Free**, because it costs us nothing ([0001](0001-free-accounts-and-paid-storage.md)). A paid
  permanent copy carries it encrypted like everything else.
- **What it isn't, said where it's offered:** no autofill, no browser extension, no breach
  alerts. It doesn't protect against a device already compromised or a malicious browser
  extension, which no web page can.

Before it's built: a written threat model, and a review of the design. Before it's described as
safe for passwords: an outside security review.

## Consequences

- The saved format gains encrypted task fields: a new format version, a migration and a fixture,
  as AGENTS.md requires. Merging encrypted fields works as now, since merging compares stamps,
  not contents.
- Search, counts and the task row need a locked-list path that shows nothing it shouldn't.
- Forgetting a passphrase loses the list for good, a new way to lose data in an app whose first
  rule is never losing it. The setup has to make that impossible to miss, and backups have to
  carry locked lists.
- The Content-Security-Policy, which already blocks inline scripts and other domains, is the main
  defense against a script reading a list while it's open, and stays as strict as it is.
