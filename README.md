# Comfort Kwaw Memorial Fund

Memorial website for Comfort Kwaw: _Forever Comfort — An Eternal Legacy_.
Product requirements: `Comfort_Kwaw_Memorial_Fund_PRD_v1.docx`. Build plan and milestones: [`PLAN.md`](./PLAN.md).

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Payload CMS 3 + PostgreSQL · payload-totp (admin MFA) · Vitest · Playwright + axe.
Planned: Stripe (M4).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in PAYLOAD_SECRET and BOOTSTRAP_ADMIN_EMAIL
npm run migrate              # create the database schema
npm run seed                 # optional: add the client portrait to the media library
npm run dev                  # site: http://localhost:3000  ·  admin: /admin
```

Without `DATABASE_URL` and `PAYLOAD_SECRET`, the public site still runs on the static copy in `src/content/`, and only `/admin` is unavailable.

## Admin (Payload CMS)

- **First admin:** open `/admin` and create the account with the exact `BOOTSTRAP_ADMIN_EMAIL`. Any other address is refused. That account becomes super admin.
- **MFA is mandatory:** every account must set up an authenticator app (TOTP) before it can see or change anything.
- **Roles:** super admin, publisher, editor, legal approver, moderator, finance, support. Only super admins assign roles.
- **Moderation:** messages are Pending by default. A message can only be approved if the visitor consented to public display. Visitors' words can't be edited.
- **Content:** homepage and Legacy page copy have drafts and version history. Editors save drafts; publishers publish.
- **Images:** an image goes public only when it is approved, with rights confirmed and alt text.
- **Launch flags** are in Site settings. Switching payments on needs two different super admins.
- **Audit log:** an append-only record of logins and every change, visible to super admins.

## Visitor forms (memories, photos, contact)

Each form opens with its switch in **Site settings** (memory submissions, photo submissions, contact form).

- **Moderation:** submissions are saved as Pending and never appear publicly until a moderator approves them. Approval also needs the visitor's public-display consent.
- **Photos:** files are decoded, resized and re-encoded to JPEG on the server, which strips all metadata (including GPS location). Files that aren't real images are rejected. Photos are private until approved.
- **Anti-abuse:** a hidden honeypot field, a signed timer that rejects instant submissions, a limit of 5 per hour per visitor (IP addresses are stored only as salted hashes), and Cloudflare Turnstile when its keys are set.
- **Email:** visitors get a confirmation if they gave an address. Staff in _Site settings → notification recipients_ (and the support email) get a link to the review queue, never the visitor's details. Without `RESEND_API_KEY`, emails are written to the server log.

### Schema changes

The database schema only changes through committed migrations:

```bash
npm run migrate:create <name>   # after changing a collection or global
npm run migrate                 # apply locally (production applies them on start)
```

## Deploying to Vercel

Set these in Vercel → Project → Settings → Environment Variables (or via the Storage integrations):

| Variable                | Source                                               |
| ----------------------- | ---------------------------------------------------- |
| `DATABASE_URL`          | Vercel Storage → Neon Postgres (added automatically) |
| `PAYLOAD_SECRET`        | `openssl rand -hex 32`                               |
| `BOOTSTRAP_ADMIN_EMAIL` | The first admin's email                              |
| `BLOB_READ_WRITE_TOKEN` | Vercel Storage → Blob (added automatically)          |

Migrations run automatically when the app starts in production.

## Scripts

| Command                           | What it does                                                       |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                     | Start the dev server                                               |
| `npm run build` / `npm start`     | Production build / serve                                           |
| `npm run lint`                    | ESLint                                                             |
| `npm run typecheck`               | Generate route types and run `tsc`                                 |
| `npm run format` / `format:check` | Prettier                                                           |
| `npm test`                        | Unit tests (Vitest)                                                |
| `npm run test:e2e`                | Playwright smoke + accessibility tests (run `npm run build` first) |

## Project layout

```
src/app/(site)/     public routes and layout
src/app/(payload)/  Payload admin (/admin) and REST API (/api)
src/payload/        collections, globals, roles, business rules, audit log
src/migrations/     committed database migrations
src/lib/cms.ts      cached CMS reads with static fallback
src/components/ui/  design-system primitives (Button, SectionHeading, GlowPortrait…)
src/components/layout/  header, footer, brand mark
src/components/home/    homepage sections
src/content/        default copy and flags (fallback when no database)
src/lib/            utilities, e.g. money helpers (minor units, no mixed currencies)
e2e/                Playwright tests
```

## Content rules (from the PRD)

- Do not invent biography facts, dates, testimonials, totals or donor counts.
- Publish only a **verified** support email and verified social links. `src/content/site.ts` keeps these `null` until confirmed.
- The hero portrait was supplied by the client and is approved for **test/staging only**. Family sign-off (Gate A) is required before production.
- Payments stay disabled until legal and processor approvals are recorded (Gates B–D).
