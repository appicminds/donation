import type { Metadata, Viewport } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { site } from "@/content/site";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: `${site.name} | Forever Comfort`,
    template: `%s | ${site.name}`,
  },
  description:
    "A memorial honoring the life and legacy of Comfort Kwaw. Remember her, share a memory, and honor her memory.",
};

export const viewport: Viewport = {
  themeColor: "#260B35",
};

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
