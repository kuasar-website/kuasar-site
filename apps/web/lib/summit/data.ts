import type { Locale } from "../i18n/segments.ts";
import { toMediaImage, type MediaImageData, type StrapiImage } from "../media/image.ts";
import { MEDIA_HOST } from "../media/origin.ts";
import { parseISO } from "../time/date.ts";
import { strapiRead } from "../strapi/content-request.ts";

/**
 * Build/revalidation-time loader for published Galactic Summit editions
 * (apps/cms/src/api/galactic-summit). Mirrors lib/events/data.ts — see
 * openspec/changes/galactic-summit/design.md D2, D5, D6 and D9.
 *
 * - Strict: every contract violation fails the build, naming the document and
 *   field. Nothing is skipped and nothing renders degraded.
 * - Exactly one published edition is current whenever any is published.
 * - `sponsors` is deliberately never populated or read: the sponsors showcase is
 *   held until trademark permission is recorded per sponsor.
 */
export const SUMMIT_CACHE_TAG = "galactic-summit";
export const ACCENT_TOKENS = ["aurora", "ion", "violet", "ember"] as const;
export const HERO_TREATMENTS = ["still", "wash", "gradient"] as const;
export type AccentToken = (typeof ACCENT_TOKENS)[number];
export type HeroTreatment = (typeof HERO_TREATMENTS)[number];

/** Populate entries verified in PR #34 (scripts/content-snapshot), minus `sponsors`. */
export const SUMMIT_POPULATE = [
  ["populate[programme]", "true"],
  ["populate[speakers][populate][portrait][populate]", "image"],
  ["populate[photos][populate]", "image"],
  ["populate[backgroundImage][populate]", "image"],
  ["populate[sponsorshipPdf]", "true"],
] as const;

export type ProgrammeItem = { time: string | null; title: string | null; description: string | null };
export type Speaker = { name: string; role: string | null; portrait: MediaImageData | null };
export type SummitPhoto = { id: string; image: MediaImageData };
export type SummitEdition = {
  id: string;
  year: number;
  /** Raw ISO string exactly as Strapi returned it. */
  date: string | null;
  location: string | null;
  isCurrent: boolean;
  purpose: string | null;
  programme: ProgrammeItem[];
  speakers: Speaker[];
  photos: SummitPhoto[];
  contactAddress: string | null;
  /** A validated https URL on the media host, or null. Never an image-resizer URL. */
  sponsorshipPdf: string | null;
  registrationUrl: string | null;
  accentToken: AccentToken;
  heroTreatment: HeroTreatment;
  backgroundImage: MediaImageData | null;
  /** The locale the localized text (purpose, programme, contactAddress) is actually in. */
  contentLocale: Locale;
};
export type SummitData = { current: SummitEdition | null; others: SummitEdition[] };
export type SummitOptions = { origin: string; token?: string; fetcher?: typeof fetch; /** Draft Mode only (publish-integration). */ preview?: boolean; previewToken?: string };
type Row = Record<string, unknown>;

const fail = (context: string, message: string): never => {
  throw new Error(`[summit] Strapi Galactic Summit ${context}: ${message}. See docs/ops/cms-runbook.md`);
};
function object(value: unknown, context: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(context, "expected an object");
  return value as Row;
}
function list(value: unknown, context: string): unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value)) return fail(context, "expected a list");
  return value;
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

/**
 * The sponsorship PDF is a plain file link (design.md D5): https on the media
 * host, no credentials, a `.pdf` path and the PDF MIME type. No development
 * pass-through and never the image resizer.
 */
export function toSponsorshipPdf(value: unknown, context: string): string | null {
  if (value == null) return null;
  const file = object(value, context);
  const raw = text(file.url, context, true)!;
  let url: URL;
  try { url = new URL(raw); } catch { return fail(context, `"${raw}" is not an absolute URL on https://${MEDIA_HOST}`); }
  if (url.protocol !== "https:" || url.host !== MEDIA_HOST || url.username || url.password) {
    return fail(context, `"${raw}" is not on https://${MEDIA_HOST}; PDFs must never be served from r2.dev, the R2 S3 endpoint or the CMS`);
  }
  // The file itself, never Cloudflare's image-resizer path (/cdn-cgi/image/…).
  if (url.pathname.toLowerCase().startsWith("/cdn-cgi/")) return fail(context, `"${raw}" is an image-resizer URL; link the PDF file itself`);
  if (!url.pathname.toLowerCase().endsWith(".pdf")) return fail(context, `"${raw}" is not a .pdf file`);
  if (file.mime !== "application/pdf") return fail(context, `MIME type ${JSON.stringify(file.mime)} is not application/pdf`);
  return url.href;
}

async function published(locale: Locale, options: SummitOptions): Promise<Row[]> {
  const context = `collection (${locale})`;
  const result: Row[] = [];
  const seen = new Set<string>();
  const read = strapiRead(SUMMIT_CACHE_TAG, options);
  for (let page = 1, last = 1; page <= last; page++) {
    const url = new URL("/api/galactic-summits", options.origin);
    url.searchParams.set("locale", locale);
    url.searchParams.set("status", read.status);
    url.searchParams.set("sort[0]", "documentId:asc");
    url.searchParams.set("pagination[page]", String(page));
    url.searchParams.set("pagination[pageSize]", "100");
    for (const [key, value] of SUMMIT_POPULATE) url.searchParams.set(key, value);
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, read.init);
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
      // Defence in depth: never display an accidental draft on the public path. Draft
      // versions (no publishedAt) are expected only in an authenticated Draft Mode preview.
      if (!row.publishedAt && read.status === "published") continue;
      if (row.locale !== locale) return fail(context, "unexpected locale");
      const id = text(row.documentId, context, true)!;
      if (seen.has(id)) return fail(context, `duplicate document ${id} across pages`);
      seen.add(id); result.push(row);
    }
  }
  return result;
}

/** Validates one edition. Images use the page locale for alt text, as events-showcase does. */
export function toSummitEdition(row: Row, pageLocale: Locale): SummitEdition {
  const id = text(row.documentId, "row", true)!;
  const at = (field: string) => `${id} (${String(row.locale)}) field "${field}"`;
  const image = (value: unknown, field: string) => toMediaImage(
    value == null ? null : object(value, at(field)) as StrapiImage, pageLocale,
    { collection: "galactic-summits", entry: id, field });
  if (!Number.isInteger(row.year)) return fail(at("year"), "expected an integer year");
  if (typeof row.isCurrent !== "boolean") return fail(at("isCurrent"), "expected true or false");
  const date = text(row.date, at("date"));
  // The spec requires an offset-bearing datetime. lib/time's parseISO also accepts a bare
  // calendar day (YYYY-MM-DD) for other consumers, and its only other accepted shape is an
  // instant with "T" and Z/±HH:MM — so "parses and contains T" is exactly that shape.
  if (date !== null && (parseISO(date) === null || !date.includes("T"))) return fail(at("date"), "expected an ISO datetime with an offset");
  if (!ACCENT_TOKENS.includes(row.accentToken as AccentToken)) return fail(at("accentToken"), `unknown value ${JSON.stringify(row.accentToken)}`);
  if (!HERO_TREATMENTS.includes(row.heroTreatment as HeroTreatment)) return fail(at("heroTreatment"), `unknown value ${JSON.stringify(row.heroTreatment)}`);
  return {
    id, year: row.year as number, date, isCurrent: row.isCurrent,
    location: text(row.location, at("location")),
    purpose: text(row.purpose, at("purpose")),
    contactAddress: text(row.contactAddress, at("contactAddress")),
    programme: list(row.programme, at("programme")).map((value, i) => {
      const item = object(value, at(`programme[${i}]`));
      const result = {
        time: text(item.time, at(`programme[${i}].time`)),
        title: text(item.title, at(`programme[${i}].title`)),
        description: text(item.description, at(`programme[${i}].description`)),
      };
      if (!result.time && !result.title && !result.description) return fail(at(`programme[${i}]`), "item has no time, title or description");
      return result;
    }),
    speakers: list(row.speakers, at("speakers")).map((value, i) => {
      const speaker = object(value, at(`speakers[${i}]`));
      return {
        name: text(speaker.speakerName, at(`speakers[${i}].speakerName`), true)!,
        role: text(speaker.role, at(`speakers[${i}].role`)),
        portrait: image(speaker.portrait, `speakers[${i}].portrait`),
      };
    }),
    photos: list(row.photos, at("photos")).map((value, i) => {
      const photo = image(value, `photos[${i}]`);
      if (!photo) return fail(at(`photos[${i}]`), "photo has no image");
      return { id: `${id}-photo-${i}`, image: photo };
    }),
    sponsorshipPdf: toSponsorshipPdf(row.sponsorshipPdf, at("sponsorshipPdf")),
    registrationUrl: link(row.registrationUrl, at("registrationUrl")),
    accentToken: row.accentToken as AccentToken,
    heroTreatment: row.heroTreatment as HeroTreatment,
    backgroundImage: image(row.backgroundImage, "backgroundImage"),
    contentLocale: row.locale as Locale,
  };
}

/** Exactly one current edition whenever any is published (design.md D2). */
export function selectCurrent(editions: readonly SummitEdition[]): SummitData {
  const describe = (items: readonly SummitEdition[]) => items.map((e) => `${e.year} (${e.id})`).join(", ");
  const years = new Map<number, SummitEdition>();
  for (const edition of editions) {
    const clash = years.get(edition.year);
    if (clash) return fail(`${edition.id} field "year"`, `year ${edition.year} is also used by ${clash.id}`);
    years.set(edition.year, edition);
  }
  if (editions.length === 0) return { current: null, others: [] };
  const current = editions.filter((edition) => edition.isCurrent);
  if (current.length === 0) return fail(`field "isCurrent"`, `no published edition is current; published: ${describe(editions)}. Mark exactly one as current`);
  if (current.length > 1) return fail(`field "isCurrent"`, `more than one edition is current: ${describe(current)}. Mark exactly one as current`);
  const [edition] = current;
  if ((edition.heroTreatment === "still" || edition.heroTreatment === "wash") && !edition.backgroundImage) {
    return fail(`${edition.id} fields "heroTreatment"/"backgroundImage"`, `heroTreatment "${edition.heroTreatment}" needs a backgroundImage; add one or choose "gradient"`);
  }
  return { current: edition, others: editions.filter((e) => e !== edition).sort((a, b) => b.year - a.year) };
}

/** Build/revalidation only. The caller is a static Server Component, never a client. */
export async function fetchSummitData(locale: Locale, options: SummitOptions): Promise<SummitData> {
  const [english, turkish] = await Promise.all([
    published("en", options), locale === "tr" ? published("tr", options) : [],
  ]);
  // Turkish publications replace English ones by documentId; English-only
  // documents fall back silently on /tr (design/i18n.md, CMS content).
  const rows = new Map(english.map((row) => [row.documentId, row]));
  for (const row of turkish) rows.set(row.documentId, row);
  return selectCurrent([...rows.values()].map((row) => toSummitEdition(row, locale)));
}
