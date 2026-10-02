import { LOCALES, type Locale } from "../i18n/segments.ts";
import { previewPathFor } from "./registry.ts";
import { secretMatches } from "./secrets.ts";

/**
 * /api/preview logic (design D3), injectable for tests. Accepts only the fields Strapi's
 * preview handler sends; the redirect target is derived from the registry — every other
 * parameter (url, path, slug, redirect, …) is ignored, so it cannot be an open redirect.
 */
export type PreviewDeps = {
  secret: string | undefined;
  enable: () => void | Promise<void>;
  disable: () => void | Promise<void>;
};
export type PreviewResult = { status: 307; location: string } | { status: 400 | 401; error: string };

const DOCUMENT_ID = /^[a-z0-9]{20,32}$/;
const isLocale = (value: string | null): value is Locale => LOCALES.some((locale) => locale === value);

export async function resolvePreview(url: URL, deps: PreviewDeps): Promise<PreviewResult> {
  const params = url.searchParams;
  if (!secretMatches(params.get("secret"), deps.secret)) return { status: 401, error: "Unauthorized" };
  const uid = params.get("uid") ?? "";
  const locale = params.get("locale");
  const status = params.get("status");
  if (!isLocale(locale)) return { status: 400, error: "Invalid locale" };
  if (!DOCUMENT_ID.test(params.get("documentId") ?? "")) return { status: 400, error: "Invalid documentId" };
  if (status !== "draft" && status !== "published") return { status: 400, error: "Invalid status" };
  const path = previewPathFor(uid, locale);
  if (!path) return { status: 400, error: "No preview for this content type" };
  // Defence in depth: only ever a same-origin, locale-prefixed path.
  if (!/^\/(en|tr)\/[a-z0-9-]+$/.test(path)) return { status: 400, error: "Invalid preview path" };
  if (status === "draft") await deps.enable();
  else await deps.disable();
  return { status: 307, location: path };
}

export function exitLocale(url: URL): Locale {
  const locale = url.searchParams.get("locale");
  return isLocale(locale) ? locale : "en";
}
