import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SiteShell } from "@/components/shell/site-shell";
import { LOCALES, type Locale } from "@/lib/i18n/segments";

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

  return <SiteShell locale={locale}>{children}</SiteShell>;
}
