import { sectionPath, type Locale, type SectionKey } from "@/lib/i18n/segments";

export type ShellCopy = {
  readonly skipToContent: string;
  readonly homeLabel: string;
  readonly primaryNavigationLabel: string;
  readonly languageSwitcherLabel: string;
  readonly languageName: Readonly<Record<Locale, string>>;
  readonly unavailableNotice: string;
  readonly footerDescription: string;
};

type NavigationItem = {
  readonly section: Exclude<SectionKey, "projects" | "timeline">;
  readonly label: Readonly<Record<Locale, string>>;
};

export const SHELL_COPY: Readonly<Record<Locale, ShellCopy>> = {
  en: {
    skipToContent: "Skip to main content",
    homeLabel: "KUASAR home",
    primaryNavigationLabel: "Primary navigation",
    languageSwitcherLabel: "Choose language",
    languageName: { en: "English", tr: "Turkish" },
    unavailableNotice:
      "The equivalent page is not available in English. You are now on the English home page.",
    footerDescription: "Koç University Association of Space & Rocketry",
  },
  tr: {
    skipToContent: "Ana içeriğe geç",
    homeLabel: "KUASAR ana sayfa",
    primaryNavigationLabel: "Ana navigasyon",
    languageSwitcherLabel: "Dil seçin",
    languageName: { en: "İngilizce", tr: "Türkçe" },
    unavailableNotice:
      "Eşdeğer sayfa Türkçe olarak mevcut değil. Türkçe ana sayfaya yönlendirildiniz.",
    footerDescription: "Koç University Association of Space & Rocketry",
  },
};

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { section: "about", label: { en: "About", tr: "Hakkımızda" } },
  { section: "schedule", label: { en: "Schedule", tr: "Takvim" } },
  {
    section: "galactic-summit",
    label: { en: "Galactic Summit", tr: "Galactic Summit" },
  },
  { section: "missions", label: { en: "Missions", tr: "Görevler" } },
  { section: "events", label: { en: "Events", tr: "Etkinlikler" } },
  { section: "alumni", label: { en: "Alumni", tr: "Mezunlar" } },
  { section: "join", label: { en: "Join", tr: "Bize Katıl" } },
  { section: "news", label: { en: "News", tr: "Duyurular" } },
];

export function navigationFor(locale: Locale) {
  return NAVIGATION_ITEMS.map(({ section, label }) => ({
    href: sectionPath(section, locale),
    label: label[locale],
    section,
  }));
}
