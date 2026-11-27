# Deploying on your own server with Coolify

The site runs on any Ubuntu server with Coolify. Coolify builds the repository's `Dockerfile` from the `main` branch and serves it with an automatic HTTPS certificate. The database (Neon), photo storage (Vercel Blob), Stripe and Resend stay where they are, so nothing moves and there's no data migration.

You need:

- Coolify open in your browser (usually `http://YOUR_SERVER_IP:8000` the first time).
- Your server's public IP address (Hostinger → VPS → Overview).
- Access to the domain's DNS (Squarespace → Domains).
- The Vercel project's environment variables (Vercel → donation → Settings → Environment Variables), to copy across.

In the steps below, `memorial.example.com` stands for the address you choose. It can be a subdomain or the main domain.

## 1. Point the domain at the server (Squarespace)

1. Squarespace → **Domains** → your domain → **DNS** (or **DNS Settings**).
2. Under **Custom records**, add:
   - **Type** `A`, **Host** `memorial` (or `@` for the main domain), **Data** = your server IP.
3. Save. It usually works within minutes, but can take up to an hour. To check, open `http://memorial.example.com`: once DNS is working, it shows Coolify's "no available server" page instead of "site can't be reached".

## 2. Connect GitHub to Coolify

1. Coolify → **Sources** → **+ Add** → **GitHub App**.
2. Name it (e.g. `appicminds`) and follow the prompts to create and install the app on GitHub.
3. When GitHub asks which repositories to give it, choose **Only select repositories** → **appicminds/donation**.

## 3. Create the application

1. Coolify → **Projects** → **+ Add** → name it `Comfort Kwaw Memorial Fund` → open its **production** environment.
2. **+ New** → **Private Repository (with GitHub App)** → pick the app from step 2 → repository **appicminds/donation** → branch **main**.
3. **Build Pack**: choose **Dockerfile**. Leave the Dockerfile location as `/Dockerfile`.
4. **Ports Exposes**: `3000`.
5. Click **Continue**.

## 4. Set the domain

On the application's **General** tab:

1. **Domains**: `https://memorial.example.com`. Use `https://` so Coolify requests a certificate.
2. Save.

## 5. Add the environment variables

Application → **Environment Variables** → switch to **Developer view**, paste the block below, fill in the values, and save. Values marked sensitive in Vercel can't be read back there, so the right-hand column says where to get each one.

```
NEXT_PUBLIC_SERVER_URL=https://memorial.example.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
BOOTSTRAP_ADMIN_EMAIL=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS=noreply@...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

| Variable                             | Where to get it                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SERVER_URL`             | Your new address, with `https://` and no trailing slash.                                                                                                                              |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys (test mode) → Publishable key.                                                                                                                         |
| `DATABASE_URL`                       | Neon console → your project → **Connect** → the connection string (pooled). The same database Vercel uses.                                                                            |
| `PAYLOAD_SECRET`                     | A **new** random value: Coolify can generate one, or run `openssl rand -hex 32`. Everyone (admins and donors) simply signs in again on the new address; nothing stored depends on it. |
| `BOOTSTRAP_ADMIN_EMAIL`              | The super admin email (only used if the database were ever empty).                                                                                                                    |
| `STRIPE_SECRET_KEY`                  | Stripe → Developers → API keys (test mode) → Secret key → Reveal.                                                                                                                     |
| `STRIPE_WEBHOOK_SECRET`              | A **new** one, from step 7. Use a placeholder like `whsec_pending` for the first deploy.                                                                                              |
| `RESEND_API_KEY`                     | Resend → API Keys → create a **new** key for the server (keys can't be shown again).                                                                                                  |
| `EMAIL_FROM_ADDRESS`                 | The verified sender you set up, e.g. `noreply@appicminds.com`.                                                                                                                        |
| `BLOB_READ_WRITE_TOKEN`              | Vercel → **Storage** → `donation-blob` → the `.env.local` / Quickstart tab shows `BLOB_READ_WRITE_TOKEN`.                                                                             |

Then:

- Tick **Is Build Variable?** for the two `NEXT_PUBLIC_...` lines. They are built into the pages, so they must be present when the image is built.
- Leave **Is Build Variable?** off for everything else. Those settings are only needed while the site runs.
- Don't add `VERCEL` or any other `VERCEL_...` variable.

Optional, when you have them: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (a build variable) and `TURNSTILE_SECRET_KEY`.

## 6. Deploy

1. Click **Deploy**. The first build takes about 5–8 minutes; **Logs** shows progress.
2. When it finishes, open `https://memorial.example.com/api/health`. It should say `{"ok":true,"database":"up",...}`.
3. Database updates (migrations) run automatically when the app starts.

## 7. Point Stripe at the new address

1. Stripe Dashboard (test mode) → **Developers** → **Webhooks** → **+ Add endpoint**.
2. **URL**: `https://memorial.example.com/api/stripe/webhook`.
3. **Events**: choose the same events as the existing Vercel endpoint (open it to see the list).
4. Create it, click **Reveal** under _Signing secret_, and copy the `whsec_...` value into Coolify's `STRIPE_WEBHOOK_SECRET`.
5. In Coolify, click **Redeploy** so the new secret takes effect.

## 8. Test

On the new address:

1. **Payment:** on `/honor`, pay with card `4242 4242 4242 4242`. The confirmation page should show _Thank You_ and _Your donor account is ready_. The receipt email should arrive.
2. **Donor sign-in:** on `/account`, enter the same email, and a sign-in code email should arrive.
3. **Admin:** go to `/admin`, sign in with your authenticator, and check that Images, Payments and Site settings all open.

## 9. Switch over

When everything works on the new address:

1. Use the new address everywhere: share links, the Stripe live webhook later, the uptime monitor and so on.
2. Keep Vercel for a few days as a fallback, then remove its Stripe webhook endpoint and delete or pause the Vercel project.

## Automatic deploys

Every merge into `main` redeploys automatically through the GitHub App. To turn that off, untick **Auto Deploy** under the application's **Advanced** settings.

## Troubleshooting

- **Build fails at `npm ci`:** the server can't reach the npm registry. Check the server's internet and DNS.
- **`/api/health` shows `database: down`:** check `DATABASE_URL`, and that Neon allows connections from anywhere (the default).
- **Card payments stay "processing":** the Stripe webhook secret doesn't match, or the endpoint URL is wrong (step 7).
- **No certificate (browser warning):** DNS isn't pointing at the server yet (step 1), or the domain in step 4 was entered without `https://`.
