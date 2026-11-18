# Locked lists: threat model and design

The decision is [0002](decisions/0002-locked-lists.md): a locked list is a kind of list a person
chooses, never the default. This is how it's built, what it protects against and what it doesn't,
written before any code so it can be reviewed.

## What's protected

The contents of a locked list's tasks: their titles, notes and steps. People will keep passwords,
door codes, account and card numbers there.

Not protected, and visible to anyone with the device or a copy of the list: the list's name and
color, how many tasks it has, which are done, when, and their order. Tags aren't allowed on a
locked list's tasks, since a tag's name is shared with other lists.

## Who we defend against

| Someone who…                                                  | While the list is closed                                                                                                                           | While it's open                                                                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| picks up the unlocked phone or laptop, or the browser profile | Sees only the list's name. **Protected.**                                                                                                          | Sees entries' names, and notes that are revealed. It closes itself when the page is hidden and after 5 minutes without use, which keeps this short.                          |
| gets a backup file, a link, or the sync mailbox's contents    | Gets only ciphertext. Has to guess the passphrase, each guess costing 600,000 rounds of PBKDF2. **Protected, as far as the passphrase is strong.** | The same: open or closed, nothing leaves in plain text.                                                                                                                      |
| reads over a shoulder                                         | Nothing to read.                                                                                                                                   | Names show; notes show as dots until revealed, one entry at a time.                                                                                                          |
| runs Itrium's server                                          | Sees nothing: sync is already encrypted with a key from the code, and a locked list is encrypted again inside it.                                  | The same.                                                                                                                                                                    |
| gets a script into the page                                   | Nothing to read without the passphrase.                                                                                                            | Could read what's open. The Content-Security-Policy, which allows no inline script and nothing from another domain, is what stands in the way, and stays as strict as it is. |

Out of reach for any web page, and said so where locked lists are offered: a device that's already
compromised (a keylogger, malware), and a malicious browser extension, which can read any page.

## What can still go wrong

- **A forgotten passphrase.** Without it the list can't be opened, by anyone. This is the new way
  to lose data. See the recovery code below.
- **A weak passphrase.** A stolen file can be guessed at offline. Amber asks for at least 12
  characters and says that a few unrelated words are stronger than one clever word.
- **What was plain before it was locked.** Locking an existing list, or moving a task into one,
  leaves earlier plain copies behind: the copies this device keeps (up to 7 daily and 10 before
  risky actions), files and links made earlier, and, for a while, deleted space in the browser's
  storage. Amber says so when it happens, and offers to delete this device's kept copies.
- **The clipboard.** Copy tries to clear the clipboard 30 seconds later, but a page can only do
  that while it has focus, and clipboard managers keep their own history.
- **An older value brought back.** A sealed value is bound to its record and field, not to when it
  was written, so a file or link made earlier could bring back an entry's older notes, stamped as
  newer by someone who edited the file. Accepted, after the security review of 18 November 2026:
  binding each value to its write would make every Undo of a locked entry look like an attack.
  Bringing a list in shows what it changes first ("Changes 1 task"), and can be undone.

## How it's stored

**Envelope encryption.** Each locked list has its own random 256-bit data key. Fields are
encrypted with the data key; the data key is stored only wrapped (encrypted) by a key made from
the passphrase. So:

- changing the passphrase re-wraps one key instead of re-encrypting every task;
- two devices that change it at the same time still agree, since both wrap the same data key and
  the later one wins;
- a recovery code is a second wrapping of the same data key.

**The saved format becomes version 2.** The migration from 1 only adds fields, set to `null` and
stamped at the start of time:

| Record   | New field                    | Holds                                                                                                                                                                              |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| category | `lock`                       | `null`, or `{ salt, iterations, wrapped, recovery }`: the PBKDF2 salt and count, the data key wrapped by the passphrase's key, and (optionally) wrapped by the recovery code's key |
| task     | `sealedTitle`, `sealedNotes` | `null`, or `{ iv, data }`: AES-GCM ciphertext                                                                                                                                      |
| step     | `sealedText`                 | `null`, or `{ iv, data }`                                                                                                                                                          |

In a locked list, a task's plain `title` and `notes` and a step's `text` are empty, and the sealed
fields hold them. Each sealed field is its own register, so editing the title on one device and
the notes on another still merges both, as now. Each field is encrypted with its record's
identifier and the field's name as additional data, so a ciphertext can't be moved to another
task or field without failing to open.

A new fixture, `fixtures/format-2.json`, holds a locked list with a known passphrase; the format
tests open it forever. A list written in format 2 opens read-only in an older Amber, as any newer
format does, so an old device can't add plain tasks to a locked list. If a merge ever brings in a
plain task (from a device that didn't know the list was locked yet), it's sealed the next time the
list is opened.

## How it behaves

- **Making one:** "Locked list" is a third choice beside To-do list and Bucket list, when a category
  is made or in its editor. Choosing it asks for a passphrase, twice or shown, and shows the
  recovery code to keep. Nothing is locked until the person confirms.
- **Closed:** the list shows its name, a lock, and its count. Opening it asks for the passphrase.
  Its entries are never in search results, in another list's view, or in an Undo message's text
  ("Done: an entry in Passwords", not the entry's name).
- **Open:** an entry shows its name, so the right one can be found; its notes, where its secret
  goes, show as dots, with Reveal (one entry at a time) and Copy. Adding, editing, ticking, moving
  within the list and deleting work as anywhere else, with Undo. Quick add's `#` and `@` are off
  inside a locked list, and `@Passwords` from elsewhere asks to open it first. (Decided with the
  owner after the first critique, 18 November 2026: before, names were hidden too, and entries
  could only be told apart by revealing each.)
- **Moving a task in or out** needs the list open: in, it's sealed; out, it's opened into plain
  text, after saying so.
- **Closing:** a Lock button, the page being hidden, 5 minutes without use, or a reload. The data
  key is held only in memory, as a key the browser won't export, and dropped on closing. So is
  everything Undo remembered about the list: it holds what the list said before it was locked, so
  Ctrl or ⌘ with Z after closing can't bring it back.
- **Changing the passphrase** needs the list open and the current passphrase or the recovery code.
  Everything is sealed again under a new key, which comes with a new recovery code, so the old
  passphrase and code open only copies made before. **A new recovery code**, for a lost one, works
  the same way from the passphrase.
- **What comes in plain** (an edit from a device that didn't know the list was locked, a task
  from a deleted subcategory) is sealed when the list is opened, newest value kept. Deleted
  entries are sealed with the rest: files, links and sync still carry them.
- **A lock that changes from elsewhere** (taken off, added or changed by a list brought in or a
  sync) is said before it's merged, and an entry sealed under another key says it can't be
  opened rather than showing empty.
- **Making it an ordinary list again** needs it open, and says that its tasks will be plain text.

## Before it ships

- Unit tests: sealing and opening, wrong passphrases, the additional data, re-wrapping, the
  recovery code, merging sealed fields from two devices, the migration and the new fixture.
- Browser tests: nothing of a closed list's tasks is in the page (text, search, Undo), it closes
  when hidden and when idle, and backups, links and sync carry only ciphertext.
- A review of this design and of the code by someone other than its author (done on 18 November
  2026; what it found is in [`security-review.md`](security-review.md)), then an outside security
  review before Amber says it's safe for passwords. That brief is written for the outside
  reviewer.

## Decided with the owner

1. **A recovery code**, shown once when a list is locked, as a second way in. A forgotten
   passphrase is survivable, and still nobody but the person holding the code or the passphrase
   can open the list.
2. **An existing list can be locked**, as well as a new one, with the warning about plain copies
   left behind and the offer to delete this device's kept copies.
3. **It closes after 5 minutes without use**, and whenever the page is hidden.
