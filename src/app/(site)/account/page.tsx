import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DonorSignInForm } from "@/components/forms/DonorSignInForm";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHero } from "@/components/ui/PageHero";
import { hasDatabase, payloadClient } from "@/lib/cms";
import { setNameDisplay, signOutDonor } from "@/lib/donors/actions";
import { donorPayments } from "@/lib/donors/data";
import { currentDonor } from "@/lib/donors/server";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Donor account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ expired?: string; signedOut?: string; saved?: string }> };

/** Donor account (PRD addendum A1): passwordless sign-in and the donor's own payments. */
export default function AccountPage({ searchParams }: Props) {
  return (
    <>
      <PageHero eyebrow="Donor account" title="Your Honors">
        <p>See the payments you have made in memory of Comfort Kwaw, and download your receipts.</p>
      </PageHero>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <Suspense fallback={<p className="text-ink/70">Loading…</p>}>
          <Account searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

const STATUS: Record<string, string> = {
  succeeded: "Successful",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  disputed: "Under review",
  processing: "Processing",
  requires_payment: "Not completed",
  created: "Not completed",
  failed: "Not completed",
  canceled: "Canceled",
};
const PAID = new Set(["succeeded", "partially_refunded", "refunded", "disputed"]);

/** Sign-in needs a way to deliver the link. ALLOW_CONSOLE_EMAIL=1 is for tests only (links go to the server log). */
const emailReady = () =>
  process.env.NODE_ENV !== "production" ||
  Boolean(process.env.RESEND_API_KEY) ||
  process.env.ALLOW_CONSOLE_EMAIL === "1";

async function Account({ searchParams }: Props) {
  await connection(); // personal, per-request page: never prerendered
  const q = await searchParams;
  const donor = await currentDonor();

  if (!donor) {
    return (
      <section aria-labelledby="signin-title" className="space-y-6">
        {q.expired && (
          <Notice title="This link has expired">
            Sign-in links work once and expire after 20 minutes. Please request a new one.
          </Notice>
        )}
        {q.signedOut && <Notice>You have signed out.</Notice>}
        <h2 id="signin-title" className="text-3xl text-ink">
          Sign in with your email
        </h2>
        <p className="text-ink/80">
          No password is needed. Enter the email address you used for your receipt and we will send you a link that
          signs you in.
        </p>
        {hasDatabase() && emailReady() ? (
          <DonorSignInForm />
        ) : (
          <Notice>
            Donor sign-in will be available soon. Your receipt email contains a link to your receipt in the meantime.
          </Notice>
        )}
      </section>
    );
  }

  const payments = await donorPayments(await payloadClient(), donor.email);
  const showName = payments.some((p) => p.showName);

  return (
    <div className="space-y-12">
      {q.saved && <Notice>Your preference has been saved.</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink/80">
          Signed in as <strong className="text-ink">{donor.email}</strong>
        </p>
        <form action={signOutDonor}>
          <Button type="submit" variant="outline-dark">
            Sign out
          </Button>
        </form>
      </div>

      <section aria-labelledby="honors-title">
        <h2 id="honors-title" className="text-3xl text-ink">
          Your payments
        </h2>
        {payments.length === 0 ? (
          <p className="mt-4 text-ink/80">There are no payments for this email address.</p>
        ) : (
          <ul className="mt-6 divide-y divide-ink/10 rounded-2xl bg-white shadow-sm ring-1 ring-ink/5">
            {payments.map((p) => {
              const q = `ref=${encodeURIComponent(p.receiptRef)}&t=${encodeURIComponent(p.accessToken)}`;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-display text-2xl text-ink">
                      {formatMoney({ amountMinor: p.amountMinor, currency: p.currency })} {p.currency}
                    </p>
                    <p className="text-sm text-ink/75">
                      {new Date(p.succeededAt ?? p.createdAt).toLocaleDateString("en-GB", {
                        dateStyle: "long",
                        timeZone: "UTC",
                      })}{" "}
                      · {STATUS[p.status] ?? p.status} · {p.receiptRef}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {PAID.has(p.status) && (
                      <Link
                        className="font-semibold text-violet underline underline-offset-4"
                        href={`/honor/receipt?${q}`}
                      >
                        Receipt
                      </Link>
                    )}
                    <Link className="text-violet underline underline-offset-4" href={`/honor/confirmation?${q}`}>
                      Status
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {payments.length > 0 && (
        <section aria-labelledby="privacy-title" className="space-y-4">
          <h2 id="privacy-title" className="text-3xl text-ink">
            Your name
          </h2>
          <form action={setNameDisplay} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5">
            <div className="flex items-start gap-3">
              <input
                id="showName"
                name="showName"
                type="checkbox"
                defaultChecked={showName}
                className="mt-0.5 size-5 accent-violet"
              />
              <label htmlFor="showName" className="text-sm text-ink">
                The family may display my name publicly as someone who honored Comfort. Amounts are never shown.
              </label>
            </div>
            <Button type="submit" variant="outline-dark">
              Save preference
            </Button>
          </form>
        </section>
      )}

      <section aria-labelledby="help-title" className="space-y-2 text-ink/80">
        <h2 id="help-title" className="text-3xl text-ink">
          Need help?
        </h2>
        <p>
          For questions about a payment or a refund,{" "}
          <Link className="text-violet underline underline-offset-4" href="/contact">
            contact us
          </Link>{" "}
          with your receipt reference.
        </p>
        <p>
          To ask about the personal data we hold, see our{" "}
          <Link className="text-violet underline underline-offset-4" href="/privacy">
            Privacy Policy
          </Link>
          . Payment records are kept for accounting as the policy describes.
        </p>
      </section>
    </div>
  );
}
