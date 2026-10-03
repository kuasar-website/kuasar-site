import type { Locale } from "../../lib/i18n/segments";

export type NewsCopy = {
  readonly heading: string;
  readonly empty: string;
  readonly pinned: string;
  readonly published: string;
};

export const NEWS_COPY: Readonly<Record<Locale, NewsCopy>> = {
  en: {
    heading: "News",
    empty: "No news yet. Team announcements will appear here.",
    pinned: "Pinned",
    published: "Published",
  },
  tr: {
    heading: "Duyurular",
    empty: "Henüz duyuru yok. Takım duyuruları burada yayınlanacak.",
    pinned: "Sabitlendi",
    published: "Yayınlanma",
  },
};
