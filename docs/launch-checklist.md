# Launch Checklist

Based on PRD §17.1 and the approval gates in §19.1. ✅ done · ⏳ waiting on someone · ⬜ not started.

## Gate A: Content (family)

| Item                                                                                                 | Status | Owner                        |
| ---------------------------------------------------------------------------------------------------- | ------ | ---------------------------- |
| Brand name, tagline, primary CTA approved                                                            | ⏳     | Family                       |
| Hero portrait: identity, rights and final crop confirmed (currently approved for the test site only) | ⏳     | Family                       |
| Biography, dates and captions (only brief copy is used today; no invented facts)                     | ⏳     | Family                       |
| Homepage concept headlines ("A Life of Grace…", "A Legacy That Continues…") approved                 | ⏳     | Family                       |
| Purpose section wording approved (section is built but switched off)                                 | ⏳     | Family + counsel + processor |
| Gallery photos chosen and approved                                                                   | ⏳     | Family                       |

## Gate B: Legal

| Item                                                                                      | Status | Owner           |
| ----------------------------------------------------------------------------------------- | ------ | --------------- |
| Legal recipient, entity type, jurisdiction, fund classification                           | ⏳     | Counsel         |
| Tax wording (no tax-deductibility claims until proven)                                    | ⏳     | Counsel         |
| Privacy Policy, Terms of Use, Payment Information final text (pages are marked draft)     | ⏳     | Counsel         |
| Refund policy                                                                             | ⏳     | Owner + counsel |
| Payment disclosures entered in Site settings (payments can't be switched on without them) | ⏳     | Legal approver  |

## Gate C: Payment processor

| Item                                                                                                                     | Status | Owner                     |
| ------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------- |
| Stripe account belongs to the approved legal payee (the current test account is UAE-registered; the PRD says a US payee) | ⏳     | Owner                     |
| Stripe confirms in writing that this activity, USD and GBP, and the payment methods are supported                        | ⏳     | Owner                     |
| Payout bank account(s) verified; GBP settlement approach chosen                                                          | ⏳     | Finance                   |
| Live keys added to Vercel; `STRIPE_ALLOW_LIVE=true` set only after this gate                                             | ⬜     | Owner                     |
| Live webhook endpoint created; its signing secret in `STRIPE_WEBHOOK_SECRET`                                             | ⬜     | Owner (or Claude via API) |

## Gate D: Production

| Item                                                                      | Status | Notes                                                                                                      |
| ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| USD and GBP test-mode suite passing                                       | ✅     | Automated: success, settlement and FX, duplicate/out-of-order events, forged signatures, refunds, declines |
| One manual card payment in the browser on the live test site (card 4242…) | ⏳     | Not possible inside the build sandbox; please do this once                                                 |
| Small live transactions made and reconciled with the finance export       | ⬜     | After Gate C                                                                                               |
| Two super admins exist (needed to switch payments on)                     | ⏳     | Owner                                                                                                      |
| MFA enforced, least-privilege roles, audit log                            | ✅     |                                                                                                            |
| Backups and restore drill                                                 | ✅     | Drill on 23 Nov 2026; see the runbook. Repeat once on Neon.                                                |
| Monitoring                                                                | ⏳     | Point an uptime monitor at `/api/health`; optional log drain or Sentry                                     |
| Email: Resend with a verified sending domain (SPF, DKIM, DMARC)           | ⏳     | Needed for receipts, donor sign-in, confirmations                                                          |
| Verified support email and notification recipients in Site settings       | ⏳     | Owner                                                                                                      |
| Photo storage (Vercel Blob) if uploads are wanted                         | ⏳     | Owner decided to skip for now                                                                              |
| Custom domain and SSL                                                     | ⏳     | Owner; then update `NEXT_PUBLIC_SERVER_URL` and the Stripe webhook URL                                     |
| Rotate the Neon password (it was shared in chat)                          | ⏳     | Owner (runbook → Rotate secrets)                                                                           |
| Cloudflare Turnstile keys (recommended before opening forms)              | ⏳     | Owner                                                                                                      |
| Moderators named and a review time agreed before opening submissions      | ⏳     | Owner                                                                                                      |

## Quality (M6)

| Item                                                                                   | Status | Result                                                                                                        |
| -------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Security headers (CSP, frame blocking, nosniff, referrer, permissions, HSTS on Vercel) | ✅     | Stripe checkout verified under the policy                                                                     |
| Secrets scan of git history                                                            | ✅     | Clean                                                                                                         |
| Dependency audit                                                                       | ✅     | 7 low/moderate, all inside Payload tooling; see the runbook                                                   |
| Accessibility                                                                          | ✅     | axe: 0 violations on every public page (desktop and mobile); Lighthouse accessibility 100                     |
| Performance (Lighthouse, simulated mobile, local server)                               | ✅     | Home 92, Honor 94, Legacy 91; CLS 0. Re-check on the live CDN.                                                |
| SEO and best practices                                                                 | ✅     | 100 / 100; `robots.txt` and sitemap exclude private pages                                                     |
| Cross-browser                                                                          | ⏳     | Automated tests run in Chromium (desktop + Pixel 7). Please also check Safari on iPhone and Firefox manually. |
