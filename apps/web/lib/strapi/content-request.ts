/**
 * The request convention every Strapi loader uses (design D4) — the "live fetch function"
 * Dev 3's announcements/alumni loaders adopt (see README.md in this folder).
 *
 * - Public path (default): `status=published`, optional `STRAPI_API_TOKEN`, force-cache,
 *   the loader's registry tag, `revalidate: false`. Changes only via /api/revalidate.
 * - Preview (Draft Mode only): `status=draft`, authenticated with the server-only
 *   `STRAPI_PREVIEW_TOKEN`, no-store. Missing token fails loudly instead of silently
 *   showing published content. The token value is never logged or returned in errors.
 */
export type StrapiReadMode = {
  /** True only when Next.js Draft Mode is enabled for this request. */
  preview?: boolean;
  /** Optional read token for published content (STRAPI_API_TOKEN). */
  token?: string;
  /** Server-only token allowed to read drafts (STRAPI_PREVIEW_TOKEN). */
  previewToken?: string;
};
export type StrapiReadInit = RequestInit & { next?: { tags: string[]; revalidate: false } };

export function strapiRead(tag: string, mode: StrapiReadMode = {}): { status: "published" | "draft"; init: StrapiReadInit } {
  if (mode.preview) {
    if (!mode.previewToken) {
      throw new Error("[strapi] Preview is enabled but STRAPI_PREVIEW_TOKEN is not set. See docs/ops/cms-runbook.md step 7");
    }
    return { status: "draft", init: { cache: "no-store", headers: { Authorization: `Bearer ${mode.previewToken}` } } };
  }
  return {
    status: "published",
    init: {
      cache: "force-cache", next: { tags: [tag], revalidate: false },
      ...(mode.token ? { headers: { Authorization: `Bearer ${mode.token}` } } : {}),
    },
  };
}
