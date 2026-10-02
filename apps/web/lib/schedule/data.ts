import type { Locale } from "../i18n/segments.ts";
import { parseISO } from "../time/date.ts";

/**
 * Build/revalidation-time loader for published Schedule Events
 * (apps/cms/src/api/schedule-event). Mirrors lib/events/data.ts deliberately
 * rather than sharing code with it — see openspec/changes/schedule-calendar
 * design.md D6. Consumes exactly the schema's fields and adds none.
 *
 * Validation is strict (design.md D7): every contract violation, including an
 * `endsAt` earlier than `startsAt`, fails the build with the documentId and the
 * field. Nothing is skipped and nothing renders degraded.
 */
export const SCHEDULE_CACHE_TAG = "schedule-calendar";
export const SCHEDULE_EVENT_TYPES = ["talk", "screening", "summit", "workshop", "other"] as const;
export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number];
export type ScheduleEvent = {
  id: string;
  type: ScheduleEventType;
  /** Raw ISO strings exactly as Strapi returned them. */
  startsAt: string;
  endsAt: string | null;
  title: string;
  location: string | null;
  description: string | null;
  url: string | null;
  /** The locale the text fields are actually in (English fallback on /tr). */
  contentLocale: Locale;
};
export type ScheduleOptions = { origin: string; token?: string; fetcher?: typeof fetch };
type Row = Record<string, unknown>;

const fail = (context: string, message: string): never => {
  throw new Error(`[schedule] Strapi Schedule Event ${context}: ${message}. See docs/ops/cms-runbook.md`);
};
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
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return fail(context, "expected an HTTP(S) URL without credentials");
  return url.href;
}

async function published(locale: Locale, options: ScheduleOptions): Promise<Row[]> {
  const context = `collection (${locale})`;
  const result: Row[] = [];
  const seen = new Set<string>();
  for (let page = 1, last = 1; page <= last; page++) {
    const url = new URL("/api/schedule-events", options.origin);
    url.searchParams.set("locale", locale);
    url.searchParams.set("status", "published");
    url.searchParams.set("sort[0]", "documentId:asc");
    url.searchParams.set("pagination[page]", String(page));
    url.searchParams.set("pagination[pageSize]", "100");
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, {
        cache: "force-cache", next: { tags: [SCHEDULE_CACHE_TAG], revalidate: false },
        ...(options.token ? { headers: { Authorization: `Bearer ${options.token}` } } : {}),
      });
    } catch { return fail(context, "Strapi unreachable"); }
    if (!response.ok) return fail(context, `Strapi HTTP ${response.status}`);
    const body = object(await response.json(), context);
    if (!Array.isArray(body.data)) return fail(context, "missing data array");
    const pagination = object(object(body.meta, context).pagination, context);
    if (!Number.isInteger(pagination.pageCount) || (pagination.pageCount as number) < 0 || pagination.page !== page) return fail(context, "invalid pagination");
    last = pagination.pageCount as number;
    if (page > 1 && !body.data.length && page <= last) return fail(context, "empty page before pagination ended");
    for (const value of body.data) {
      const row = object(value, context);
      // Defence in depth: never display an accidental draft returned by a proxy/mock.
      if (!row.publishedAt) continue;
      if (row.locale !== locale) return fail(context, "unexpected locale");
      const id = text(row.documentId, context, true)!;
      if (seen.has(id)) return fail(context, `duplicate document ${id} across pages`);
      seen.add(id); result.push(row);
    }
  }
  return result;
}

/** Validates one row; every failure names the documentId, locale and field. */
export function toScheduleEvent(row: Row): ScheduleEvent {
  const id = text(row.documentId, "row", true)!;
  const at = (field: string) => `${id} (${String(row.locale)}) field "${field}"`;
  const startsAt = text(row.startsAt, at("startsAt"), true)!;
  const start = parseISO(startsAt);
  if (start === null) return fail(at("startsAt"), "expected an ISO datetime with an offset");
  const endsAt = text(row.endsAt, at("endsAt"));
  if (endsAt !== null) {
    const end = parseISO(endsAt);
    if (end === null) return fail(at("endsAt"), "expected an ISO datetime with an offset");
    if (end < start) return fail(`${id} (${String(row.locale)}) fields "endsAt"/"startsAt"`, `endsAt ${endsAt} is earlier than startsAt ${startsAt}; fix the end time in the Strapi admin`);
  }
  if (!SCHEDULE_EVENT_TYPES.includes(row.type as ScheduleEventType)) return fail(at("type"), `unknown type ${JSON.stringify(row.type)}`);
  return {
    id, startsAt, endsAt, type: row.type as ScheduleEventType,
    title: text(row.title, at("title"), true)!,
    location: text(row.location, at("location")),
    description: text(row.description, at("description")),
    url: link(row.url, at("url")),
    contentLocale: row.locale as Locale,
  };
}

/** Stable chronological order: by start, then source (documentId) order. */
function chronological(events: ScheduleEvent[]): ScheduleEvent[] {
  return events
    .map((event, index) => ({ event, index, start: parseISO(event.startsAt)! }))
    .sort((a, b) => a.start - b.start || a.index - b.index)
    .map(({ event }) => event);
}

/** Build/revalidation only. The caller is a static Server Component, never a client. */
export async function fetchScheduleData(locale: Locale, options: ScheduleOptions): Promise<ScheduleEvent[]> {
  const [english, turkish] = await Promise.all([
    published("en", options), locale === "tr" ? published("tr", options) : [],
  ]);
  // Turkish publications replace English ones by documentId; English-only
  // documents fall back silently on /tr (design/i18n.md, CMS content).
  const rows = new Map(english.map((row) => [row.documentId, row]));
  for (const row of turkish) rows.set(row.documentId, row);
  return chronological([...rows.values()].map(toScheduleEvent));
}
