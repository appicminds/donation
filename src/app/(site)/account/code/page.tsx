import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DonorCodeForm } from "@/components/forms/DonorSignInForm";
import { PageHero } from "@/components/ui/PageHero";
import { pendingEmail } from "@/lib/donors/server";
import { maskEmail } from "@/lib/donors/session";

export const metadata: Metadata = { title: "Enter your code", robots: { index: false, follow: false } };

/** Step 2 of sign-in (PRD addendum A1-14). The email comes from a short-lived signed cookie, not the URL. */
export default function CodePage() {
  return (
    <>
      <PageHero eyebrow="Donor account" title="Check your email" />
      <div className="mx-auto max-w-xl px-4 py-14 sm:py-20">
        <Suspense fallback={<p className="text-ink/70">Loading…</p>}>
          <EnterCode />
        </Suspense>
      </div>
    </>
  );
}

async function EnterCode() {
  await connection();
  const email = await pendingEmail();
  if (!email) redirect("/account?expired=1");
  return (
    <section aria-labelledby="code-title" className="space-y-6">
      <h2 id="code-title" className="text-3xl text-ink">
        Enter your sign-in code
      </h2>
      <p className="text-ink/80">
        If <strong className="text-ink">{maskEmail(email)}</strong> has an account, we have sent it a 6-digit code. It
        works once and expires in 20 minutes.
      </p>
      <DonorCodeForm />
      <p className="text-sm text-ink/75">
        No email?{" "}
        <Link href="/account" className="text-violet underline underline-offset-4">
          Request a new code or use a different email
        </Link>
        .
      </p>
    </section>
  );
}
