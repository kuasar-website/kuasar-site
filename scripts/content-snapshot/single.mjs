#!/usr/bin/env node
/**
 * Fetches one single type in one locale. A single type has at most one
 * published document per locale, returned as an object, never paginated.
 *
 * Nothing published in that locale is a legitimate empty state, and Strapi 5
 * answers it with 404 and a JSON `NotFoundError` body (verified against
 * Strapi 5.52.3 with a scoped API token — see
 * openspec/changes/project-platform-cms/design.md, "Single-type export").
 * That, and only that, becomes "no entry". Everything else throws, exactly as
 * paginate.mjs does: a 401/403 (the token lacks permission), any other status,
 * a non-JSON body, or an unexpected shape. The caller (export.mjs) then aborts
 * the whole run before anything is written.
 *
 * The same 404 is what a route that does not exist returns, so this cannot
 * tell "nothing published" from "the type is not deployed". design.md records
 * why that is acceptable and what guards it.
 */

import { buildSingleTypeRequestUrl } from "./request.mjs";

/**
 * @param {object} args
 * @param {string} args.cmsBaseUrl
 * @param {string} args.token
 * @param {{ uid: string, singularName: string, populate: readonly string[] }} args.contentType
 * @param {"en" | "tr"} args.locale
 * @param {typeof fetch} [args.fetchImpl]
 * @returns {Promise<object[]>} [] when nothing is published in that locale, else [document]
 */
export async function fetchSingleType({ cmsBaseUrl, token, contentType, locale, fetchImpl = fetch }) {
  const url = buildSingleTypeRequestUrl(cmsBaseUrl, contentType, locale);
  let response;
  try {
    response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (cause) {
    throw new Error(`[content-snapshot] Network failure fetching ${contentType.uid} (${locale})`, { cause });
  }

  let body;
  try {
    body = await response.json();
  } catch (cause) {
    throw new Error(
      `[content-snapshot] ${contentType.uid} (${locale}) failed: HTTP ${response.status} with a non-JSON body`,
      { cause },
    );
  }

  if (response.status === 404 && body?.data === null && body?.error?.name === "NotFoundError") {
    console.log(`[content-snapshot] ${contentType.uid} (${locale}): nothing published, recorded as no entry.`);
    return [];
  }
  if (!response.ok) {
    throw new Error(`[content-snapshot] ${contentType.uid} (${locale}) failed: HTTP ${response.status}`);
  }
  if (body?.data === null || typeof body?.data !== "object" || Array.isArray(body.data)) {
    throw new Error(`[content-snapshot] ${contentType.uid} (${locale}) returned an unexpected response shape`);
  }
  return [body.data];
}
