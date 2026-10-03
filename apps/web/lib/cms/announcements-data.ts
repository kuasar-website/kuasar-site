import type { Locale } from "../i18n/segments.ts";
import { toMediaImage, type MediaImageData } from "../media/image.ts";
import { strapiRead } from "../strapi/content-request.ts";
import { parseISO } from "../time/date.ts";
import {
  mapAnnouncement,
  orderAnnouncements,
  selectAnnouncementLocale,
  type AnnouncementLocaleContent,
  type AnnouncementLocaleVariants,
} from "./announcements.ts";

/** Equals `CACHE_TAGS.announcements` in lib/strapi/registry.ts (asserted in registry.test.ts). */
export const NEWS_CACHE_TAG = "announcements";

export type NewsItem = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly body: string | null;
  readonly pinned: boolean;
  readonly publishedAt: string;
  /** The locale the text is actually in: `en` on /tr when Turkish is missing. */
  readonly contentLocale: Locale;
  readonly coverImage: MediaImageData | null;
};

export type NewsOptions = { origin: string; token?: string; fetcher?: typeof fetch };

type Row = Record<string, unknown>;
const fail = (context: string, message: string): never => {
  throw new Error(`[news] ${context}: ${message}. See docs/ops/cms-runbook.md`);
};
function object(value: unknown, context: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(context, "expected an object");
  return value as Row;
}

/**
 * Published announcements in one locale, every page. Deliberately PUBLISHED-ONLY, with no
 * Draft Mode branch: Announcement preview is not enabled (registry `preview: false`), and
 * the server-only preview token is not scoped to it, so an editor's Draft Mode cookie from
 * another section's preview must still see published News, never an error or a draft.
 */
async function locale(locale: Locale, options: NewsOptions): Promise<AnnouncementLocaleContent[]> {
  const read = strapiRead(NEWS_CACHE_TAG, { token: options.token });
  const result: AnnouncementLocaleContent[] = [];
  const seen = new Set<string>();
  for (let page = 1, last = 1; page <= last; page++) {
    const url = new URL("/api/announcements", options.origin);
    url.searchParams.set("locale", locale);
    url.searchParams.set("status", read.status);
    url.searchParams.set("sort[0]", "documentId:asc");
    url.searchParams.set("pagination[page]", String(page));
    url.searchParams.set("pagination[pageSize]", "100");
    url.searchParams.set("populate[coverImage][populate][image]", "true");
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, read.init);
    } catch {
      return fail(`announcements/${locale}`, "Strapi unreachable");
    }
    if (!response.ok) return fail(`announcements/${locale}`, `Strapi HTTP ${response.status}`);
    const body = object(await response.json(), "announcements");
    if (!Array.isArray(body.data)) return fail("announcements", "missing data array");
    const pagination = object(object(body.meta, "announcements").pagination, "announcements");
    if (!Number.isInteger(pagination.pageCount) || (pagination.pageCount as number) < 0 || pagination.page !== page) {
      return fail("announcements", "invalid pagination");
    }
    last = pagination.pageCount as number;
    if (page > 1 && !body.data.length && page <= last) return fail("announcements", "empty page before pagination ended");
    for (const value of body.data) {
      const row = object(value, "announcements");
      // Defence in depth: a row without publishedAt is a draft and never public.
      if (!row.publishedAt) continue;
      if (row.locale !== locale) return fail("announcements", "unexpected locale");
      const entry = mapAnnouncement(row);
      if (parseISO(entry.publishedAt) === null) return fail(`announcements/${entry.documentId}`, "invalid publishedAt");
      if (seen.has(entry.documentId)) return fail("announcements", `duplicate document ${entry.documentId} across pages`);
      seen.add(entry.documentId);
      result.push(entry);
    }
  }
  return result;
}

/**
 * Build/revalidation only; the caller is a static Server Component. On /tr, each document
 * shows its Turkish variant or, silently, its English one (design/i18n.md, CMS content).
 */
export async function fetchNewsData(requested: Locale, options: NewsOptions): Promise<NewsItem[]> {
  const [english, turkish] = await Promise.all([
    locale("en", options),
    requested === "tr" ? locale("tr", options) : Promise.resolve([]),
  ]);
  const variants = new Map<string, { en?: AnnouncementLocaleContent; tr?: AnnouncementLocaleContent }>();
  for (const entry of english) variants.set(entry.documentId, { en: entry });
  for (const entry of turkish) variants.set(entry.documentId, { ...variants.get(entry.documentId), tr: entry });
  const selected = [...variants].map(([id, pair]) =>
    selectAnnouncementLocale(id, requested, pair as AnnouncementLocaleVariants));
  return orderAnnouncements(selected).map((entry) => ({
    id: entry.documentId,
    slug: entry.slug,
    title: entry.title,
    excerpt: entry.excerpt,
    body: entry.body,
    pinned: entry.pinned,
    publishedAt: entry.publishedAt,
    contentLocale: entry.locale,
    coverImage: toMediaImage(entry.coverImage, requested, {
      collection: "announcements", entry: entry.documentId, field: "coverImage",
    }),
  }));
}
