import type { Locale } from "../i18n/segments.ts";
import { toMediaImage, type MediaImageData } from "../media/image.ts";
import { strapiRead } from "../strapi/content-request.ts";
import {
  mapPlatformProject,
  mapProjectPlatform,
  orderPlatformProjects,
  projectYears,
  selectLocaleVariants,
  type PlatformFeature,
  type PlatformProjectLocaleContent,
  type ProjectPlatformLocaleContent,
} from "./project-platform.ts";

/** Equals `CACHE_TAGS.projectPlatform` in lib/strapi/registry.ts (asserted in registry.test.ts). */
export const PROJECT_PLATFORM_CACHE_TAG = "project-platform";

export type ProjectPlatformPage = {
  readonly intro: string;
  readonly whatsappUrl: string | null;
  /** The editor's label, or null for the page's default (components/project-platform/copy.ts). */
  readonly whatsappLabel: string | null;
  readonly features: readonly PlatformFeature[];
  /** The locale the text is actually in: `en` on /tr when Turkish is not published. */
  readonly contentLocale: Locale;
};

export type PlatformProjectCard = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** "2025" or "2024–2026"; plain text, no client time state. */
  readonly years: string;
  readonly startYear: number;
  readonly endYear: number | null;
  /** The locale the title and summary are actually in. */
  readonly contentLocale: Locale;
  readonly coverImage: MediaImageData | null;
  /** Only ever set on a current project; a past project never shows Apply. */
  readonly applicationUrl: string | null;
};

export type ProjectPlatformData = {
  /** Null when no Project Platform entry is published for this page (after the fallback). */
  readonly page: ProjectPlatformPage | null;
  readonly current: readonly PlatformProjectCard[];
  readonly past: readonly PlatformProjectCard[];
};

export type ProjectPlatformOptions = { origin: string; token?: string; fetcher?: typeof fetch };

type Row = Record<string, unknown>;
const fail = (context: string, message: string): never => {
  throw new Error(`[project-platform] ${context}: ${message}. See docs/ops/cms-runbook.md`);
};
function object(value: unknown, context: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(context, "expected an object");
  return value as Row;
}
async function json(response: Response, context: string): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return fail(context, "expected a JSON response");
  }
}

/**
 * The single type in one locale, or null when nothing is published there. Strapi 5 answers
 * that case with 404 `NotFoundError` (verified for the content snapshot, project-platform-cms
 * design D7); any other failure, 403 included, fails the build like every other loader.
 * PUBLISHED-ONLY, with no Draft Mode branch: preview is off for this type (registry).
 */
async function pageEntry(locale: Locale, options: ProjectPlatformOptions): Promise<ProjectPlatformLocaleContent | null> {
  const context = `project-platform/${locale}`;
  const read = strapiRead(PROJECT_PLATFORM_CACHE_TAG, { token: options.token });
  const url = new URL("/api/project-platform", options.origin);
  url.searchParams.set("locale", locale);
  url.searchParams.set("status", read.status);
  url.searchParams.set("populate[features]", "true");
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url, read.init);
  } catch {
    return fail(context, "Strapi unreachable");
  }
  if (response.status === 404) {
    const body = await response.json().catch(() => null) as { error?: { name?: unknown } } | null;
    if (body?.error?.name === "NotFoundError") return null;
    return fail(context, "Strapi HTTP 404 that is not a NotFoundError");
  }
  if (!response.ok) return fail(context, `Strapi HTTP ${response.status}`);
  const row = object(object(await json(response, context), context).data, `${context} data`);
  // Defence in depth: a row without publishedAt is a draft and never public.
  if (!row.publishedAt) return null;
  if (row.locale !== locale) return fail(context, "unexpected locale");
  return mapProjectPlatform(row);
}

/** Published Platform Projects in one locale, every page. PUBLISHED-ONLY, like `pageEntry`. */
async function projects(locale: Locale, options: ProjectPlatformOptions): Promise<PlatformProjectLocaleContent[]> {
  const context = `platform-projects/${locale}`;
  const read = strapiRead(PROJECT_PLATFORM_CACHE_TAG, { token: options.token });
  const result: PlatformProjectLocaleContent[] = [];
  const seen = new Set<string>();
  for (let page = 1, last = 1; page <= last; page++) {
    const url = new URL("/api/platform-projects", options.origin);
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
      return fail(context, "Strapi unreachable");
    }
    if (!response.ok) return fail(context, `Strapi HTTP ${response.status}`);
    const body = object(await json(response, context), context);
    if (!Array.isArray(body.data)) return fail(context, "missing data array");
    const pagination = object(object(body.meta, context).pagination, context);
    if (!Number.isInteger(pagination.pageCount) || (pagination.pageCount as number) < 0 || pagination.page !== page) {
      return fail(context, "invalid pagination");
    }
    last = pagination.pageCount as number;
    if (page > 1 && !body.data.length && page <= last) return fail(context, "empty page before pagination ended");
    for (const value of body.data) {
      const row = object(value, context);
      // Defence in depth: a row without publishedAt is a draft and never public.
      if (!row.publishedAt) continue;
      if (row.locale !== locale) return fail(context, "unexpected locale");
      const entry = mapPlatformProject(row);
      if (seen.has(entry.documentId)) return fail(context, `duplicate document ${entry.documentId} across pages`);
      seen.add(entry.documentId);
      result.push(entry);
    }
  }
  return result;
}

/**
 * Build/revalidation only; the caller is a static Server Component. On /tr, the entry and
 * each project use their Turkish version or, silently, their English one (design/i18n.md,
 * CMS content). Sections follow `projectStatus` only, never the years or the date.
 */
export async function fetchProjectPlatformData(requested: Locale, options: ProjectPlatformOptions): Promise<ProjectPlatformData> {
  const turkish = requested === "tr";
  const [pageEn, pageTr, projectsEn, projectsTr] = await Promise.all([
    pageEntry("en", options),
    turkish ? pageEntry("tr", options) : Promise.resolve(null),
    projects("en", options),
    turkish ? projects("tr", options) : Promise.resolve([]),
  ]);
  const entry = (turkish ? pageTr : null) ?? pageEn;
  const cards = orderPlatformProjects(selectLocaleVariants(requested, projectsEn, projectsTr), requested).map((project) => ({
    status: project.projectStatus,
    card: {
      id: project.documentId,
      title: project.title,
      summary: project.summary,
      years: projectYears(project.startYear, project.endYear),
      startYear: project.startYear,
      endYear: project.endYear,
      contentLocale: project.locale,
      coverImage: toMediaImage(project.coverImage, requested, {
        collection: "platform-projects", entry: project.documentId, field: "coverImage",
      }),
      applicationUrl: project.projectStatus === "current" ? project.applicationUrl : null,
    } satisfies PlatformProjectCard,
  }));
  return {
    page: entry && {
      intro: entry.intro,
      whatsappUrl: entry.whatsappUrl,
      whatsappLabel: entry.whatsappLabel,
      features: entry.features,
      contentLocale: entry.locale,
    },
    current: cards.filter(({ status }) => status === "current").map(({ card }) => card),
    past: cards.filter(({ status }) => status === "past").map(({ card }) => card),
  };
}

/** True when the page has anything to show for this locale; the sitemap lists it only then. */
export function hasProjectPlatformContent(data: ProjectPlatformData): boolean {
  return data.page !== null || data.current.length > 0 || data.past.length > 0;
}
