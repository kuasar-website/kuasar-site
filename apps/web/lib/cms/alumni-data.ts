import type { Locale } from "../i18n/segments.ts";
import { toMediaImage, type MediaImageData } from "../media/image.ts";
import { strapiRead } from "../strapi/content-request.ts";
import { groupAndOrderAlumni, mapAlumnus, type PublicAlumni, type SubTeam } from "./alumni.ts";

/** Equals `CACHE_TAGS.alumni` in lib/strapi/registry.ts (asserted in alumni-data.test.ts). */
export const ALUMNI_CACHE_TAG = "alumni-directory";

export type AlumniCard = {
  readonly id: string;
  readonly name: string;
  readonly yearJoined: number | null;
  readonly yearLeft: number | null;
  readonly subTeam: SubTeam | null;
  readonly roleHeld: string | null;
  /** The locale `roleHeld` is actually in: `en` on /tr when Turkish is missing. */
  readonly contentLocale: Locale;
  /** Consent-gated by `mapAlumnus`; always null while the consent fields stay private. */
  readonly photo: MediaImageData | null;
  /** Only an HTTPS linkedin.com URL; anything else is dropped, never rendered. */
  readonly linkedinUrl: string | null;
};
export type AlumniCardGroup = { readonly yearLeft: number | null; readonly members: readonly AlumniCard[] };

export type AlumniOptions = { origin: string; token?: string; fetcher?: typeof fetch };

type Row = Record<string, unknown>;
const CONSENT_KEYS = ["consentRecordedAt", "consentSource"] as const;
const fail = (context: string, message: string): never => {
  throw new Error(`[alumni] ${context}: ${message}. See docs/ops/cms-runbook.md`);
};
function object(value: unknown, context: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(context, "expected an object");
  return value as Row;
}

/** An HTTPS link to linkedin.com (any subdomain), without credentials, or null. Never throws. */
export function safeLinkedInUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const linkedin = host === "linkedin.com" || host.endsWith(".linkedin.com");
    return url.protocol === "https:" && linkedin && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Published alumni in one locale, every page. PUBLISHED-ONLY, with no Draft Mode branch:
 * Alumni preview is off (registry `preview: false`) and the preview token is never scoped to
 * Alumni (runbook step 7).
 */
async function locale(locale: Locale, options: AlumniOptions): Promise<PublicAlumni[]> {
  const read = strapiRead(ALUMNI_CACHE_TAG, { token: options.token });
  const result: PublicAlumni[] = [];
  const seen = new Set<string>();
  for (let page = 1, last = 1; page <= last; page++) {
    const url = new URL("/api/alumni", options.origin);
    url.searchParams.set("locale", locale);
    url.searchParams.set("status", read.status);
    url.searchParams.set("sort[0]", "documentId:asc");
    url.searchParams.set("pagination[page]", String(page));
    url.searchParams.set("pagination[pageSize]", "100");
    url.searchParams.set("populate[photo][populate][image]", "true");
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, read.init);
    } catch {
      return fail(`alumni/${locale}`, "Strapi unreachable");
    }
    if (!response.ok) return fail(`alumni/${locale}`, `Strapi HTTP ${response.status}`);
    const body = object(await response.json(), "alumni");
    if (!Array.isArray(body.data)) return fail("alumni", "missing data array");
    const pagination = object(object(body.meta, "alumni").pagination, "alumni");
    if (!Number.isInteger(pagination.pageCount) || (pagination.pageCount as number) < 0 || pagination.page !== page) {
      return fail("alumni", "invalid pagination");
    }
    last = pagination.pageCount as number;
    if (page > 1 && !body.data.length && page <= last) return fail("alumni", "empty page before pagination ended");
    for (const value of body.data) {
      const row = object(value, "alumni");
      // Privacy canary: the consent-audit fields are `private` in the CMS schema and must
      // never come back from the Content API. If they do, the schema regressed. Fail the
      // build loudly rather than quietly relying on the mapper to hide them.
      const exposed = CONSENT_KEYS.filter((key) => key in row);
      if (exposed.length) {
        return fail("alumni", `the Content API exposed ${exposed.join(", ")}. Mark them "private" in the alumnus schema (KVKK, ADR 0002)`);
      }
      // Defence in depth: a row without publishedAt is a draft and never public.
      if (!row.publishedAt) continue;
      if (row.locale !== locale) return fail("alumni", "unexpected locale");
      const entry = mapAlumnus(row);
      if (seen.has(entry.documentId)) return fail("alumni", `duplicate document ${entry.documentId} across pages`);
      seen.add(entry.documentId);
      result.push(entry);
    }
  }
  return result;
}

/**
 * Build/revalidation only; the caller is a static Server Component. On /tr, each person
 * uses their Turkish record (for the localized `roleHeld`) or, silently, the English one.
 */
export async function fetchAlumniData(requested: Locale, options: AlumniOptions): Promise<AlumniCardGroup[]> {
  const [english, turkish] = await Promise.all([
    locale("en", options),
    requested === "tr" ? locale("tr", options) : Promise.resolve([]),
  ]);
  const selected = new Map<string, PublicAlumni>(english.map((entry) => [entry.documentId, entry]));
  for (const entry of turkish) selected.set(entry.documentId, entry);
  return groupAndOrderAlumni([...selected.values()]).map((group) => ({
    yearLeft: group.yearLeft,
    members: group.members.map((entry) => ({
      id: entry.documentId,
      name: entry.name,
      yearJoined: entry.yearJoined,
      yearLeft: entry.yearLeft,
      subTeam: entry.subTeam,
      roleHeld: entry.roleHeld,
      contentLocale: entry.locale,
      photo: toMediaImage(entry.photo, requested, { collection: "alumni", entry: entry.documentId, field: "photo" }),
      linkedinUrl: safeLinkedInUrl(entry.linkedinUrl),
    })),
  }));
}
