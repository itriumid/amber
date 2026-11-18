# 0001. Free stays free; accounts for relaying, payment for keeping

Status: superseded by [0004](0004-amber-stays-free.md)

## Context

Amber is free, keeps lists in the browser, and has no account. Its footer promises "No account,
and it works offline", and Itrium's brief says free tools stay free, "with no hidden upsell, no
account wall and no advertisements".

We want to offer more: devices that stay in step without a code each time, and a permanent copy
of a list that a new phone can restore. Both need our servers to hold something, which costs
money, so some of it has to be paid for. We also run on Cloudflare's free tier for now, so what
we store and how often it's read has to stay small.

Ways to draw the line that we considered:

- **Free, signed in, and paid tiers by feature**, with customizations (more colors, and the like)
  for signed-in people. But customizations live in the browser and cost us nothing, so putting
  them behind an account is a wall with nothing behind it, and taking anything free away later
  breaks the brief.
- **Everything free, paid for some other way:** no way to pay for storage that grows with every
  person who uses it.
- **Charge for what costs us money, and only that:** a rule anyone can check a feature against.

## Decision

**What's free stays free and complete. We charge only where we keep something for you on our
servers, because that costs us money. No ads, no nagging, and nothing free ever moves behind an
account.**

| What                                                                                                                            | What it costs us          | Who gets it           |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------------- |
| Everything Amber does in the browser, now and later: lists, colors, customizations, locked lists ([0002](0002-locked-lists.md)) | Nothing                   | Everyone, no account  |
| Syncing once with a code                                                                                                        | A mailbox for ten minutes | Everyone, no account  |
| Devices kept in step: changes relayed, encrypted, held about a week until the other device takes them                           | Storage for days          | Free, with an account |
| A permanent copy: kept until deleted, with earlier versions, restorable on a new device                                         | Storage for good          | Paid                  |

How it's built:

- **Encrypted on the device, end to end.** Nothing we hold can be read by us. A list is encrypted
  in the browser, as files, links and sync are already (AES-GCM), with a key the server never
  sees. Encrypted at rest on our side isn't enough: "nobody else can read them" has to stay
  true.
- **Accounts by passkey.** No passwords to store, leak or reset, no email to send, and no third
  party (a "Sign in with" provider) learning who uses Amber. Whether the passkey can also give
  the encryption key (WebAuthn's PRF extension) depends on browser support, to be checked
  before building; otherwise the key comes from a passphrase.
- **No way back in without the key.** If the passphrase and its recovery code are both lost, the
  list we keep can't be opened, by anyone. It's said plainly when an account is made, which is
  the honest cost of our not being able to read it.
- **One encrypted file per person**, not a row per task: the server can't read the list anyway,
  so splitting it buys nothing and costs reads and writes. Object storage (R2), or a Durable
  Object per person, written only if the version it was read at is still current, so two
  devices can't overwrite each other. Merging stays on the device, as it is now: every field is
  stamped, and nothing is overwritten.
- **Read and written as rarely as possible.** The browser's copy stays the one in use, offline
  as now. Opening Amber asks once whether the kept copy changed (a cheap request) and downloads
  only if it did; changes are sent once they settle, and when the page closes, not one by one.
- **Paying** goes through a merchant of record, so taxes in Indonesia and elsewhere are handled
  for us. Which one is a separate decision.

Before anything is built, check Cloudflare's current free-tier limits for the storage chosen
and work out how many people they carry.

## Consequences

- When accounts ship, the footer, PRODUCT.md and AGENTS.md change with them, honestly: "No
  account" becomes "No account needed", and the new connection (to Amber's own server, the
  same origin) is described. Not before.
- Itrium's brief says "no hidden upsell". This decision is an upsell that isn't hidden, held to
  the rule above; the brief itself is Itrium's to reword, outside this repository.
- Every free feature is free for good: a later need for money can't be met by gating something
  that exists.
- A person who loses both their passphrase and recovery code loses the kept copy. Their own
  devices still have the list.
- Accounts add things to look after: passkey sign-in, a recovery flow, account deletion that
  deletes everything we hold, and a privacy policy that says exactly what that is.
