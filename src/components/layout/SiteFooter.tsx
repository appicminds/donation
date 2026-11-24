import Link from "next/link";
import { cacheLife } from "next/cache";
import { legalNav, mainNav, site } from "@/content/site";
import { getSiteSettings } from "@/lib/cms";
import { BrandMark } from "./BrandMark";

/** Copyright year, generated rather than hardcoded (PRD §7.9). */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export async function SiteFooter() {
  const { supportEmail } = await getSiteSettings();
  return (
    <footer className="bg-plum text-white/80 print:hidden">
      <div className="mx-auto grid max-w-site gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
        <div>
          <BrandMark />
          <p className="mt-4 font-display text-lg text-white/70 italic">{site.tagline}</p>
        </div>

        <nav aria-label="Quick links">
          <h2 className="eyebrow mb-4 text-gold">Quick links</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-4 text-gold">Get in touch</h2>
          {/* Show only a verified support email; never a placeholder (PRD §7.9). */}
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`} className="text-sm hover:text-gold">
              {supportEmail}
            </a>
          ) : (
            <Link href="/contact" className="text-sm hover:text-gold">
              Send the family a message
            </Link>
          )}
          {site.social.length > 0 && (
            <ul className="mt-4 flex gap-3">
              {site.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} className="text-sm hover:text-gold" rel="noopener noreferrer" target="_blank">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-site flex-col gap-3 px-4 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © <CopyrightYear /> {site.legalEntity ?? site.name}
          </p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {legalNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-gold">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/contact" className="hover:text-gold">
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
