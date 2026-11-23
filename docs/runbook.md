# Operations Runbook

How to run, monitor, back up and recover the Comfort Kwaw Memorial Fund site.

## Where things live

| Piece    | Where                                                                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App      | Vercel project `donation`. Production deploys from the configured production branch.                                                                                                         |
| Database | Neon Postgres (Vercel Storage integration), `DATABASE_URL` / `DATABASE_URL_UNPOOLED`                                                                                                         |
| Payments | Stripe: test mode until Gate D. Webhook endpoint `/api/stripe/webhook`                                                                                                                       |
| Email    | Resend (`RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`), not yet connected                                                                                                                           |
| Photos   | Private Vercel Blob store `donation-blob` (`BLOB_READ_WRITE_TOKEN`). Files are served only via `/api/media/file/…`, which applies the Media access rules (visitors see approved images only) |
| Admin    | `/admin`. Every account needs an authenticator app (TOTP)                                                                                                                                    |

## Health and monitoring

- **Uptime:** point an uptime monitor (Vercel Monitoring, Better Stack, UptimeRobot…) at `GET /api/health`. It returns `200 {"ok":true,"database":"up"}`, or `503` when the database is down.
- **Errors:** server errors are written as one JSON line each (`"level":"error","source":"next"`) to Vercel's runtime logs, with query strings removed. To forward them, add a Vercel log drain or Sentry; that's a single file, `src/instrumentation.ts`.
- **Payments:** Stripe → Developers → Webhooks shows delivery success. Failed deliveries are retried by Stripe for 3 days, and our handler is idempotent. In the admin, _Finance → Payment events_ shows what the ledger received.

## Deploys and database changes

- Every push to the production branch deploys automatically.
- Schema changes go through committed migrations only (`npm run migrate:create <name>`). They are applied automatically when the app starts in production.
- **Rollback:** in Vercel, open the previous deployment and click _Promote to Production_. Migrations only add columns or tables, so an older build keeps working on the newer schema.

## Backups and restore

**Automatic (Neon):** Neon keeps point-in-time history (the free plan keeps a short window; paid plans keep longer). To recover, open Neon → Branches → _Restore_ to a time before the incident, or create a branch at that time and point `DATABASE_URL` at it.

**Manual logical backup (monthly, and before any risky change):**

```bash
DATABASE_URL_UNPOOLED='postgres://…' ./scripts/db-backup.sh backups
```

Store the `.dump` file somewhere private and encrypted. Never commit it: `/backups` is git-ignored.

**Restore drill (last done 23 Nov 2026 on a local copy: all tables and row counts matched, migrations recognised, app healthy):**

```bash
createdb restore_drill
TARGET_DATABASE_URL='postgres://…/restore_drill' ./scripts/db-restore.sh backups/comfort-kwaw-<time>.dump
```

The restore script refuses to write into a database that isn't empty.

## Incident playbooks

**Stop taking payments immediately:** Admin → _Site settings_ → untick _Payments enabled_. Switching off needs no second approver and takes effect on the next request.

**Suspected compromised admin account:**

1. Another super admin removes that account's roles (or deletes the account) under _Users_.
2. Review the _Audit log_, filtered by that actor.
3. Rotate `PAYLOAD_SECRET` in Vercel and redeploy. This signs everyone out and invalidates donor sessions.

**Rotate secrets** (also after any secret has been pasted into chat, email or a ticket):

| Secret                  | How                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Neon database password  | Neon → Roles → Reset password. The Vercel integration updates the variables; then redeploy.  |
| `STRIPE_SECRET_KEY`     | Stripe → Developers → API keys → Roll key; update in Vercel; redeploy                        |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint → Roll secret; update in Vercel; redeploy                       |
| `PAYLOAD_SECRET`        | Generate a new one (`openssl rand -hex 32`); update in Vercel; redeploy (signs everyone out) |

**Webhook failures:** fix the cause, then use Stripe → Webhooks → _Resend_ on the failed events. Duplicates are ignored safely.

## Security notes

- **Headers:** a Content Security Policy limits scripts, frames and connections to this site, Stripe and Cloudflare Turnstile. Framing is blocked, and HSTS is on (on Vercel). Inline scripts are allowed because pages are statically generated (see `next.config.ts`).
- **Personal pages:** account, confirmation and receipt pages are `private, no-store` and excluded from search engines (`robots.txt`).
- **Authenticator secrets** are stored in the database like any authentication data. Database access is limited to the Neon project owners.
- **Dependency advisories** (as of 23 Nov 2026), all moderate or low, inside Payload's own dependencies:
  - esbuild, via the migration generator `drizzle-kit`: affects a dev server that never runs in production
  - dompurify, via the admin's Monaco code editor: not used by this site

  Re-check with `npm audit --omit=dev` when upgrading Payload.
