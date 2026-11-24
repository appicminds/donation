import type { Metadata } from "next";
import { Suspense } from "react";
import { ReceiptSummary } from "@/components/honor/ConfirmationView";
import { PrintButton } from "@/components/honor/PrintButton";
import { ButtonLink } from "@/components/ui/Button";
import { getSiteSettings } from "@/lib/cms";
import { formatMoney } from "@/lib/money";
import { getHonorStatus } from "@/lib/payments/actions";

export const metadata: Metadata = { title: "Receipt", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ ref?: string; t?: string }> };

const PAID = new Set(["succeeded", "partially_refunded", "refunded", "disputed"]);

/** Printable payment confirmation (PRD §10.2). Saved as PDF from the browser's print dialog. */
export default function ReceiptPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 print:py-0">
      <Suspense fallback={<p className="text-ink/70">Loading your receipt…</p>}>
        <Receipt searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Receipt({ searchParams }: Props) {
  const { ref = "", t = "" } = await searchParams;
  const [status, settings] = await Promise.all([getHonorStatus(ref, t), getSiteSettings()]);
  if (!status || !PAID.has(status.status)) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl text-ink">Receipt not available</h1>
        <p className="text-ink/80">A receipt is available once the payment has been confirmed.</p>
        <ButtonLink href="/" variant="outline-dark">
          Return to Memorial
        </ButtonLink>
      </div>
    );
  }
  return (
    <article className="space-y-8">
      <header>
        <p className="eyebrow text-violet">Comfort Kwaw Memorial Fund</p>
        <h1 className="mt-2 text-4xl text-ink">Payment confirmation</h1>
        <p className="mt-2 font-display text-lg text-ink/80 italic">Forever Comfort — An Eternal Legacy</p>
      </header>
      <ReceiptSummary
        status={status}
        amount={formatMoney({ amountMinor: status.amountMinor, currency: status.currency })}
      />
      {settings.disclosures.legalRecipient && (
        <p className="text-sm text-ink/80">Recipient: {settings.disclosures.legalRecipient}</p>
      )}
      <p className="border-t border-ink/10 pt-4 text-sm text-ink/80">
        This is a payment confirmation, not a charitable tax receipt unless separately stated by an eligible
        organization.
      </p>
      <div className="flex flex-wrap gap-4 print:hidden">
        <PrintButton />
        <ButtonLink href="/" variant="outline-dark">
          Return to Memorial
        </ButtonLink>
      </div>
    </article>
  );
}
