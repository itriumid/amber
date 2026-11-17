# Accounts, the relay and the paid copy: threat model and design

The decisions are [0001](decisions/0001-free-accounts-and-paid-storage.md) (what's free, what an
account is for, what's paid) and [0003](decisions/0003-accounts-passkeys-and-keys.md) (how
signing in and the keys work). This is how it's built, what it protects against and what it
doesn't, written before any code so it can be reviewed.

## What an account is for

Not for keeping a list secret: the list is encrypted on the device with a key we never see,
signed in or not. An account decides three things:

1. Who may replace or delete an account's list on our server.
2. Who may use our share of Cloudflare's free tier.
3. Later, which accounts are paid for.

So the worst an attacker can do by getting past sign-in is spoil or delete a copy, never read
one. Every device still has its own copy of the list, as it does today.

## What the server holds

One Durable Object per account, with its own SQLite storage, in the Worker that already runs
sync (`itrium-backend-amber`, reached only through Amber's site at `/api/`).

| Held                                                                                   | Why                                                   |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| The account's identifier: 128 random bits                                              | To find the account                                   |
| Each passkey's credential identifier, public key and signature counter                 | To check a passkey sign-in                            |
| Each signed-in device's public key, the name the person gave it, when it was last used | To check that a request comes from a signed-in device |
| The account key, wrapped three ways (below)                                            | So a new device can unwrap it                         |
| A check for the recovery code: a hash of a secret derived from it                      | So the recovery code can prove whose account it is    |
| The list, encrypted, with a version number and when it was written                     | The relay, and for a paid account the copy kept       |
| Earlier versions, encrypted, for a paid account                                        | To go back to one                                     |
| The plan, paid until when, a billing reference, the merchant's subscription identifier | The paid copy                                         |

Not held: an email address, a name, a password, the account key, the passphrase, the recovery
code, or anything of the list in plain text. Requests aren't logged with addresses: the Worker's
logs stay off, as sync's are.

## Who we defend against

| Someone who…                             | What they get                                                                                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| knows or guesses an account's identifier | Nothing. Every request needs a passkey, the recovery code, or a signed-in device's key. The wrapped keys are given out only after one of those.                                                                      |
| gets a copy of everything on our server  | Ciphertext, and keys wrapped by a passphrase they'd have to guess, each guess costing 600,000 rounds of PBKDF2. **Protected, as far as the passphrase is strong**, and fully where a passkey's PRF wraps it instead. |
| watches the network                      | Nothing: HTTPS, and everything inside it already encrypted.                                                                                                                                                          |
| steals or picks up a signed-in device    | What that device already has. They can't copy its device key, which the browser won't export. "Signed-in devices" removes it from another device, and can change the account key so it can't follow later changes.   |
| breaks into the merchant                 | Who paid, and a billing reference that only our server can match to an account. Never a list.                                                                                                                        |
| runs Itrium's server                     | The same as someone with a copy of it: no key, no plain text.                                                                                                                                                        |
| gets a script into the page              | What any signed-in page can do. The Content-Security-Policy stays as strict as it is.                                                                                                                                |

## What can still go wrong

- **Losing every way in.** With no passkey that works, no passphrase, and no recovery code, the
  kept copy can't be opened, by anyone, us included. The devices that have the list still have
  it. Said plainly when an account is made, before anything is kept.
- **A weak passphrase**, where one is used: a stolen copy of our storage can be guessed at
  offline. Amber asks for at least 12 characters, as locked lists do.
- **Two devices writing at once.** Each write names the version it started from; the server
  refuses one that's out of date, and the device merges and tries again. Nothing is overwritten.
- **Running out of free tier.** Past a daily limit, Durable Object requests fail until the next
  day; they're never billed on the free plan. Amber keeps working offline and says the relay is
  resting.

## Keys

**The account key** is a random 256-bit AES-GCM key, made on the first device. It encrypts the
list, with the account's identifier and the version as additional data, so a copy can't be
passed off as another account's or an older one. Locked lists inside stay sealed with their own
keys, so they're encrypted twice.

It's wrapped, as locked lists' data keys are ([locked-lists.md](locked-lists.md)), by:

1. **A passkey's PRF**, where the passkey supports it: the WebAuthn PRF extension gives a secret
   only that passkey can produce, which goes through HKDF to a wrapping key. One wrapping per
   passkey. Nothing to type.
2. **A passphrase**, where the passkey has no PRF. Asked for once on each new device, with the
   same rules as a locked list's: at least 12 characters, PBKDF2 at 600,000 rounds.
3. **A recovery code, always**: 24 characters from Crockford's alphabet (120 bits), shown once
   when the account is made. Without it, losing the passkey would lose the list, which is the
   risk the WebAuthn spec's editors warn about with PRF.

PRF support is checked when the account is made (`getClientCapabilities()`, then the result of
creating the passkey), never assumed from the browser's name.

**The recovery code also proves ownership.** HKDF turns it into a sign-in secret; the server
keeps only its SHA-256 hash. With 120 random bits behind it, that's safe to check online, which a
passphrase isn't.

## Signing in

**Making an account:** the device makes the account key and a passkey (discoverable, with the
account's identifier as its user handle, and no name or email; the passkey is labelled
"Amber"). It wraps the key, shows the recovery code, waits for "I've kept it somewhere safe", and
only then sends the account to the server.

**Another device:** a passkey sign-in, which the server checks with SimpleWebAuthn. The server
answers with the wrapped keys; the device unwraps with PRF, or asks for the passphrase.

**Lost passkey:** the recovery code. It proves the account, unwraps the key, and adds a new
passkey. Old passkeys can be removed in Account.

**Staying signed in, without cookies:** a signed-in device makes a P-256 key pair the browser
won't export, keeps it in IndexedDB, and registers the public half with the account. Every
request after that is signed: the method, the path, a hash of the body, and the time. The server
checks the signature, that the key is still registered, and that the time is within five minutes.
A replayed write fails its version check; removing a device or a passkey, changing the key and
deleting the account also need a fresh challenge from the server, so they can't be replayed. A
passkey is asked for when signing in and when adding a device, not on every sync. The footer's
"no cookies" stays true.

**Signing out** deletes the device key and this device's unwrapped account key. The list stays on
the device, as it was before signing in.

## The relay

- **One encrypted list per account**, not a row per task. The server can't read it, so splitting
  it buys nothing and costs reads and writes. At most 1 MB, sync's limit.
- **Read rarely.** Opening Amber asks once for the version (one request). The list is downloaded
  only when the version changed, merged on the device, and sent back only if the merge changed
  it. Changes are sent once they've settled (a few seconds without another), and when the page
  is hidden, with `keepalive`.
- **Held about a week:** a Durable Object alarm deletes the list 7 days after the last write,
  unless the account is paid for. The account itself (its passkeys and devices) stays until it's
  deleted.
- **Merging stays on the device**, exactly as sync and bringing a list in do now: every field is
  stamped, and nothing is overwritten.

## The paid copy

- **The merchant knows who paid; we know which account is paid for.** "Keep a copy" sends the
  person to the merchant's own checkout page, by a full redirect rather than an overlay, which
  would load their script into Amber and break the Content-Security-Policy. It carries a billing
  reference: random, held only by us, matched to the account on our server. The merchant has the
  email, the card, receipts and tax.
- **A webhook** from the merchant to `/api/billing/` records the plan, paid until when, and the
  subscription identifier. Its signature is checked, an event is applied once, and events that
  arrive out of order can't undo a later one: refunds, chargebacks and failed renewals included.
  This is server to server: no new connection from the browser.
- **What it adds:** the list isn't deleted after a week, and earlier versions are kept (one a
  day for 30 days), each restorable as new changes, as copies are now.
- **When a subscription ends,** the copy is kept for 30 more days, with a note in Amber, then the
  relay's rules apply again.
- **Managing it:** "Manage subscription" opens the merchant's customer portal, from a link our
  Worker asks the merchant for. Cancelling also works from the merchant's email, without signing
  in to Amber.
- **Paying is apart from the data.** We can't read anyone's list, so moving a subscription
  between accounts harms nobody. Someone who loses every way into an account loses its copy, not
  their money: a new account, the merchant's receipt, and the subscription moves across.
- Which merchant is its own decision, made before the paid copy is built. For Indonesia it
  matters: merchants of record handle tax but offer few local ways to pay (QRIS, e-wallets);
  local gateways offer those but leave tax to Itrium.

## How many people the free tier carries

Durable Objects on Cloudflare's free plan (checked November 2026): 100,000 requests and 100,000
rows written a day, 5 GB stored. A person who opens Amber a few times a day and makes a few
dozen changes sends about 20 requests and writes about 20 rows. That's around **5,000 people a
day**. At 200 KB a list, 5 GB holds about 25,000 relayed lists. The numbers to watch, and
re-check before building, since Cloudflare changes them.

## Deleting an account

From Account, with a fresh passkey sign-in or the recovery code: the Durable Object's storage is
deleted at once, all of it. A paid account is cancelled with the merchant first, and Amber says
what the merchant keeps (their records of the payment, as tax law requires).

## What changes when it ships, and not before

- The footer's "No account" becomes "No account needed", and says what an account keeps, where.
- PRODUCT.md and AGENTS.md describe the new connection: requests to Amber's own site, from a
  signed-in device, with an encrypted list.
- A privacy policy page: what we hold (the table above), what the merchant holds, how long, and
  how to delete it.
- Dependencies: `@simplewebauthn/server` in the Worker and `@simplewebauthn/browser` in the
  page, version 13, which supports Cloudflare Workers. Agreed with the owner on 17 November 2026.

## Before it ships

- Unit tests, in Node like `sync/mailbox.ts`'s, for the account's rules apart from Cloudflare:
  signed requests (wrong key, old time, removed device), version conflicts, the week's expiry,
  entitlement, and webhooks (bad signature, repeated, out of order).
- Unit tests for the keys: each wrapping opens, the wrong one doesn't, the recovery check, and
  a list encrypted for one account or version doesn't open as another.
- Browser tests with Chrome's virtual authenticator, with PRF and without: making an account,
  signing in on a second device, recovering with the code, the relay both ways, signing out, and
  deleting an account. Nothing in plain text in any request.
- A review of this design and of the code by someone other than its author, then an outside
  security review, with locked lists'.

## Built in this order

1. Accounts and the relay, free: the Worker's account object, signing in, the relay, Account in
   Amber.
2. The paid copy, once the merchant is chosen.

## Decided with the owner

1. **The key comes from the passkey's PRF where it works, a passphrase where it doesn't**, and a
   recovery code always.
2. **Passkeys, checked with SimpleWebAuthn**, with signed-in devices holding their own key
   instead of a cookie or a token.
3. **A Durable Object per account**, on the free plan, where going past a limit fails rather
   than bills.
4. **Paying is tied by a billing reference**, through a merchant's hosted checkout and webhook;
   no email on our side.
