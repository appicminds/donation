import type Stripe from "stripe";
import { hasDatabase, payloadClient } from "@/lib/cms";
import { stripe, stripeConfigured } from "@/lib/payments/stripe";
import { handleStripeEvent } from "@/lib/payments/webhook";

/**
 * Stripe webhook (PRD §9.3 step 10, §9.4). Only a correctly signed event can
 * change a payment. Stripe's signature includes a timestamp, and events older
 * than 5 minutes are refused (replay protection). Duplicate deliveries are
 * idempotent.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !stripeConfigured() || !hasDatabase()) {
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, signature, secret, 300);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(await payloadClient(), event);
    return Response.json({ received: true, outcome });
  } catch (error) {
    console.error("[stripe webhook] processing failed", event.id, error);
    // 500 tells Stripe to retry later; the event record was rolled back.
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
