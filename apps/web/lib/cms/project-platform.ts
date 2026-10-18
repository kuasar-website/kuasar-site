/**
 * Typed consumption of Strapi's Project Platform single type and Platform Project
 * collection: validation, mapping, the year label, ordering and the Turkish fallback. Nothing
 * here fetches; `project-platform-data.ts` does. Contract:
 * openspec/changes/project-platform-page (design D4–D6); schemas in
 * apps/cms/src/api/{project-platform,platform-project}/ and design/content-model.md.
 *
 * Strict on the content model (a missing required field, a year out of range, an unknown
 * `projectStatus`, an end year before the start year all throw, naming the document and
 * field), lenient on optional links: an unsafe `whatsappUrl` or `applicationUrl` is
 * dropped, never thrown, so it hides its button instead of holding the page back.
 */

import type { Locale } from "../i18n/segments.ts";
import type { StrapiImage } from "../media/image.ts";

export const PROJECT_STATUSES = ["current", "past"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type PlatformFeature = { readonly title: string; readonly description: string };

export type ProjectPlatformLocaleContent = {
  readonly documentId: string;
  readonly locale: Locale;
  /** Editor Markdown (Strapi rich text). Required, never blank. */
  readonly intro: string;
  /** A safe WhatsApp link, or null (absent or unsafe). Shared by both locales. */
  readonly whatsappUrl: string | null;
  /** The editor's button text, or null for the page's default label. */
  readonly whatsappLabel: string | null;
  /** In the editor's order for this locale. */
  readonly features: readonly PlatformFeature[];
};

export type PlatformProjectLocaleContent = {
  readonly documentId: string;
  readonly locale: Locale;
  readonly title: string;
  readonly summary: string;
  /** The `shared.image` component, passed through; `toMediaImage` validates it. */
  readonly coverImage: StrapiImage | null;
  readonly startYear: number;
  readonly endYear: number | null;
  readonly projectStatus: ProjectStatus;
  /** A safe HTTPS link, or null (absent or unsafe). */
  readonly applicationUrl: string | null;
};

type Row = Record<string, unknown>;

function fail(context: string, message: string): never {
  throw new Error(`[project-platform] ${context}: ${message}. See docs/ops/cms-runbook.md`);
}

function isRecord(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function required(value: unknown, context: string): string {
  if (typeof value !== "string") return fail(context, "expected text");
  const result = value.trim();
  return result || fail(context, "required text is empty");
}

function optional(value: unknown, context: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return fail(context, "expected text or null");
  return value.trim() || null;
}

function identity(raw: unknown, kind: string): { row: Row; documentId: string; locale: Locale } {
  if (!isRecord(raw)) return fail(kind, "expected an object");
  const documentId = typeof raw.documentId === "string" && raw.documentId ? raw.documentId : fail(kind, `"documentId" must be a non-empty string`);
  if (raw.locale !== "en" && raw.locale !== "tr") return fail(`${kind} ${documentId}`, `"locale" must be "en" or "tr"`);
  return { row: raw, documentId, locale: raw.locale };
}

/** The `whatsappUrl` schema pattern (apps/cms/src/api/project-platform), unchanged. */
const WHATSAPP = /^https:\/\/(([a-z0-9-]+\.)?whatsapp\.com|wa\.me)\/\S+$/;

/** An HTTPS WhatsApp link the CMS would accept, without credentials, or null. Never throws. */
export function safeWhatsAppUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!WHATSAPP.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    const host = url.hostname;
    const whatsapp = host === "wa.me" || host === "whatsapp.com" || host.endsWith(".whatsapp.com");
    return url.protocol === "https:" && whatsapp && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** An absolute HTTPS URL without credentials or whitespace, or null. Never throws. */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || /\s/.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** Validates one Project Platform entry (one locale) against its schema. */
export function mapProjectPlatform(raw: unknown): ProjectPlatformLocaleContent {
  const { row, documentId, locale } = identity(raw, "Project Platform");
  const at = (field: string) => `Project Platform ${documentId} (${locale}) field "${field}"`;
  if (row.features != null && !Array.isArray(row.features)) fail(at("features"), "expected a list");
  const features = ((row.features ?? []) as unknown[]).map((value, i) => {
    if (!isRecord(value)) return fail(at(`features[${i}]`), "expected an object");
    return {
      title: required(value.title, at(`features[${i}].title`)),
      description: required(value.description, at(`features[${i}].description`)),
    };
  });
  return {
    documentId,
    locale,
    intro: required(row.intro, at("intro")),
    whatsappUrl: safeWhatsAppUrl(row.whatsappUrl),
    whatsappLabel: optional(row.whatsappLabel, at("whatsappLabel")),
    features,
  };
}

function year(value: unknown, context: string): number {
  if (!Number.isInteger(value)) return fail(context, "expected an integer year");
  const result = value as number;
  if (result < 1900 || result > 2100) return fail(context, `year ${result} is outside 1900–2100`);
  return result;
}

/** Validates one Platform Project (one locale) against its schema. */
export function mapPlatformProject(raw: unknown): PlatformProjectLocaleContent {
  const { row, documentId, locale } = identity(raw, "Platform Project");
  const at = (field: string) => `Platform Project ${documentId} (${locale}) field "${field}"`;
  const startYear = year(row.startYear, at("startYear"));
  const endYear = row.endYear == null ? null : year(row.endYear, at("endYear"));
  // Strapi cannot express endYear >= startYear (project-platform-cms design D5).
  if (endYear !== null && endYear < startYear) fail(at("endYear"), `${endYear} is before startYear ${startYear}`);
  if (!PROJECT_STATUSES.includes(row.projectStatus as ProjectStatus)) {
    fail(at("projectStatus"), `expected "current" or "past", got ${JSON.stringify(row.projectStatus)}`);
  }
  if (row.coverImage != null && (!isRecord(row.coverImage) || (row.coverImage.image != null && !isRecord(row.coverImage.image)))) {
    fail(at("coverImage"), "expected null or a shared.image component object");
  }
  return {
    documentId,
    locale,
    title: required(row.title, at("title")),
    summary: required(row.summary, at("summary")),
    coverImage: (row.coverImage ?? null) as StrapiImage | null,
    startYear,
    endYear,
    projectStatus: row.projectStatus as ProjectStatus,
    applicationUrl: safeHttpsUrl(row.applicationUrl),
  };
}

/** "2025" for one year (or equal years), "2024–2026" (en dash) for a range. Same in both locales. */
export function projectYears(startYear: number, endYear: number | null): string {
  return endYear === null || endYear === startYear ? String(startYear) : `${startYear}–${endYear}`;
}

/**
 * `startYear` newest first, then the title as shown in the page locale's collation, then
 * `documentId`, so the order is total and the same on every build.
 */
export function orderPlatformProjects<T extends Pick<PlatformProjectLocaleContent, "documentId" | "title" | "startYear">>(
  entries: readonly T[],
  locale: Locale,
): T[] {
  const collator = new Intl.Collator(locale);
  return [...entries].sort((a, b) =>
    b.startYear - a.startYear ||
    collator.compare(a.title, b.title) ||
    (a.documentId < b.documentId ? -1 : a.documentId > b.documentId ? 1 : 0));
}

/**
 * The Turkish fallback by document (design/i18n.md, CMS content): on /tr each document's
 * Turkish version, or silently its English one; on /en English only, so a Turkish-only
 * document never reaches /en.
 */
export function selectLocaleVariants<T extends { readonly documentId: string }>(
  requested: Locale,
  english: readonly T[],
  turkish: readonly T[],
): T[] {
  const selected = new Map(english.map((entry) => [entry.documentId, entry]));
  if (requested === "tr") for (const entry of turkish) selected.set(entry.documentId, entry);
  return [...selected.values()];
}
