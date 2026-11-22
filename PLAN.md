# Comfort Kwaw Memorial Fund — Implementation Plan

Source: _Comfort_Kwaw_Memorial_Fund_PRD_v1.docx_ (v1.0, 22 Nov 2026). The repository is empty, so this is a greenfield build.

## 1. What we're building (one paragraph)

A memorial-first website for Comfort Kwaw with a deep-purple, cinematic look. It has a 9-section homepage, a biography page, a moderated memories and photo gallery, and a branded checkout for USD and GBP payments that the server validates and confirms through webhooks. Behind it sits an admin console with MFA and role-based access for content, moderation, finance and reporting. Legal, family and payment-processor approvals (Gates A–D) block any real payment or unapproved content from going live, so **feature flags and content approval status are first-class parts of the system**, not an afterthought.

## 2. Stack (approved by the owner, 22 Nov 2026)

| Concern     | Choice                                                                                                             | Why                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Web app     | **Next.js (App Router) + TypeScript**                                                                              | SSR/ISR for fast public pages, server actions/route handlers for payments & forms, one codebase                                            |
| Styling     | **Tailwind CSS** with PRD §6.3 tokens as CSS variables                                                             | Fast to match the concept; tokens stay editable                                                                                            |
| CMS + admin | **Payload CMS 3** (runs inside the Next.js app)                                                                    | Built-in drafts, version history, field-level access control, media, and an admin UI. That covers most of PRD §12                          |
| Admin MFA   | TOTP 2FA (Payload plugin or custom auth strategy)                                                                  | PRD §4.1: MFA is mandatory                                                                                                                 |
| Database    | **PostgreSQL** (Neon / Supabase / RDS)                                                                             | Ledger integrity, transactions, unique constraints for idempotency                                                                         |
| Payments    | **Stripe** (Payment Element on our own page, PaymentIntents)                                                       | Branded checkout, USD/GBP, 3DS/SCA, refunds and disputes through the API, signed webhooks. The PRD's reference links already assume Stripe |
| Media       | S3-compatible storage (S3 / R2): a **private** bucket for pending uploads and a public CDN path for approved files | PRD §11, §14.2                                                                                                                             |
| Email       | Postmark or Resend (SPF/DKIM/DMARC)                                                                                | Transactional receipts                                                                                                                     |
| Anti-abuse  | Cloudflare Turnstile + rate limiting (Upstash/Redis)                                                               | PRD §15.1                                                                                                                                  |
| Monitoring  | Sentry + uptime check; nightly DB backups with a restore drill                                                     | PRD §15.4, launch checklist                                                                                                                |
| Hosting     | Vercel (app) + managed Postgres                                                                                    | Simple and supports preview deploys                                                                                                        |
| Tests       | Vitest (unit), Playwright (e2e + axe accessibility), Stripe CLI for webhook tests                                  | PRD §16                                                                                                                                    |

## 3. Guardrails that shape the code

1. **Launch flags**, stored in the DB and editable only by a super-admin, with changes audited: `payments_enabled`, `payments_live_mode`, `recurring_enabled` (off), `gbp_enabled`, `mission_copy_approved`, `memory_submissions_enabled`, `photo_submissions_enabled`, `newsletter_enabled`. Each public feature checks its flag and falls back to a safe state (for example, Honor shows "coming soon" and the Purpose section is hidden).
2. **Content approval status.** Biography facts, images, captions and legal/payment disclosure copy each carry `approved_by` / `approved_at`. Pages render only approved content. Disclosure edits need a designated approver.
3. **No fabricated data.** The concept images contain fake testimonials, a placeholder email, AI-generated portraits and "Donation Terms". None of these ship. Empty states come from the PRD copy. AI concept images are used only in dev seed data and are watermarked "CONCEPT".
4. **Money:** integer minor units plus an ISO currency on every row. USD and GBP are never summed. Converted totals always carry the FX rate, its source and its date.
5. **Payment truth comes from webhooks only.** A client redirect never marks a payment as paid.

## 4. Data model (PRD §13 → Payload collections / tables)

`users` (role: moderator | editor | finance | super_admin, mfa_enabled) · `pages` / globals for homepage sections, legal pages, footer, nav (drafts + versions) · `media` (approval_status, rights_confirmed, alt, caption, visibility) · `memory_submissions` (status: pending/approved/rejected/hidden/removed, public_consent) · `contact_messages` · `payments` (receipt_ref, stripe_pi_id UNIQUE, amount_minor, currency, status, frequency, donor_email, display_name, anonymous, public_consent, idempotency_key UNIQUE) · `payment_events` (stripe_event_id UNIQUE, type, verified, payload_ref) · `settlements` (gross, fee, net, settlement_currency, fx_rate, payout_ref) · `refunds` · `disputes` · `consent_records` · `audit_log` (append-only) · `settings` (flags, presets, limits, support email) · `pending_approvals` (two-person approval for payout or banking changes).

## 5. Milestones

### M0 — Foundation (≈1 week)

- Scaffold Next.js + TS + Tailwind + Payload + Postgres; ESLint/Prettier; GitHub Actions CI (lint, typecheck, unit tests, Playwright smoke).
- Design tokens (§6.3), fonts (editorial serif such as Cormorant/Playfair plus a sans such as Inter), base components: Button (gold/outline/ghost), SectionHeading with eyebrow, CurvedDivider, GlowPortrait, FloralAccent (decorative, `aria-hidden`).
- Global layout: header with active state, mobile menu, persistent "Honor Comfort Kwaw" CTA; footer (§7.9) with a dynamic year; 404 and error pages.
- `prefers-reduced-motion` handling and focus styles. `.env.example` (no secrets committed).

### M1 — Public site, CMS-driven (≈2 weeks)

- Homepage: all 9 sections in order (§7.1–7.9), using concept image 10 as the layout reference. Hero headline is "Forever Comfort" (image 10 matches the PRD; image 1's "Comfort Kwaw" headline does not).
- Purpose section (§7.4) renders only when `mission_copy_approved` is on.
- Honor teaser (§7.5): USD/GBP toggle and presets that link to `/honor?amount=&currency=`. The server re-validates these values, and the homepage never shows card fields.
- `/legacy`, `/gallery` (curated grid + accessible lightbox with focus trap, Esc, arrow keys, captions), `/memories` (approved list + empty state), `/contact`, `/privacy`, `/terms`, `/payment-information`, `/accessibility`.
- All copy lives in the CMS, seeded with the PRD's verbatim strings.

### M2 — Admin, roles, moderation (≈1.5 weeks)

- Payload access control per role (§4), TOTP MFA enforced for every admin, audit-log hook on every privileged write.
- Draft → review → publish workflow. Legal and disclosure fields can be published only by an approver.
- Moderation queue: Approve / Reject / Hide message, Approve / Remove photo, each with reason, actor and timestamp. Approval is blocked without `public_consent`.
- Settings screen: flags, presets, min/max limits, support email, webhook health (no secrets shown). Two-person approval for payout and banking changes.

### M3 — Visitor submissions (≈1 week)

- Memory form (§11.1) and photo upload: MIME/size checks, private bucket, malware scan hook. Contact form (§8.3).
- Turnstile, rate limiting, CSRF, length limits; accessible inline errors.
- Emails: memory received, contact received, and a staff notification sent to the verified inbox.

### M4 — Payments (≈2–2.5 weeks)

- `/honor` (§8.2): currency selector, presets, custom amount, private-by-default display, a public-display opt-in left unchecked by default, email for the receipt, and an optional note.
- Server flow (§9.3): validate amount, currency and flags → create a PaymentIntent with an idempotency key → review step showing recipient, classification, total, fees, refund and tax status → Payment Element (3DS).
- `/api/stripe/webhook`: signature verification, `payment_events` dedupe on the event id, state machine (pending, succeeded, failed, canceled, refunded, partially refunded, disputed), settlement and fee capture from the balance transaction.
- `/honor/confirmation` showing all four states (§10.1), driven by server status polling. Receipt page and PDF download (§10.2) with the "not a tax receipt" footer.
- Refunds from admin (finance role) and dispute visibility. Receipt and refund emails (§10.3).
- All copy from §9.6 (declined, duplicate, expired, unavailable currency, FX note).
- Monthly honoring is built behind `recurring_enabled=false`, or deferred entirely. **Decision needed.**

### M5 — Dashboard & reporting (≈1 week)

- Metrics (§12.2): USD gross and GBP gross shown separately, fees, net settled, refunds, success/pending/failed counts, and a USD-equivalent total with the FX source shown.
- Payments table with filters (§12.3) and transaction detail. CSV/XLSX export with per-currency columns and conversion metadata.

### M6 — Hardening & launch (≈1.5 weeks)

- Playwright e2e for every scenario in PRD §16, including webhook replay and duplicate tests, invalid amounts, and moderation consent rules. axe checks for WCAG 2.2 AA.
- Cross-browser and device pass (§16.5), Lighthouse/CWV budget, image pipeline (AVIF/WebP, responsive sizes, lazy loading).
- Security: headers/CSP, dependency scanning, secret scan, backup and restore drill, Sentry alerts.
- Launch checklist (§17.1). Live mode stays off until Gates A–D are recorded in the admin.

**Total: roughly 10–11 weeks for one full-stack developer.** M1 and M2 can run in parallel with two people.

## 6. External blockers (client-owned — PRD §19)

Nothing below blocks the build. All of it blocks launch.

- Gate A: family-approved portrait (with rights), biography, dates, captions, gallery photos, and mission wording.
- Gate B: legal recipient, entity type, fund classification, tax wording, refund policy, privacy and terms.
- Gate C: Stripe underwriting approval for this activity, currencies, methods, GBP settlement choice.
- Domain, verified support email, official social links, admin and moderator nominees, custom amount min/max.

## 7. Decisions I need from you

1. ~~Stack~~: proposed stack accepted.
2. Monthly honoring: **open**. The recommendation is to defer it, but design the payment model so it can be added later.
3. ~~Portrait~~: use the client-supplied portrait on test/staging. Family sign-off is still needed for production.
4. ~~Start M0~~: done (see status below).

## 8. Status

- **M0: done.** Next.js 16 + Tailwind 4 scaffold, brand tokens, fonts, UI primitives, header with mobile menu and footer, hero section, 404 and error pages, money helpers with unit tests, Playwright smoke and axe tests, CI workflow. Payload/Postgres setup moved to the start of M2, where the CMS is first needed; M1 reads copy from `src/content/`.
