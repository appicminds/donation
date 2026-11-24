"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { getHonorStatus, type HonorStatus } from "@/lib/payments/actions";

const WAITING = new Set(["created", "requires_payment", "processing"]);
const POLL_MS = 2500;
const POLL_LIMIT = 48; // ~2 minutes, then the visitor can refresh or check their email

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " UTC";

/**
 * Payment confirmation states (PRD §10.1). The status shown is the one
 * recorded from Stripe's verified webhook, never inferred from the redirect.
 */
export function ConfirmationView({ initial, token }: { initial: HonorStatus; token: string }) {
  const [status, setStatus] = useState(initial);
  const [gaveUp, setGaveUp] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!WAITING.has(status.status)) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const next = await getHonorStatus(status.receiptRef, token).catch(() => null);
      if (next && next.status !== status.status) setStatus(next);
      if (tries >= POLL_LIMIT) {
        clearInterval(timer);
        setGaveUp(true);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [status.status, status.receiptRef, token]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [status.status]);

  const amount = formatMoney({ amountMinor: status.amountMinor, currency: status.currency });
  const receiptHref = `/honor/receipt?ref=${encodeURIComponent(status.receiptRef)}&t=${encodeURIComponent(token)}`;
  const accountHref = `/account?ref=${encodeURIComponent(status.receiptRef)}&t=${encodeURIComponent(token)}`;
  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1} className="text-4xl text-ink outline-none sm:text-5xl">
      {text}
    </h1>
  );

  return (
    <div aria-live="polite" className="space-y-8">
      {status.status === "succeeded" && (
        <>
          {heading("Thank You for Honoring Comfort")}
          <p className="text-lg text-ink/85">
            Thank you for honoring the memory of Comfort Kwaw. Your kindness and love mean so much to our family.
          </p>
          <ReceiptSummary status={status} amount={amount} />
          <div className="flex flex-wrap gap-4">
            <ButtonLink href={receiptHref} arrow>
              Download Receipt
            </ButtonLink>
            <ButtonLink href="/" variant="outline-dark">
              Return to Memorial
            </ButtonLink>
          </div>
          <section
            aria-labelledby="account-ready-title"
            className="space-y-3 rounded-2xl border-l-4 border-gold bg-white p-6 shadow-sm"
          >
            <h2 id="account-ready-title" className="font-display text-2xl text-ink">
              Your donor account is ready
            </h2>
            <p className="text-ink/80">
              Sign in any time with the email address on this payment to see your receipts. We will email you a code to
              confirm it&apos;s you, and you can add a password if you like.
            </p>
            <ButtonLink href={accountHref} variant="outline-dark">
              Go to your donor account
            </ButtonLink>
          </section>
        </>
      )}

      {WAITING.has(status.status) && (
        <>
          {heading("Your Payment Is Being Processed")}
          <p className="text-lg text-ink/85">
            We are waiting for confirmation from the payment provider. Please do not submit another payment until your
            status is updated.
          </p>
          {gaveUp ? (
            <p className="text-ink/80">
              This is taking longer than usual. You will receive an email when your payment is confirmed. You can also
              refresh this page later.
            </p>
          ) : (
            <p role="status" className="text-sm text-violet">
              Checking your payment status…
            </p>
          )}
          <p className="text-sm text-ink/70">Receipt reference: {status.receiptRef}</p>
        </>
      )}

      {(status.status === "failed" || status.status === "canceled") && (
        <>
          {heading("We Could Not Complete Your Payment")}
          <p className="text-lg text-ink/85">
            Your payment was not completed. No successful payment has been recorded. Please try again or choose another
            available payment method.
          </p>
          <div className="flex flex-wrap gap-4">
            <ButtonLink href={`/honor?currency=${status.currency}`} arrow>
              Try Again
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline-dark">
              Contact Us for Help
            </ButtonLink>
          </div>
        </>
      )}

      {(status.status === "refunded" || status.status === "partially_refunded") && (
        <>
          {heading(status.status === "refunded" ? "Refund Initiated" : "Partial Refund Initiated")}
          <p className="text-lg text-ink/85">
            A refund of {formatMoney({ amountMinor: status.refundedMinor, currency: status.currency })}{" "}
            {status.currency} has been initiated for receipt {status.receiptRef}. The time it takes to appear depends on
            your payment provider.
          </p>
          <ReceiptSummary status={status} amount={amount} />
        </>
      )}

      {status.status === "disputed" && (
        <>
          {heading("Your Payment Is Under Review")}
          <p className="text-lg text-ink/85">
            Your payment provider is reviewing this payment. If you have questions, please contact us with your receipt
            reference.
          </p>
          <p className="text-sm text-ink/70">Receipt reference: {status.receiptRef}</p>
        </>
      )}
    </div>
  );
}

export function ReceiptSummary({ status, amount }: { status: HonorStatus; amount: string }) {
  const statusLabel: Record<string, string> = {
    succeeded: "Successful",
    refunded: "Refunded",
    partially_refunded: "Partially refunded",
    disputed: "Under review",
  };
  return (
    <dl className="divide-y divide-ink/10 rounded-2xl bg-white px-5 shadow-sm ring-1 ring-ink/5">
      {[
        ["Receipt number", status.receiptRef],
        ["Date and time", fmtDate(status.succeededAt ?? status.createdAt)],
        ["Amount", amount],
        ["Currency", status.currency],
        ["Payment status", statusLabel[status.status] ?? status.status],
        ["Name displayed as", status.displayName],
      ].map(([term, value]) => (
        <div key={term} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-sm font-semibold text-ink/80">{term}</dt>
          <dd className="text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
