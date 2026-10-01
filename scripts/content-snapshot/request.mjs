#!/usr/bin/env node
/**
 * Builds the request URL for one page of one content type in one locale.
 *
 * `status=published` is a literal in this function's own body, not a
 * parameter — there is no argument, environment variable, or config value
 * this function accepts that could change it. This is the published-only
 * contract's code-level enforcement (see
 * openspec/changes/content-backup/design.md, "The published-only contract
 * is enforced by a static test" — this file's own shape is what that test
 * inspects, since the absence of a `status` parameter is a stronger
 * guarantee than a default value that could be overridden).
 *
 * The page size is fixed rather than configurable for the same reason:
 * every parameter this function does not expose is one less way the
 * published-only, non-Alumni contract could be loosened by a caller.
 */

const PAGE_SIZE = 100;

/**
 * @param {string} cmsBaseUrl - e.g. "https://cms.kuasar.org" (no trailing slash)
 * @param {{ pluralName: string, populate: readonly string[] }} contentType
 * @param {"en" | "tr"} locale
 * @param {number} page - 1-indexed
 * @returns {string}
 */
export function buildRequestUrl(cmsBaseUrl, contentType, locale, page) {
  const base = cmsBaseUrl.replace(/\/+$/, "");
  const params = [
    "status=published",
    `locale=${encodeURIComponent(locale)}`,
    `pagination[page]=${page}`,
    `pagination[pageSize]=${PAGE_SIZE}`,
    ...contentType.populate,
  ];
  return `${base}/api/${contentType.pluralName}?${params.join("&")}`;
}
