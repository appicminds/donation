import { ButtonLink } from "@/components/ui/Button";

/** PRD §8.4: 404 copy. Shared by the site's not-found page and the global 404. */
export function NotFoundContent() {
  return (
    <section className="bg-hero text-white">
      <div className="mx-auto flex max-w-site flex-col items-center px-4 py-28 text-center sm:px-6 lg:px-8">
        <p className="eyebrow text-gold">404</p>
        <h1 className="mt-4 text-5xl sm:text-6xl">Page not found</h1>
        <p className="mt-5 max-w-md text-lg text-white/85">
          This page could not be found. Please return to the memorial homepage.
        </p>
        <ButtonLink href="/" className="mt-10" arrow>
          Return to the Memorial
        </ButtonLink>
      </div>
    </section>
  );
}
