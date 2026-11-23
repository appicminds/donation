# PRD Addendum A1: Donor Accounts

**Status:** Approved by the project owner on 23 Nov 2026 for build. It extends PRD v1.0 §4 (Contributor role), §8.2, §10 and §15.2.

## A1.1 Purpose

Contributors can return to the site at any time to see every payment they have made in honor of Comfort, re-download receipts, and change whether their name may be shown publicly. They don't need to keep old emails or links.

## A1.2 Principles

- **No passwords.** Contributors sign in with a single-use link sent to the email address they used for their receipt. The email address is the account.
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
