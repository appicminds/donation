/** Secure links back to a payment's confirmation and receipt (reference + secret token). */
export function paymentLinks(p: { receiptRef: string; accessToken?: string | null }) {
  const base = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "");
  if (!base || !p.accessToken) return null;
  const q = `ref=${encodeURIComponent(p.receiptRef)}&t=${encodeURIComponent(p.accessToken)}`;
  return {
    confirmation: `${base}/honor/confirmation?${q}`,
    receipt: `${base}/honor/receipt?${q}`,
    account: `${base}/account?${q}`,
  };
}
