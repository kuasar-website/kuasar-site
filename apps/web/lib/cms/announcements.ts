/**
 * Typed consumption of Strapi's `Announcement` content type — mapping,
 * ordering, and locale-fallback selection only. Nothing here fetches from
 * Strapi; see design.md, "The mapper takes an already-fetched,
 * single-locale Strapi response" and "Locale-fallback selection operates
 * on a pair, not a fetch strategy." The actual live fetch, its base URL,
 * and revalidation tags are `publish-integration`'s (not yet proposed).
 *
 * Response shape verified against Strapi 5's actual, current behavior —
 * not assumed from v4 habits: a single item is the flattened
 * `{ documentId, locale, ...fields }` shape (no nested `attributes`), and
 * `documentId` is shared across a Document's locale variants. See
 * design.md, Context, for sources.
 */

export type Locale = "en" | "tr";

export type AnnouncementCoverImage = { readonly url: string };

export type AnnouncementLocaleContent = {
  readonly documentId: string;
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string;
  readonly body: string;
  readonly pinned: boolean;
  readonly publishedAt: string;
  readonly coverImage: AnnouncementCoverImage | null;
};

function fail(message: string): never {
  throw new Error(`Announcement: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validates one Strapi list-item response against the schema in
 * `apps/cms/src/api/announcement/content-types/announcement/schema.json`.
 * Throws, naming the field, on anything unexpected — never returns a
 * record with an `undefined` field.
 */
export function mapAnnouncement(raw: unknown): AnnouncementLocaleContent {
  if (!isRecord(raw)) fail("response must be an object");

  if (typeof raw.documentId !== "string" || raw.documentId.length === 0) {
    fail(`"documentId" must be a non-empty string`);
  }
  if (raw.locale !== "en" && raw.locale !== "tr") {
    fail(`"locale" must be "en" or "tr"`);
  }
  if (typeof raw.title !== "string" || raw.title.length === 0) {
    fail(`"title" must be a non-empty string`);
  }
  if (typeof raw.slug !== "string" || raw.slug.length === 0) {
    fail(`"slug" must be a non-empty string`);
  }
  if (typeof raw.excerpt !== "string") {
    fail(`"excerpt" must be a string`);
  }
  if (typeof raw.body !== "string") {
    fail(`"body" must be a string`);
  }
  if (typeof raw.pinned !== "boolean") {
    fail(`"pinned" must be a boolean`);
  }
  if (typeof raw.publishedAt !== "string" || raw.publishedAt.length === 0) {
    fail(`"publishedAt" must be a non-empty string`);
  }

  let coverImage: AnnouncementCoverImage | null = null;

  if (raw.coverImage !== undefined && raw.coverImage !== null) {
    if (!isRecord(raw.coverImage) || typeof raw.coverImage.url !== "string") {
      fail(`"coverImage" must be null or an object with a string "url"`);
    }
    coverImage = { url: raw.coverImage.url };
  }

  return {
    documentId: raw.documentId,
    locale: raw.locale,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    body: raw.body,
    pinned: raw.pinned,
    publishedAt: raw.publishedAt,
    coverImage,
  };
}

/**
 * Pinned entries first, then `publishedAt` descending within each group —
 * `docs/task-assignments.html` specifies only the primary grouping; the
 * secondary order is this design's own documented assumption.
 */
export function orderAnnouncements(
  entries: readonly AnnouncementLocaleContent[],
): AnnouncementLocaleContent[] {
  return [...entries].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}

export type AnnouncementLocaleVariants = {
  readonly en?: AnnouncementLocaleContent;
  readonly tr?: AnnouncementLocaleContent;
};

/**
 * Selects which locale variant to display. Falls back to `en` silently —
 * no notice, no error — when the requested locale is absent, per
 * `design/i18n.md`'s CMS-content rule. Strapi does **not** provide this
 * fallback itself (verified; see design.md) — this is the application
 * code that rule actually depends on.
 */
export function selectAnnouncementLocale(
  documentId: string,
  requestedLocale: Locale,
  variants: AnnouncementLocaleVariants,
): AnnouncementLocaleContent {
  for (const variant of [variants.en, variants.tr]) {
    if (variant !== undefined && variant.documentId !== documentId) {
      fail(
        `variant with documentId "${variant.documentId}" does not match requested documentId "${documentId}"`,
      );
    }
  }

  const requested = variants[requestedLocale];

  if (requested !== undefined) return requested;

  const fallback = variants.en;

  if (fallback !== undefined) return fallback;

  fail(
    `"${documentId}": neither "${requestedLocale}" nor the default locale "en" is available`,
  );
}
