import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/honor/ConfirmationView";
import { ButtonLink } from "@/components/ui/Button";
import { getHonorStatus } from "@/lib/payments/actions";

export const metadata: Metadata = { title: "Payment confirmation", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ ref?: string; t?: string }> };

/** Payment confirmation (PRD §10.1). Requires the receipt reference and its secret token. */
export default function ConfirmationPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <Suspense fallback={<p className="text-ink/70">Loading your payment status…</p>}>
        <Confirmation searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ searchParams }: Props) {
  const { ref = "", t = "" } = await searchParams;
  const status = await getHonorStatus(ref, t);
  if (!status) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl text-ink">We could not find this payment</h1>
        <p className="text-ink/80">
          Please use the link from your confirmation email. If you need help, contact us with your receipt reference.
        </p>
        <ButtonLink href="/contact" variant="outline-dark">
          Contact Us
        </ButtonLink>
      </div>
    );
  }
  return <ConfirmationView initial={status} token={t} />;
}
