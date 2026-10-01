#!/usr/bin/env node
/**
 * Fetches every page of one content type in one locale, never assuming a
 * single request returns the complete set — see
 * openspec/changes/content-backup/design.md, "Pagination."
 *
 * `fetchImpl` is injected (defaulting to the global `fetch`) so tests can
 * supply a fixture sequence of responses without any network access — see
 * paginate.test.mjs.
 *
 * Any failure — a non-OK response, an unexpected body shape, a network
 * error, at any page — throws immediately. The caller (export.mjs) treats
 * any thrown error as a reason to abort the entire run before writing or
 * committing anything; this function never returns a partial result on
 * its own, and never logs the token or the `Authorization` header.
 */

import { buildRequestUrl } from "./request.mjs";

/**
 * @param {object} args
 * @param {string} args.cmsBaseUrl
 * @param {string} args.token
 * @param {{ uid: string, pluralName: string, populate: readonly string[] }} args.contentType
 * @param {"en" | "tr"} args.locale
 * @param {typeof fetch} [args.fetchImpl]
 * @returns {Promise<object[]>} every entry across every page, in API order (not yet sorted)
 */
export async function fetchAllPages({
  cmsBaseUrl,
  token,
  contentType,
  locale,
  fetchImpl = fetch,
}) {
  const entries = [];
  let page = 1;
  let pageCount = 1;

  do {
    const url = buildRequestUrl(cmsBaseUrl, contentType, locale, page);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (cause) {
      throw new Error(
        `[content-snapshot] Network failure fetching ${contentType.uid} (${locale}), page ${page}`,
        { cause },
      );
    }

    if (!response.ok) {
      throw new Error(
        `[content-snapshot] ${contentType.uid} (${locale}) page ${page} failed: HTTP ${response.status}`,
      );
    }

    let body;
    try {
      body = await response.json();
    } catch (cause) {
      throw new Error(
        `[content-snapshot] ${contentType.uid} (${locale}) page ${page} returned a non-JSON body`,
        { cause },
      );
    }

    if (!Array.isArray(body?.data) || typeof body?.meta?.pagination?.pageCount !== "number") {
      throw new Error(
        `[content-snapshot] ${contentType.uid} (${locale}) page ${page} returned an unexpected response shape`,
      );
    }

    entries.push(...body.data);
    pageCount = body.meta.pagination.pageCount;
    page += 1;
  } while (page <= pageCount);

  return entries;
}
