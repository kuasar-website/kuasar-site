/**
 * Strapi admin preview → the frontend's /api/preview (publish-integration, design D3;
 * docs/adr/0002-cms.md decision 8). The URL carries only uid, documentId, locale and
 * status plus the shared PREVIEW_SECRET; the frontend derives the page path itself.
 *
 * Previewable types mirror apps/web/lib/strapi/registry.ts (`preview: true`); a test in
 * apps/web/lib/strapi/registry.test.ts asserts the two lists agree. Sponsor has no page
 * (showcase held); Announcement and Alumni join when Dev 3's routes exist.
 */
export const PREVIEWABLE_UIDS: ReadonlySet<string> = new Set([
  "api::stellar-talk.stellar-talk",
  "api::nebula-night.nebula-night",
  "api::schedule-event.schedule-event",
  "api::galactic-summit.galactic-summit",
]);

export type PreviewUrlInput = {
  uid: string;
  documentId: string;
  locale?: string | null;
  status?: string | null;
  clientUrl?: string;
  secret?: string;
};

/** The preview URL, or null when there is nothing to preview or preview is unconfigured. */
export function previewUrl({ uid, documentId, locale, status, clientUrl, secret }: PreviewUrlInput): string | null {
  if (!PREVIEWABLE_UIDS.has(uid) || !clientUrl || !secret || !documentId) return null;
  let url: URL;
  try { url = new URL("/api/preview", clientUrl); } catch { return null; }
  url.searchParams.set("secret", secret);
  url.searchParams.set("uid", uid);
  url.searchParams.set("documentId", documentId);
  url.searchParams.set("locale", locale === "tr" ? "tr" : "en");
  url.searchParams.set("status", status === "published" ? "published" : "draft");
  return url.href;
}

/** The frontend origin Strapi's admin may frame (admin.preview.config.allowedOrigins). */
export function previewOrigins(clientUrl: string | undefined): string[] {
  if (!clientUrl) return [];
  try { return [new URL(clientUrl).origin]; } catch { return []; }
}
