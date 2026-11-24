import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { confirmDonorLink } from "@/lib/donors/actions";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ token?: string }> };

/** Landing page for the emailed link. Signing in needs a deliberate press, so link scanners can't use it up. */
export default function VerifyPage({ searchParams }: Props) {
  return (
    <>
      <PageHero eyebrow="Donor account" title="Welcome back" />
      <div className="mx-auto max-w-xl px-4 py-14 text-center sm:py-20">
        <Suspense fallback={null}>
          <Continue searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Continue({ searchParams }: Props) {
  const { token = "" } = await searchParams;
  return (
    <form action={confirmDonorLink} className="space-y-6">
      <p className="text-lg text-ink/85">Press continue to sign in to your donor account.</p>
      <input type="hidden" name="token" value={token} />
      <Button type="submit" arrow>
        Continue to your account
      </Button>
    </form>
  );
}
