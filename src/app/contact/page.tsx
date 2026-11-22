import type { Metadata } from "next";
import { Notice } from "@/components/ui/Notice";
import { PageHero } from "@/components/ui/PageHero";
import { contactPage } from "@/content/copy";
import { flags } from "@/content/flags";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Contact", description: contactPage.intro };

/** Contact (PRD §8.3). The form and support inbox arrive in M3. */
export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title={contactPage.title}>
        <p>{contactPage.intro}</p>
      </PageHero>
      <div className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
        {!flags.contactFormEnabled && <Notice>{contactPage.notYetOpen}</Notice>}
        {site.supportEmail && (
          <p className="mt-6 text-ink/80">
            You can also email{" "}
            <a className="text-violet underline underline-offset-4" href={`mailto:${site.supportEmail}`}>
              {site.supportEmail}
            </a>
            .
          </p>
        )}
        <h2 className="mt-12 text-3xl text-ink">What you can contact us about</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-ink/85">
          <li>A memorial message for the family</li>
          <li>Help with a payment</li>
          <li>A general question about this website</li>
        </ul>
      </div>
    </>
  );
}
