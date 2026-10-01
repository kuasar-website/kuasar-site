import type { Locale } from "../i18n/segments.ts";
import { toMediaImage, type MediaImageData, type StrapiImage } from "../media/image.ts";
import { parseISO } from "../time/date.ts";

export const EVENTS_CACHE_TAG = "events-showcase";
type Collection = "stellar-talks" | "nebula-nights";
type Row = Record<string, unknown>;
type Common = { id: string; title: string; date: string | null; contentLocale: Locale };
export type TalkData = Common & { eventNumber: number; speakerName: string; speakerPortrait: MediaImageData | null; insight: string | null; watchUrl: string | null; readUrl: string | null };
export type NightData = Common & { description: string | null; filmTitle: string | null; photos: { id: string; image: MediaImageData }[] };
export type EventsData = { talks: TalkData[]; nights: NightData[] };
export type EventsOptions = { origin: string; token?: string; fetcher?: typeof fetch };
const fail = (context: string, message: string): never => { throw new Error(`[events] ${context}: ${message}. See docs/ops/cms-runbook.md`); };
function object(value: unknown, context: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(context, "expected an object");
  return value as Row;
}
function text(value: unknown, context: string, required = false): string | null {
  if (value == null || value === "") return required ? fail(context, "required text is missing") : null;
  if (typeof value !== "string") return fail(context, "expected text");
  const result = value.trim();
  if (!result && required) return fail(context, "required text is empty");
  return result || null;
}
function link(value: unknown, context: string) {
  const result = text(value, context);
  if (!result) return null;
  let url: URL;
  try { url = new URL(result); } catch { return fail(context, "expected an absolute HTTP(S) URL"); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return fail(context, "expected an HTTP(S) URL without credentials");
  return url.href;
}

async function collection(name: Collection, locale: Locale, options: EventsOptions): Promise<Row[]> {
  const result: Row[] = [];
  const seen = new Set<string>();
  for (let page = 1, last = 1; page <= last; page++) {
    const url = new URL(`/api/${name}`, options.origin);
    url.searchParams.set('locale', locale);
    url.searchParams.set('status', 'published');
    url.searchParams.set('sort[0]', 'documentId:asc');
    url.searchParams.set('pagination[page]', String(page));
    url.searchParams.set('pagination[pageSize]', '100');
    url.searchParams.set('populate[' + (name === 'stellar-talks' ? 'speakerPortrait' : 'photos') + '][populate][image]', 'true');
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, {
        cache: 'force-cache', next: { tags: [EVENTS_CACHE_TAG], revalidate: false },
        ...(options.token ? { headers: { Authorization: `Bearer ${options.token}` } } : {}),
      });
    } catch { return fail(`${name}/${locale}`, 'Strapi unreachable'); }
    if (!response.ok) return fail(`${name}/${locale}`, `Strapi HTTP ${response.status}`);
    const body = object(await response.json(), name);
    if (!Array.isArray(body.data)) return fail(name, 'missing data array');
    const meta = object(body.meta, name);
    const pagination = object(meta.pagination, name);
    if (!Number.isInteger(pagination.pageCount) || (pagination.pageCount as number) < 0 || pagination.page !== page) return fail(name, 'invalid pagination');
    last = pagination.pageCount as number;
    if (page > 1 && !body.data.length && page <= last) return fail(name, 'empty page before pagination ended');
    for (const value of body.data) {
      const row = object(value, name);
      // Defence in depth: never display an accidental draft returned by a proxy/mock.
      if (!row.publishedAt) continue;
      if (row.locale !== locale) return fail(name, 'unexpected locale');
      const id = text(row.documentId, name, true)!;
      if (seen.has(id)) return fail(name, `duplicate document ${id} across pages`);
      seen.add(id); result.push(row);
    }
  }
  return result;
}

function localized(english: Row[], turkish: Row[], locale: Locale): Row[] {
  if (locale === 'en') return english;
  const rows = new Map(english.map(row => [row.documentId, row]));
  for (const row of turkish) rows.set(row.documentId, row);
  return [...rows.values()];
}
function common(row: Row, name: Collection): Common {
  const id = text(row.documentId, name, true)!;
  const date = text(row.date, `${name}/${id}/date`);
  if (date && parseISO(date) === null) return fail(`${name}/${id}`, 'invalid ISO date');
  return { id, title: text(row.title, `${name}/${id}/title`, true)!, date, contentLocale: row.locale as Locale };
}
function image(value: unknown, locale: Locale, collection: Collection, entry: string, field: string) {
  return toMediaImage(value == null ? null : object(value, `${collection}/${entry}/${field}`) as StrapiImage, locale, { collection, entry, field });
}

/** Build/revalidation only. The caller is a static Server Component, never a client. */
export async function fetchEventsData(locale: Locale, options: EventsOptions): Promise<EventsData> {
  const [talksEn, nightsEn, talksTr, nightsTr] = await Promise.all([
    collection('stellar-talks', 'en', options), collection('nebula-nights', 'en', options),
    locale === 'tr' ? collection('stellar-talks', 'tr', options) : [],
    locale === 'tr' ? collection('nebula-nights', 'tr', options) : [],
  ]);
  return {
    talks: localized(talksEn, talksTr, locale).map(row => {
      const base = common(row, 'stellar-talks');
      if (!Number.isInteger(row.eventNumber)) return fail(base.id, 'eventNumber must be an integer');
      return { ...base, eventNumber: row.eventNumber as number,
        speakerName: text(row.speakerName, `${base.id}/speakerName`, true)!,
        speakerPortrait: image(row.speakerPortrait, locale, 'stellar-talks', base.id, 'speakerPortrait'),
        insight: text(row.insight, `${base.id}/insight`), watchUrl: link(row.watchUrl, `${base.id}/watchUrl`), readUrl: link(row.readUrl, `${base.id}/readUrl`),
      };
    }),
    nights: localized(nightsEn, nightsTr, locale).map(row => {
      const base = common(row, 'nebula-nights');
      if (!Array.isArray(row.photos) || !row.photos.length) return fail(base.id, 'Nebula Night requires photos');
      return { ...base, description: text(row.description, `${base.id}/description`), filmTitle: text(row.filmTitle, `${base.id}/filmTitle`),
        photos: row.photos.map((value, i) => {
          const photo = image(value, locale, 'nebula-nights', base.id, `photos[${i}]`);
          if (!photo) return fail(base.id, `photos[${i}] has no image`);
          return { id: `${base.id}-photo-${i}`, image: photo };
        }),
      };
    }),
  };
}
