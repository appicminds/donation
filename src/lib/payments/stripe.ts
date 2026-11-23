import Stripe from "stripe";

let client: Stripe | null = null;

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/** Live keys are refused unless explicitly allowed (Gate D: production approval). */
export const liveModeAllowed = () => process.env.STRIPE_ALLOW_LIVE === "true";

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (key.startsWith("sk_live_") && !liveModeAllowed()) {
    throw new Error("Live Stripe keys are blocked until STRIPE_ALLOW_LIVE=true is set after production approval.");
  }
  client ??= new Stripe(key, {
    appInfo: { name: "Comfort Kwaw Memorial Fund" },
    maxNetworkRetries: 2,
    // fetch-based client: works on Vercel (Node and Edge) and honours proxy settings in dev.
    httpClient: Stripe.createFetchHttpClient(),
  });
  return client;
}

/** Whether events from this livemode should be accepted. */
export function acceptsLivemode(livemode: boolean): boolean {
  return livemode ? liveModeAllowed() : true;
}
