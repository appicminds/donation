import type { Payload } from "payload";
import type Stripe from "stripe";
import type { Payment } from "@/payload-types";
import { sendReceiptEmail, sendRefundEmail } from "./emails";
import { nextStatus, refundStatus, type PaymentStatus } from "./rules";
import { acceptsLivemode, stripe } from "./stripe";

/**
 * Apply a verified Stripe event to the ledger (PRD §9.3 step 10, §9.4).
 *  - Each event is recorded once by its Stripe id (unique constraint). A
 *    redelivery is acknowledged and ignored, so it never posts twice.
 *  - Status only moves forward (see `nextStatus`), so out-of-order delivery is safe.
 *  - Settlement figures (gross, fee, net, FX) come from Stripe's balance transaction.
 */
export async function handleStripeEvent(payload: Payload, event: Stripe.Event): Promise<string> {
  if (!acceptsLivemode(event.livemode)) return "ignored: live event while live mode is not approved";

  const object = event.data.object as { id?: string };
  try {
    await payload.create({
      collection: "payment-events",
      overrideAccess: true,
      data: {
        stripeEventId: event.id,
        type: event.type,
        livemode: event.livemode,
        verified: true,
        objectId: object.id,
        outcome: "received",
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }

  let outcome = "ignored: event type not used";
  let paymentId: number | undefined;
  try {
    switch (event.type) {
      case "payment_intent.processing":
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const payment = await findPayment(payload, { paymentIntentId: pi.id });
        if (!payment) {
          outcome = "unmatched payment intent";
          break;
        }
        paymentId = payment.id;
        outcome = await applyPaymentIntent(payload, payment, event.type, pi);
        break;
      }
      case "charge.succeeded":
      case "charge.updated": {
        // Stripe can attach the balance transaction (fees, FX) after the payment succeeds.
        const charge = event.data.object as Stripe.Charge;
        const payment = await findPayment(payload, { paymentIntentId: piId(charge.payment_intent) });
        if (!payment) {
          outcome = "unmatched charge";
          break;
        }
        paymentId = payment.id;
        outcome = await applySettlement(payload, payment, charge);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const payment = await findPayment(payload, { paymentIntentId: piId(charge.payment_intent) });
        if (!payment) {
          outcome = "unmatched charge";
          break;
        }
        paymentId = payment.id;
        outcome = await applyRefundTotal(payload, payment, charge.amount_refunded);
        break;
      }
      case "refund.created":
      case "refund.updated":
      case "refund.failed": {
        const refund = event.data.object as Stripe.Refund;
        const payment = await findPayment(payload, { paymentIntentId: piId(refund.payment_intent) });
        if (!payment) {
          outcome = "unmatched refund";
          break;
        }
        paymentId = payment.id;
        outcome = await upsertRefund(payload, payment, refund);
        break;
      }
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const payment = await findPayment(payload, { paymentIntentId: piId(dispute.payment_intent) });
        if (!payment) {
          outcome = "unmatched dispute";
          break;
        }
        paymentId = payment.id;
        outcome = await applyDispute(payload, payment, dispute, event.type);
        break;
      }
    }
  } catch (error) {
    // Forget the receipt so Stripe's automatic retry is processed rather than skipped as a duplicate.
    await payload.delete({
      collection: "payment-events",
      where: { stripeEventId: { equals: event.id } },
      overrideAccess: true,
    });
    throw error;
  }

  await payload.update({
    collection: "payment-events",
    where: { stripeEventId: { equals: event.id } },
    overrideAccess: true,
    data: { outcome, payment: paymentId },
  });
  return outcome;
}

const piId = (v: string | { id: string } | null | undefined) => (v && typeof v === "object" ? v.id : (v ?? undefined));

function isUniqueViolation(error: unknown): boolean {
  const e = error as {
    code?: string;
    cause?: { code?: string };
    message?: string;
    data?: { errors?: { message?: string }[] };
  };
  return (
    e?.code === "23505" ||
    e?.cause?.code === "23505" ||
    /unique|already exists|must be unique/i.test(e?.message ?? "") ||
    Boolean(e?.data?.errors?.some((x) => /unique/i.test(x.message ?? "")))
  );
}

async function findPayment(payload: Payload, by: { paymentIntentId?: string }): Promise<Payment | null> {
  if (!by.paymentIntentId) return null;
  const { docs } = await payload.find({
    collection: "payments",
    where: { stripePaymentIntentId: { equals: by.paymentIntentId } },
    overrideAccess: true,
    limit: 1,
    depth: 0,
    showHiddenFields: true,
  });
  return docs[0] ?? null;
}

async function applyPaymentIntent(
  payload: Payload,
  payment: Payment,
  type: string,
  pi: Stripe.PaymentIntent,
): Promise<string> {
  const incoming: PaymentStatus =
    type === "payment_intent.succeeded"
      ? "succeeded"
      : type === "payment_intent.processing"
        ? "processing"
        : type === "payment_intent.payment_failed"
          ? "failed"
          : "canceled";

  // The event's amount and currency must match what was recorded at checkout.
  if (pi.amount !== payment.amountMinor || pi.currency.toUpperCase() !== payment.currency) {
    await payload.update({
      collection: "payments",
      id: payment.id,
      overrideAccess: true,
      data: { failureMessage: `Mismatch: Stripe reported ${pi.amount} ${pi.currency}` },
    });
    return "amount/currency mismatch: not applied";
  }

  const status = nextStatus(payment.status, incoming);
  const data: Partial<Payment> = { status, lastEventAt: new Date().toISOString(), livemode: pi.livemode };
  if (incoming === "failed") data.failureMessage = pi.last_payment_error?.message ?? "Payment failed";

  if (incoming === "succeeded" && status === "succeeded") {
    data.succeededAt = new Date().toISOString();
    Object.assign(data, await settlementFor(pi));
  }

  const updated = await payload.update({ collection: "payments", id: payment.id, overrideAccess: true, data });

  if (status === "succeeded" && !payment.receiptEmailSentAt) {
    await sendReceiptEmail(payload, updated);
    await payload.update({
      collection: "payments",
      id: payment.id,
      overrideAccess: true,
      data: { receiptEmailSentAt: new Date().toISOString() },
    });
  }
  return status === payment.status ? `no change (${status})` : `${payment.status} → ${status}`;
}

/** Gross, fee, net and FX from the charge's balance transaction (PRD §9.4, §13.1). */
async function settlementFor(pi: Stripe.PaymentIntent): Promise<Partial<Payment>> {
  try {
    const full = await stripe().paymentIntents.retrieve(pi.id, { expand: ["latest_charge.balance_transaction"] });
    const charge = full.latest_charge as Stripe.Charge | null;
    return charge ? settlementFromCharge(charge) : {};
  } catch (error) {
    // The payment still succeeded; settlement is filled in by a later charge.updated event.
    console.error("[webhook] settlement lookup failed", error);
    return {};
  }
}

async function settlementFromCharge(charge: Stripe.Charge): Promise<Partial<Payment>> {
  let bt = charge.balance_transaction;
  if (typeof bt === "string") bt = await stripe().balanceTransactions.retrieve(bt);
  return {
    stripeChargeId: charge.id,
    ...(bt
      ? {
          balanceTransactionId: bt.id,
          grossMinor: bt.amount,
          feeMinor: bt.fee,
          netMinor: bt.net,
          settlementCurrency: bt.currency.toUpperCase(),
          fxRate: bt.exchange_rate ?? null,
          availableOn: new Date(bt.available_on * 1000).toISOString(),
        }
      : {}),
  };
}

async function applySettlement(payload: Payload, payment: Payment, charge: Stripe.Charge): Promise<string> {
  if (payment.balanceTransactionId || !charge.balance_transaction) return "settlement: nothing new";
  const data = await settlementFromCharge(charge);
  await payload.update({ collection: "payments", id: payment.id, overrideAccess: true, data });
  return `settlement recorded (${data.settlementCurrency})`;
}

async function applyRefundTotal(payload: Payload, payment: Payment, refundedMinor: number): Promise<string> {
  const target = refundStatus(payment.amountMinor, refundedMinor);
  const status = payment.status === "disputed" ? "disputed" : nextStatus(payment.status, target);
  await payload.update({
    collection: "payments",
    id: payment.id,
    overrideAccess: true,
    data: {
      refundedMinor: Math.max(refundedMinor, payment.refundedMinor ?? 0),
      status,
      lastEventAt: new Date().toISOString(),
    },
  });
  return `refunded total ${refundedMinor} → ${status}`;
}

async function upsertRefund(payload: Payload, payment: Payment, refund: Stripe.Refund): Promise<string> {
  const { docs } = await payload.find({
    collection: "refunds",
    where: { stripeRefundId: { equals: refund.id } },
    overrideAccess: true,
    limit: 1,
    depth: 0,
  });
  const existing = docs[0];
  const data = {
    payment: payment.id,
    amountMinor: refund.amount,
    currency: refund.currency.toUpperCase(),
    status: refund.status ?? "pending",
    reason: refund.reason ?? undefined,
    stripeRefundId: refund.id,
  };
  const saved = existing
    ? await payload.update({ collection: "refunds", id: existing.id, overrideAccess: true, data })
    : await payload.create({ collection: "refunds", overrideAccess: true, data });

  if (refund.status === "succeeded" && !saved.notifiedAt) {
    await sendRefundEmail(payload, payment, refund.amount);
    await payload.update({
      collection: "refunds",
      id: saved.id,
      overrideAccess: true,
      data: { notifiedAt: new Date().toISOString() },
    });
  }
  return `refund ${refund.id} ${refund.status}`;
}

async function applyDispute(
  payload: Payload,
  payment: Payment,
  dispute: Stripe.Dispute,
  type: string,
): Promise<string> {
  const closed = type === "charge.dispute.closed";
  let status: PaymentStatus = "disputed";
  if (closed) status = refundStatus(payment.amountMinor, payment.refundedMinor ?? 0);
  await payload.update({
    collection: "payments",
    id: payment.id,
    overrideAccess: true,
    data: {
      status: closed ? status : nextStatus(payment.status, "disputed"),
      disputeId: dispute.id,
      disputeStatus: dispute.status,
      disputeReason: dispute.reason,
      disputeEvidenceDueBy: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
        : undefined,
      lastEventAt: new Date().toISOString(),
    },
  });
  return `dispute ${dispute.status}`;
}
