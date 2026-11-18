# 0003. Accounts: passkeys to sign in, PRF or a passphrase for the key

Status: superseded by [0004](0004-amber-stays-free.md)

## Context

[0001](0001-free-accounts-and-paid-storage.md) decided that accounts use passkeys and that
everything we keep is encrypted on the device, and left two things open: whether the passkey can
also give the encryption key (the WebAuthn PRF extension), and how accounts are stored.

Checked in November 2026: PRF works with platform passkeys in current Chrome, Safari 18.4 and
later, on Android, and with Windows Hello on recent Windows 11 builds, but not with every
passkey or browser. One of the WebAuthn specification's editors warns against encrypting data
with PRF alone: lose the passkey, and the data goes with it.

A person's encrypted list sits on our server, so anyone who could fetch its key wrapped by a
passphrase could guess the passphrase offline. Signing in has to stand in front of that, and be
stronger than knowing an account's identifier.

## Decision

- **Passkeys sign in**, checked on the server with SimpleWebAuthn (`@simplewebauthn/server` and
  `@simplewebauthn/browser`), rather than WebAuthn verification of our own. No email, no
  username, no password.
- **The key comes from the passkey's PRF where it works, and from a passphrase where it
  doesn't. A recovery code always wraps it too**, and also proves the account when every passkey
  is lost.
- **Signed-in devices hold their own key**: a P-256 key pair the browser won't export, whose
  public half is registered with the account. Requests are signed with it. No cookie, no token
  to steal.
- **A Durable Object per account**, with SQLite, in the Worker that runs sync. On the free plan
  a limit reached fails until the next day instead of billing.
- **Paying is tied to an account by a billing reference** only our server can match, through
  the merchant's hosted checkout and a signed webhook. The merchant has the email; we don't.

The design is in [`docs/accounts.md`](../accounts.md).

## Consequences

- Two new dependencies, agreed with the owner, kept up to date like the others.
- Two ways to unwrap the key on a new device, both tested: a passkey with PRF, and a passphrase.
- Without email there is no "forgot password" link. The recovery code is the only way back when
  every passkey is lost, and Amber says so before an account is made.
- Removing a lost device stops it at once; changing the account key keeps it from following
  later changes.
- The free tier carries about 5,000 people a day; past that, a paid Cloudflare plan or limits
  per account.
