import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SiteShell } from "@/components/shell/site-shell";
import { LOCALES, type Locale } from "@/lib/i18n/segments";

import { fontClassName } from "../fonts";
import "../globals.css";

// This is the ROOT layout (openspec/changes/root-document-lang). It lives under the
// [locale] segment so the server-rendered <html lang> is the route's locale — the
// Next.js 16 internationalization pattern (node_modules/next/dist/docs/01-app/
// 02-guides/internationalization.md, "Static Rendering"). There is deliberately no
// app/layout.tsx above it: that would own <html> and could only ever say one language.
// generateStaticParams + dynamicParams = false keep every route statically prerendered
// for exactly LOCALES; "/" never reaches a layout (next.config.ts redirects it to /en).
// A URL no locale route matches is served by app/global-not-found.tsx instead.

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

type LocaleLayoutProps = {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly locale: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

function isLocale(value: string): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={fontClassName}>
      <body className="min-h-full flex flex-col">
        <SiteShell locale={locale}>{children}</SiteShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
