import type { Metadata } from "next";
import { Suspense } from "react";
import { HonorForm } from "@/components/honor/HonorForm";
import { PageHero } from "@/components/ui/PageHero";
import { home, paymentCopy } from "@/content/copy";
import { getSiteSettings } from "@/lib/cms";

export const metadata: Metadata = { title: "Honor Comfort Kwaw", description: home.honor.body };

/** Honor Comfort (PRD §8.2). Checkout, contributor details and disclosures land in M4. */
export default async function HonorPage() {
  const settings = await getSiteSettings();
  return (
    <>
      <PageHero eyebrow="Honor Comfort" title={home.honor.title}>
        <p>{home.honor.body}</p>
      </PageHero>
      <div className="mx-auto grid max-w-site gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:px-8">
        <Suspense fallback={<div className="min-h-96" aria-hidden="true" />}>
          <HonorForm
            currencies={settings.currencies}
            paymentsEnabled={settings.flags.paymentsEnabled}
            limits={settings.customAmount}
          />
        </Suspense>
        <aside className="space-y-6 lg:pt-1">
          <div className="rounded-2xl bg-plum p-6 text-white">
            <p className="font-display text-2xl italic">{paymentCopy.globalWelcome}</p>
          </div>
          <div className="rounded-2xl bg-white p-6 text-sm text-ink/80 shadow-sm ring-1 ring-ink/5">
            <h2 className="font-display text-2xl text-ink">Before you give</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Your name is kept private by default.</li>
              <li>
                Details about the payment recipient, charges and refunds will be shown before you confirm any payment.
                See{" "}
                <a className="text-violet underline underline-offset-4" href="/payment-information">
                  Payment Information
                </a>
                .
              </li>
              <li>A payment confirmation is not a charitable tax receipt.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
