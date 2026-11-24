# PRD Addendum A1: Donor Accounts

**Status:** Approved by the project owner on 23 Nov 2026 for build; revised 24 Nov 2026 (A1.6: sign-in codes, optional password, account on payment). It extends PRD v1.0 §4 (Contributor role), §8.2, §10 and §15.2.

## A1.1 Purpose

Contributors can return to the site at any time to see every payment they have made in honor of Comfort, re-download receipts, and change whether their name may be shown publicly. They don't need to keep old emails or links.

## A1.2 Principles

- **Email first, password optional.** Contributors sign in with a one-time code (or link) sent to the email address they used for their receipt. The email address is the account. A password can be added for faster sign-in but is never required (A1.6).
- **No new personal data.** The account shows only what the contributor already gave at checkout.
- **Private by default.** Nothing about a contributor's account, amounts or history is ever public.
- **No donor social features.** Public leaderboards and donor networks stay out of scope (PRD §3.2).

## A1.3 Requirements

| #     | Requirement                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1-1  | A "Donor account" page (`/account`) where a contributor enters their email to receive a sign-in link.                                                                                                         |
| A1-2  | The response is always the same ("If an account exists for that address, we've sent a link"), so nobody can learn whether an email has given.                                                                 |
| A1-3  | Sign-in links are single-use and expire after 20 minutes. Only a hash of the token is stored.                                                                                                                 |
| A1-4  | Rate limits: at most 3 link requests per hour per email address and 5 per hour per visitor connection. Bot protection matches the other forms (honeypot, timer, optional Turnstile).                          |
| A1-5  | A signed, HttpOnly, SameSite session cookie lasts at most 12 hours, with a visible "Sign out".                                                                                                                |
| A1-6  | The account lists the contributor's payments (date, amount, currency, status, receipt reference), newest first, with links to each receipt and status page. Pending and failed attempts are labelled clearly. |
| A1-7  | The contributor can turn public display of their name on or off for all their payments. The change is recorded with its time (consent record, PRD §13).                                                       |
| A1-8  | Help links: contact for payment questions, and how to request data deletion. Payment records are kept for accounting as the privacy policy describes.                                                         |
| A1-9  | Receipt and refund emails include a secure link to the receipt or status page, and a pointer to the donor account.                                                                                            |
| A1-10 | Sign-in attempts and consent changes appear in the audit log (actor: the contributor's email).                                                                                                                |
| A1-11 | Recurring-gift management (PRD §9.5) is added here only if monthly honoring is ever enabled, for example through Stripe's customer portal.                                                                    |

## A1.4 Acceptance criteria

- Requesting a link for any email shows the same message, and an unknown email receives no email.
- A sign-in link works once; a used or expired link shows "This link has expired" with a way to request a new one.
- A signed-in contributor sees only payments made with their own email (matched case-insensitively), never anyone else's.
- A tampered or expired session cookie is treated as signed out.
- Turning name display off immediately removes public consent from all of that contributor's payments.
- All pages meet the accessibility standard used for the rest of the site (WCAG 2.2 AA target).

## A1.5 Dependencies

The sign-in email needs a configured email provider (Resend, with a verified sending domain) before donor accounts can be used on the live site. Until then the page explains that sign-in isn't available yet.

## A1.6 Revision (24 Nov 2026): codes, optional password, account on payment

Decided with the project owner: passwords are optional; the link in the receipt email opens sign-in with a code rather than signing in directly.

| #     | Requirement                                                                                                                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1-12 | A donor account is created automatically when a payment succeeds (one per receipt email). The confirmation page says the account is ready and how to sign in.                                                                                                                                                                |
| A1-13 | The receipt email includes a "Sign in to your donor account" button. It opens the sign-in page with the donor's email filled in; the donor confirms with an emailed code. The button never signs anyone in by itself.                                                                                                        |
| A1-14 | Sign-in email contains a 6-digit code and a one-tap link (A1-3). Codes expire after 20 minutes, work once, allow at most 5 wrong attempts, and are stored only as a keyed hash. Requesting a new code replaces the old one.                                                                                                  |
| A1-15 | After signing in, a donor may set, change or remove a password (at least 10 characters, not their email). Passwords are stored with a slow, salted hash (scrypt).                                                                                                                                                            |
| A1-16 | Password sign-in: email plus password. Errors never reveal whether the email has an account or a password. After 5 wrong passwords the account's password sign-in is paused for 15 minutes (code sign-in still works); at most 10 wrong passwords per hour per visitor connection. "Forgot password?" uses the code sign-in. |
| A1-17 | A "Donor login" button appears in the site header and mobile menu on every page.                                                                                                                                                                                                                                             |
| A1-18 | Password set, change and removal, and every sign-in method, are recorded in the audit log.                                                                                                                                                                                                                                   |

**Acceptance criteria (additions)**

- A successful payment creates the donor account; the confirmation page and receipt email point to it.
- A correct code signs the donor in once; a wrong code five times, an old code, or an expired code is refused with a clear message.
- Requesting a code for an unknown email looks identical to a known one and sends nothing.
- A donor without a password can still sign in with a code; a donor with a password can use either.
- Five wrong passwords pause password sign-in for that account for 15 minutes without blocking code sign-in.
