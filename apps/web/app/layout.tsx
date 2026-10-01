import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin-ext"],
  display: "swap",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Unlike app/robots.ts and app/sitemap.ts (which only ever string-interpolate
 * this placeholder), `metadataBase` requires an actual `URL` instance, and
 * `new URL("https://<DOMAIN>")` throws — `<`/`>` are not legal URL
 * characters. So this stays `undefined` (Next's own documented fallback:
 * relative URLs resolve against http://localhost:3000, with a console
 * warning) until the real domain is registered and `NEXT_PUBLIC_SITE_URL` is
 * set (docs/ops/cms-runbook.md, step 1) — never a fabricated placeholder
 * domain.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/**
 * Site-wide fallback metadata only. `title.template` is the identity
 * template ("%s", no prefix/suffix) rather than a real prefix/suffix
 * template, deliberately: Next's type for `title.default` requires a
 * `template` alongside it, but a real template (e.g. "%s | KUASAR") would
 * apply to every child route's own string title (Next.js metadata docs,
 * "title.template") — and about-and-join's pageMetadata() already appends
 * " | KUASAR" itself, so a real template here would double-suffix every
 * existing and future route's title. Confirmed against the installed
 * Next.js 16.3.1 resolver (node_modules/next/dist/lib/metadata/resolvers/
 * resolve-title.js): an identity template only affects routes that define
 * no title of their own, via `title.default`, and otherwise passes a
 * child's own string title through unchanged. `metadataBase` is set so the
 * relative canonical/hreflang URLs locale-routing's sectionAlternates()
 * already emits resolve against the real site origin instead of Next's
 * http://localhost:3000 default; it does not add or override any route's
 * own metadata.
 */
export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: {
    default: "KUASAR",
    template: "%s",
  },
  description:
    "KUASAR is Koç University's student rocketry team, building and flying rockets at TEKNOFEST and the Spaceport America Cup.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
