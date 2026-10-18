import type { Locale } from "../../lib/i18n/segments";

/**
 * Every fixed Project Platform string (openspec/changes/project-platform-page). The visible
 * name is the full product name in both locales, as in the navigation. Editors control the
 * intro, the functions, the projects and the WhatsApp label; nothing else.
 */
export type ProjectPlatformCopy = {
  readonly heading: string;
  /** The WhatsApp button text when the editor left `whatsappLabel` empty. */
  readonly whatsappDefault: string;
  readonly newTab: string;
  readonly functions: string;
  readonly current: string;
  readonly past: string;
  readonly currentEmpty: string;
  readonly pastEmpty: string;
  readonly apply: string;
  readonly applyName: (title: string) => string;
};

export const PROJECT_PLATFORM_COPY: Readonly<Record<Locale, ProjectPlatformCopy>> = {
  en: {
    heading: "Project Platform",
    whatsappDefault: "Join the Project Platform WhatsApp group",
    newTab: "(opens in a new tab)",
    functions: "Platform functions",
    current: "Current projects",
    past: "Past projects",
    currentEmpty: "There are no current projects right now.",
    pastEmpty: "There are no past projects yet.",
    apply: "Apply",
    applyName: (title) => `Apply to ${title} (opens in a new tab)`,
  },
  tr: {
    heading: "Proje Platformu",
    whatsappDefault: "Proje Platformu WhatsApp grubuna katıl",
    newTab: "(yeni sekmede açılır)",
    functions: "Platform işlevleri",
    current: "Güncel projeler",
    past: "Geçmiş projeler",
    currentEmpty: "Şu anda güncel proje yok.",
    pastEmpty: "Henüz geçmiş proje yok.",
    apply: "Başvur",
    applyName: (title) => `${title} projesine başvur (yeni sekmede açılır)`,
  },
};
