import { notFound } from "next/navigation";

import type { Locale } from "@/lib/i18n/segments";

export type LocalePageProps = {
  readonly params: Promise<{ readonly locale: string }>;
};

export async function requireLocale(
  params: LocalePageProps["params"],
  expected: Locale,
): Promise<Locale> {
  const { locale } = await params;

  if (locale !== expected) {
    notFound();
  }

  return expected;
}
