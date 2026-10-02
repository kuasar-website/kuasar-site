import { allTags, CONTENT_TYPES } from "./registry.ts";
import { secretMatches } from "./secrets.ts";

/**
 * /api/revalidate logic (design D1, D2), injectable for tests. Strapi's webhook sends the
 * secret as `Authorization: Bearer <REVALIDATE_SECRET>` (a custom webhook header). A
 * query-string secret is never accepted. Revalidation is the Next 16 two-argument
 * `revalidateTag(tag, 'max')` for every tag the registry maps to the changed type.
 *
 * Deliberately NO `revalidatePath`: on the current fallback-false localized routes
 * (`[locale]` + `dynamicParams = false`) a hard path/tag expiry makes Next 16.3.1 return
 * a persistent 404 (NoFallbackError) — see design.md D2 and tasks.md 6.1. With `'max'`
 * the change is stale-while-revalidate: the first request after a publish may still be
 * stale (a KNOWN, unresolved acceptance gap — not claimed as met). No cron, no timers.
 */
export type RevalidateDeps = {
  secret: string | undefined;
  revalidateTag: (tag: string, profile: "max") => void;
};

const ENTRY_EVENTS = new Set(["entry.create", "entry.update", "entry.publish", "entry.unpublish", "entry.delete"]);
const MEDIA_EVENTS = new Set(["media.update", "media.delete"]);

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

export async function handleRevalidate(request: Request, deps: RevalidateDeps): Promise<Response> {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" }, { Allow: "POST" });
  if (!secretMatches(bearer(request), deps.secret)) return json(401, { error: "Unauthorized" });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "Expected a JSON webhook body" });
  }
  const event = body.event;
  if (typeof event !== "string") return json(400, { error: "Missing event" });

  let tags: string[] = [];
  if (ENTRY_EVENTS.has(event)) {
    const uid = typeof body.uid === "string" ? body.uid
      : typeof body.model === "string" ? `api::${body.model}.${body.model}` : null;
    if (!uid) return json(400, { error: "Missing uid/model" });
    tags = [...(CONTENT_TYPES[uid]?.tags ?? [])];
  } else if (MEDIA_EVENTS.has(event)) {
    // A replaced or deleted file changes URLs wherever it is used.
    tags = allTags();
  }

  // Tags cover every route and the sitemap that fetched with them, in both locales.
  for (const tag of tags) deps.revalidateTag(tag, "max");
  return json(200, { revalidated: { tags } });
}
