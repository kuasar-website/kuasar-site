/**
 * Draft content is readable through the Content API only with an API token
 * (openspec/changes/cms-draft-guard; cms-platform spec).
 *
 * Why this exists: in Strapi 5 the Content API honours `?status=draft` for ANY caller with
 * `find` — including the Public role. Verified on 2026-10-02 against Strapi 5.52.3: an
 * unauthenticated `GET /api/schedule-events?status=draft` returned draft-only entries.
 * Production grants Public `find` on all seven collections, Alumni included, so without
 * this guard every saved draft would be public (docs/adr/0002-cms.md, Known debt: KVKK).
 *
 * How: a document-service middleware (src/index.ts), so the decision is made AFTER authentication (the
 * request's `ctx.state.auth.strategy`) and covers every collection, present and future.
 * The admin panel uses its own routes (not the REST prefix) and is unaffected; API-token
 * requests (e.g. the publish-integration preview token) and server-side code with no
 * request keep draft access. RE-CHECK ON EVERY STRAPI UPGRADE: tests/cms-drafts/check.mjs.
 */

export const READ_ACTIONS = new Set(["findMany", "findOne", "findFirst", "count"]);
export const API_TOKEN_STRATEGY = "content-api-token";

export type DraftReadInput = {
  action: string;
  status: unknown;
  /** Request path, or undefined when there is no request (bootstrap, scripts). */
  path: string | undefined;
  /** `ctx.state.auth.strategy.name`, when authenticated. */
  strategy: string | undefined;
  apiPrefix: string;
};

/** True when the document action may proceed. Pure: no Strapi access. */
export function draftReadAllowed({ action, status, path, strategy, apiPrefix }: DraftReadInput): boolean {
  if (!READ_ACTIONS.has(action) || status !== "draft") return true;
  if (path === undefined) return true; // server-side code, no request
  const prefix = apiPrefix.endsWith("/") ? apiPrefix : `${apiPrefix}/`;
  if (path !== apiPrefix && !path.startsWith(prefix)) return true; // admin panel and other non-REST routes
  return strategy === API_TOKEN_STRATEGY;
}

type KoaLikeContext = {
  path?: string;
  state?: { auth?: { strategy?: { name?: string } } };
  throw: (status: number, message: string) => never;
};

/**
 * Refuses (403, via the request) a draft read that is not allowed; returns otherwise.
 * Called from the document-service middleware registered in src/index.ts.
 */
export function assertDraftReadAllowed(
  context: { action: string; params?: unknown },
  request: KoaLikeContext | undefined,
  apiPrefix: string,
): void {
  const allowed = draftReadAllowed({
    action: context.action,
    status: (context.params as { status?: unknown } | undefined)?.status,
    path: request?.path,
    strategy: request?.state?.auth?.strategy?.name,
    apiPrefix,
  });
  if (!allowed) request!.throw(403, "Draft content requires an API token.");
}
