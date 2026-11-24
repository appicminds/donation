import { APIError, type PayloadRequest } from "payload";
import type { Payment } from "@/payload-types";
import { stripe } from "./stripe";

type RefundRequest = { amount?: number | null; reason?: string | null; confirm?: boolean | null };

/**
 * Issue a refund from the admin (PRD §9.7, §12.3). Called from the Payments
 * collection hook after the role check. Stripe is the source of truth: the
 * webhook (charge.refunded / refund.updated) later records the final state.
 */
export async function issueRefund(req: PayloadRequest, payment: Payment, request: RefundRequest) {
  if (!request.confirm) throw new APIError("Tick the confirmation box to issue this refund.", 400);
  if (!payment.stripePaymentIntentId) throw new APIError("This payment has no Stripe payment to refund.", 400);
  if (!["succeeded", "partially_refunded", "disputed"].includes(payment.status)) {
    throw new APIError("Only successful payments can be refunded.", 400);
  }

  const amountMinor = Math.round(Number(request.amount) * 100);
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new APIError("Enter a refund amount above zero.", 400);

  const { docs: existing } = await req.payload.find({
    collection: "refunds",
    where: { payment: { equals: payment.id } },
    overrideAccess: true,
    limit: 100,
    depth: 0,
    req,
  });
  const committed = existing
    .filter((r) => r.status !== "failed" && r.status !== "canceled")
    .reduce((sum, r) => sum + r.amountMinor, 0);
  const remaining = payment.amountMinor - Math.max(committed, payment.refundedMinor ?? 0);
  if (amountMinor > remaining) {
    throw new APIError(
      `The most that can still be refunded is ${(remaining / 100).toFixed(2)} ${payment.currency}.`,
      400,
    );
  }

  const refund = await stripe().refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId,
      amount: amountMinor,
      reason: (request.reason as "duplicate" | "fraudulent" | "requested_by_customer" | null) ?? undefined,
      metadata: { paymentId: String(payment.id), receiptRef: payment.receiptRef },
    },
    // Same payment, same running total, same amount -> Stripe returns the same refund, never a second one.
    { idempotencyKey: `refund:${payment.id}:${existing.length}:${amountMinor}` },
  );

  await req.payload.create({
    collection: "refunds",
    overrideAccess: true,
    req,
    data: {
      payment: payment.id,
      amountMinor,
      currency: payment.currency,
      status: refund.status ?? "pending",
      reason: request.reason ?? undefined,
      stripeRefundId: refund.id,
      requestedBy: req.user?.id,
    },
  });
}
