# 0004. Amber stays free: no accounts, no paid tier

Status: accepted

Supersedes [0001](0001-free-accounts-and-paid-storage.md) and
[0003](0003-accounts-passkeys-and-keys.md).

## Context

0001 planned three tiers: everything in the browser free with no account, devices kept in step
for free with an account, and a permanent copy for a fee. 0003 designed the accounts: passkeys,
keys from PRF or a passphrase, a Durable Object per account, and payment through a merchant.
None of it was built.

Without payment, an account would exist only to relay a list between a person's own devices.
That would mean passkeys, two new dependencies, recovery flows, a privacy policy, an outside
security review, and a server that holds people's lists, all for one feature, and the end of
the footer's plainest promise: "No account."

## Decision

**Amber is a free tool, and stays one: no accounts, no paid tier, no relay.** Everything it does
happens in the browser, for everyone. The only server it talks to is sync's mailbox, which a
person starts with a code, holds an encrypted list for at most ten minutes, and keeps nothing.

Keeping devices in step stays a thing a person does when they want to: syncing once with a code,
or moving the list with a file or a link.

## Consequences

- The footer, README and PRODUCT.md keep "No account" as it is.
- No server holds anyone's list for longer than a sync takes, so there's nothing of theirs for
  us to lose, leak, or delete on request.
- Locked lists ([0002](0002-locked-lists.md)) stay as they are: free, and with no server. Its
  mention of a paid copy carrying them no longer applies.
- `docs/accounts.md` is removed; its design stays in the history, at commit `506e322`
  (#40).
- A new device starts with a list only when another device syncs it, or a file or link brings
  it. Losing every device and every backup loses the list, as it always has, and Amber keeps
  reminding people to download a copy.
