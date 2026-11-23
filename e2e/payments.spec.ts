import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import Stripe from "stripe";

/**
 * Payments end to end against Stripe TEST mode and a real database.
 *
 * The browser drives checkout up to the payment step (real server action, real
 * PaymentIntent). The test then confirms that PaymentIntent with Stripe's test
 * cards, fetches the real events Stripe emitted, and delivers them, signed, to
 * our webhook exactly as Stripe would. That covers the ledger, idempotency,
 * confirmation states, receipts and refunds.
 *
 * Needs DATABASE_URL, STRIPE_SECRET_KEY (test) and STRIPE_WEBHOOK_SECRET, with
 * payments opened by `SEED_OPEN_PAYMENTS=1 npm run seed`.
 */
const { DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;
test.skip(
  !DATABASE_URL || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET,
  "needs database and Stripe test configuration",
);
test.skip(Boolean(STRIPE_SECRET_KEY?.startsWith("sk_live")), "never run against live Stripe");
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop only"));

const stripe = new Stripe(STRIPE_SECRET_KEY ?? "", { httpClient: Stripe.createFetchHttpClient() });
let db: pg.Client;
const startedAt = Math.floor(Date.now() / 1000) - 5;

test.beforeAll(async ({}, info) => {
  // Hooks run even when every test is skipped; only the desktop project touches the database.
  if (info.project.name !== "desktop") return;
  db = new pg.Client({ connectionString: DATABASE_URL });
  await db.connect();
  // Earlier runs' test payments would count towards the per-visitor checkout limit.
  const testPayments = `select id from payments where donor_email like 'e2e-%'`;
  await db.query(`delete from refunds where payment_id in (${testPayments})`);
  await db.query(`delete from payment_events where payment_id in (${testPayments})`);
  await db.query(`delete from payments where donor_email like 'e2e-%'`);
});
test.afterAll(async ({}, info) => {
  if (info.project.name !== "desktop") return;
  await db.query(
    `delete from payment_events where object_id like 'pi_%' and created_at > now() - interval '1 hour' and type like 'e2e%'`,
  );
  await db?.end();
});

type Row = { id: number; receipt_ref: string; access_token: string; stripe_payment_intent_id: string; status: string };

/** Checkout through the real UI up to the payment step; returns the stored payment. */
async function checkout(page: Page, currency: "USD" | "GBP", amount: string): Promise<Row> {
  await page.goto(`/honor?currency=${currency}&amount=${amount}`);
  await page.getByRole("button", { name: "Continue to Secure Payment" }).click();
  await page.getByLabel("Your name").fill("E2E Donor");
  await page.getByLabel("Email for your receipt").fill("e2e-donor@example.test");
  await page.getByRole("button", { name: "Continue to Secure Payment" }).click();
  await expect(page.getByRole("heading", { name: "Review Your Honor" })).toBeVisible({ timeout: 20_000 });
  const ref = (await page.getByText(/^Receipt reference: CK-/).innerText()).replace("Receipt reference: ", "");
  const { rows } = await db.query<Row>(
    `select id, receipt_ref, access_token, stripe_payment_intent_id, status from payments where receipt_ref = $1`,
    [ref],
  );
  expect(rows[0].status).toBe("requires_payment");
  return rows[0];
}

/** Wait for Stripe to emit an event about an object, then return it. */
async function stripeEvent(type: string, objectId: string): Promise<Stripe.Event> {
  for (let i = 0; i < 30; i++) {
    const { data } = await stripe.events.list({ type, created: { gte: startedAt }, limit: 100 });
    const hit = data.find((e) => (e.data.object as { id?: string }).id === objectId);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Stripe did not emit ${type} for ${objectId}`);
}

/** Deliver an event to our webhook, signed like Stripe signs it. */
async function deliver(page: Page, event: Stripe.Event, secret = STRIPE_WEBHOOK_SECRET!) {
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  const res = await page.request.post("/api/stripe/webhook", {
    data: body,
    headers: { "content-type": "application/json", "stripe-signature": signature },
  });
  return { status: res.status(), json: await res.json() };
}

/** Payload stores numbers as Postgres numeric, which pg returns as strings. */
const NUMERIC = ["amount_minor", "refunded_minor", "gross_minor", "fee_minor", "net_minor", "fx_rate"];
const payment = async (id: number) => {
  const row = (await db.query(`select * from payments where id = $1`, [id])).rows[0] as Record<string, unknown>;
  for (const k of NUMERIC) if (row[k] != null) row[k] = Number(row[k]);
  return row;
};

let paid: Row;

test("successful payment: webhook records it once, with settlement figures", async ({ page }) => {
  paid = await checkout(page, "GBP", "50");

  // Before any webhook, the confirmation page shows "processing", never success.
  await page.goto(`/honor/confirmation?ref=${paid.receipt_ref}&t=${paid.access_token}`);
  await expect(page.getByRole("heading", { name: "Your Payment Is Being Processed" })).toBeVisible();

  await stripe.paymentIntents.confirm(paid.stripe_payment_intent_id, {
    payment_method: "pm_card_visa",
    return_url: "http://localhost/honor/confirmation",
  });
  const succeeded = await stripeEvent("payment_intent.succeeded", paid.stripe_payment_intent_id);

  const first = await deliver(page, succeeded);
  expect(first).toEqual({ status: 200, json: { received: true, outcome: "requires_payment → succeeded" } });

  expect((await payment(paid.id)).status).toBe("succeeded");

  // Fees and FX arrive with the balance transaction, sometimes in a later charge.updated event.
  let p = await payment(paid.id);
  if (p.fee_minor == null) {
    const charge = String(p.stripe_charge_id);
    const updated = await stripeEvent("charge.updated", charge);
    expect((await deliver(page, updated)).json.outcome).toMatch(/^settlement recorded/);
    p = await payment(paid.id);
  }
  expect(p).toMatchObject({ status: "succeeded", amount_minor: 5000, currency: "GBP" });
  expect(Number(p.fee_minor)).toBeGreaterThan(0);
  expect(Number(p.net_minor)).toBe(Number(p.gross_minor) - Number(p.fee_minor));
  expect(p.settlement_currency).toMatch(/^[A-Z]{3}$/);
  if (p.settlement_currency !== "GBP") expect(Number(p.fx_rate)).toBeGreaterThan(0);
  expect(p.receipt_email_sent_at).not.toBeNull();

  // Stripe redelivers the same event: acknowledged, nothing posted twice.
  const again = await deliver(page, succeeded);
  expect(again.json.outcome).toBe("duplicate");
  const { rows } = await db.query(`select count(*)::int as n from payment_events where stripe_event_id = $1`, [
    succeeded.id,
  ]);
  expect(rows[0].n).toBe(1);
});

test("the confirmation page updates on its own and shows the receipt summary", async ({ page }) => {
  await page.goto(`/honor/confirmation?ref=${paid.receipt_ref}&t=${paid.access_token}`);
  await expect(page.getByRole("heading", { name: "Thank You for Honoring Comfort" })).toBeVisible();
  const summary = page.getByRole("main");
  await expect(summary).toContainText(paid.receipt_ref);
  await expect(summary).toContainText("£50");
  await expect(summary).toContainText("Successful");
  await expect(summary).toContainText("Anonymous");

  await page.getByRole("link", { name: "Download Receipt" }).click();
  await expect(page.getByRole("heading", { name: "Payment confirmation" })).toBeVisible();
  await expect(page.getByText("not a charitable tax receipt")).toBeVisible();
});

test("a wrong token reveals nothing", async ({ page }) => {
  await page.goto(`/honor/confirmation?ref=${paid.receipt_ref}&t=wrong-token`);
  await expect(page.getByRole("heading", { name: "We could not find this payment" })).toBeVisible();
  await expect(page.getByText("£50")).toHaveCount(0);
});

test("late or out-of-order events never move a payment backwards", async ({ page }) => {
  const succeeded = await stripeEvent("payment_intent.succeeded", paid.stripe_payment_intent_id);
  const stale = { ...succeeded, id: `evt_e2e_${Date.now()}`, type: "payment_intent.processing" } as Stripe.Event;
  const res = await deliver(page, stale);
  expect(res.json.outcome).toBe("no change (succeeded)");
  expect((await payment(paid.id)).status).toBe("succeeded");
});

test("unsigned or wrongly signed webhooks are refused", async ({ page }) => {
  const succeeded = await stripeEvent("payment_intent.succeeded", paid.stripe_payment_intent_id);
  const forged = await deliver(page, { ...succeeded, id: "evt_forged" } as Stripe.Event, "whsec_attacker");
  expect(forged.status).toBe(400);
  const res = await page.request.post("/api/stripe/webhook", { data: JSON.stringify(succeeded) });
  expect(res.status()).toBe(400);
  const { rows } = await db.query(`select count(*)::int as n from payment_events where stripe_event_id = 'evt_forged'`);
  expect(rows[0].n).toBe(0);
});

test("partial refund is recorded against the original payment", async ({ page }) => {
  const refund = await stripe.refunds.create({ payment_intent: paid.stripe_payment_intent_id, amount: 1000 });
  const refunded = await stripeEvent("charge.refunded", (await stripe.refunds.retrieve(refund.id)).charge as string);
  expect((await deliver(page, refunded)).json.outcome).toBe("refunded total 1000 → partially_refunded");

  const created = await stripeEvent("refund.created", refund.id);
  expect((await deliver(page, created)).status).toBe(200);

  expect(await payment(paid.id)).toMatchObject({ status: "partially_refunded", refunded_minor: 1000 });
  const { rows } = await db.query(
    `select amount_minor::int as amount_minor, currency, status from refunds where stripe_refund_id = $1`,
    [refund.id],
  );
  expect(rows).toEqual([{ amount_minor: 1000, currency: "GBP", status: "succeeded" }]);

  await page.goto(`/honor/confirmation?ref=${paid.receipt_ref}&t=${paid.access_token}`);
  await expect(page.getByRole("heading", { name: "Partial Refund Initiated" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("A refund of £10 GBP has been initiated");
});

test("declined card: payment is recorded as failed and the visitor is told plainly", async ({ page }) => {
  const declined = await checkout(page, "USD", "20");
  await expect(
    stripe.paymentIntents.confirm(declined.stripe_payment_intent_id, {
      payment_method: "pm_card_chargeDeclined",
      return_url: "http://localhost/honor/confirmation",
    }),
  ).rejects.toThrow();
  const failed = await stripeEvent("payment_intent.payment_failed", declined.stripe_payment_intent_id);
  expect((await deliver(page, failed)).json.outcome).toBe("requires_payment → failed");

  await page.goto(`/honor/confirmation?ref=${declined.receipt_ref}&t=${declined.access_token}`);
  await expect(page.getByRole("heading", { name: "We Could Not Complete Your Payment" })).toBeVisible();
  await expect(page.getByText("No successful payment has been recorded.")).toBeVisible();
});

test("double-submitting checkout reuses the same payment", async ({ page }) => {
  await page.goto("/honor?currency=USD&amount=100");
  await page.getByRole("button", { name: "Continue to Secure Payment" }).click();
  await page.getByLabel("Email for your receipt").fill("e2e-double@example.test");
  const submit = page.getByRole("button", { name: "Continue to Secure Payment" });
  await submit.click();
  await expect(page.getByRole("heading", { name: "Review Your Honor" })).toBeVisible({ timeout: 20_000 });
  // Go back and resubmit the same attempt.
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Continue to Secure Payment" }).click();
  await expect(page.getByRole("heading", { name: "Review Your Honor" })).toBeVisible({ timeout: 20_000 });
  const { rows } = await db.query(
    `select count(*)::int as n from payments where donor_email = 'e2e-double@example.test' and created_at > now() - interval '5 minutes'`,
  );
  expect(rows[0].n).toBe(1);
});
