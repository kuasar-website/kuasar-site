/**
 * Wraps `fetch` for build-time Strapi requests.
 *
 * Per docs/adr/0001-stack.md (Consequences): a network-level failure to reach
 * Strapi at build time must fail with an explicit error naming Strapi and
 * pointing at docs/ops/cms-runbook.md, never a raw network error surfaced
 * as-is (e.g. ECONNREFUSED).
 *
 * Deliberately narrow in scope:
 * - Only network-level failures (connection refused, timeout, DNS) are
 *   caught and relabeled. An HTTP response Strapi itself returns (404, 500)
 *   is returned to the caller unchanged — fetch() only throws on a
 *   network-level failure, never on a non-2xx status, so no special-case
 *   code is needed to preserve that.
 * - The target URL is constructed *before* the try/catch, outside it, so a
 *   malformed or missing base URL throws its own native error and is never
 *   mistaken for network unreachability. That is a distinct, out-of-scope
 *   failure this wrapper defines no behavior for.
 */

export interface StrapiFetchOptions {
  /** Path relative to the Strapi base URL, e.g. "/api/missions". */
  path: string;
}

export async function fetchStrapi(baseUrl: string, options: StrapiFetchOptions): Promise<Response> {
  const url = new URL(options.path, baseUrl);
  try {
    return await fetch(url);
  } catch (err) {
    const cause = err as {
      code?: string;
      cause?: { code?: string };
    };
    const detail =
      cause.cause?.code ??
      cause.code ??
      String(err);
    throw new Error(
      `Strapi unreachable at ${baseUrl} — see docs/ops/cms-runbook.md (cause: ${detail})`
    );
  }
}
