import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchNewsData, NEWS_CACHE_TAG } from "./announcements-data.ts";

const ORIGIN = "https://cms.example";
const cover = { image: { url: "https://media.kuasar.org/cover.jpg", width: 1600, height: 900 }, altEn: "Rocket", altTr: "Roket" };
const row = (documentId: string, locale: "en" | "tr", extra: Record<string, unknown> = {}) => ({
  documentId, locale, title: `${locale} ${documentId}`, slug: `${locale}-${documentId}`,
  excerpt: null, body: null, pinned: false, publishedAt: "2026-09-01T09:00:00.000Z", coverImage: null, ...extra,
});

type Call = { url: URL; init: RequestInit & { next?: { tags: string[]; revalidate: false } } };
function fixture(pages: Record<string, unknown[][]>) {
  const calls: Call[] = [];
  const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init: init as Call["init"] });
    const locale = url.searchParams.get("locale")!;
    const page = Number(url.searchParams.get("pagination[page]"));
    const all = pages[locale] ?? [[]];
    return Response.json({ data: all[page - 1] ?? [], meta: { pagination: { page, pageCount: all.length === 1 && !all[0]!.length ? 0 : all.length } } });
  }) as typeof fetch;
  return { calls, fetcher };
}

test("zero published announcements is an empty list, not an error", async () => {
  const { fetcher } = fixture({ en: [[]] });
  assert.deepEqual(await fetchNewsData("en", { origin: ORIGIN, fetcher }), []);
});

test("requests are published-only, tagged, cached forever and never draft", async () => {
  const { calls, fetcher } = fixture({ en: [[row("a", "en")]], tr: [[]] });
  await fetchNewsData("tr", { origin: ORIGIN, fetcher });
  assert.equal(calls.length, 2);
  for (const { url, init } of calls) {
    assert.equal(url.pathname, "/api/announcements");
    assert.equal(url.searchParams.get("status"), "published");
    assert.equal(url.searchParams.get("populate[coverImage][populate][image]"), "true");
    assert.equal(init.cache, "force-cache");
    assert.deepEqual(init.next, { tags: [NEWS_CACHE_TAG], revalidate: false });
    assert.equal(new Headers(init.headers).get("authorization"), null, "no token configured, no header");
  }
  assert.deepEqual(calls.map((c) => c.url.searchParams.get("locale")).sort(), ["en", "tr"]);
});

test("an optional read token is sent as a Bearer header", async () => {
  const { calls, fetcher } = fixture({ en: [[]] });
  await fetchNewsData("en", { origin: ORIGIN, token: "read-token", fetcher });
  assert.equal(new Headers(calls[0]!.init.headers).get("authorization"), "Bearer read-token");
});

test("every pagination page is collected", async () => {
  const many = Array.from({ length: 150 }, (_, i) => row(`d${String(i).padStart(3, "0")}`, "en"));
  const { fetcher } = fixture({ en: [many.slice(0, 100), many.slice(100)] });
  assert.equal((await fetchNewsData("en", { origin: ORIGIN, fetcher })).length, 150);
});

test("a row without publishedAt (a draft) is never returned", async () => {
  const { fetcher } = fixture({ en: [[row("a", "en"), row("draft", "en", { publishedAt: null })]] });
  const items = await fetchNewsData("en", { origin: ORIGIN, fetcher });
  assert.deepEqual(items.map((i) => i.id), ["a"]);
});

test("Turkish overrides English by documentId; missing Turkish falls back to English silently", async () => {
  const { fetcher } = fixture({
    en: [[row("both", "en"), row("en-only", "en")]],
    tr: [[row("both", "tr"), row("tr-only", "tr")]],
  });
  const items = await fetchNewsData("tr", { origin: ORIGIN, fetcher });
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(byId.both?.contentLocale, "tr");
  assert.equal(byId["en-only"]?.contentLocale, "en");
  assert.equal(byId["en-only"]?.title, "en en-only");
  assert.equal(byId["tr-only"]?.contentLocale, "tr");
  const english = await fetchNewsData("en", { origin: ORIGIN, fetcher });
  assert.deepEqual(english.map((i) => i.id).sort(), ["both", "en-only"], "English never shows Turkish-only text");
});

test("pinned first, then newest first", async () => {
  const { fetcher } = fixture({ en: [[
    row("old", "en", { publishedAt: "2026-01-01T00:00:00.000Z" }),
    row("new", "en", { publishedAt: "2026-09-01T00:00:00.000Z" }),
    row("pinned", "en", { pinned: true, publishedAt: "2025-01-01T00:00:00.000Z" }),
  ]] });
  assert.deepEqual((await fetchNewsData("en", { origin: ORIGIN, fetcher })).map((i) => i.id), ["pinned", "new", "old"]);
});

test("the cover image goes through the media contract with the visitor's alt text", async () => {
  const { fetcher } = fixture({ en: [[row("a", "en", { coverImage: cover })]], tr: [[]] });
  const [item] = await fetchNewsData("tr", { origin: ORIGIN, fetcher });
  assert.equal(item?.coverImage?.alt, "Roket");
  assert.equal(item?.coverImage?.width, 1600);
  const bad = fixture({ en: [[row("a", "en", { coverImage: { ...cover, image: { ...cover.image, url: "https://x.r2.dev/c.jpg" } } })]] });
  await assert.rejects(fetchNewsData("en", { origin: ORIGIN, fetcher: bad.fetcher }), /media/);
});

test("an unreachable or failing CMS fails loudly instead of showing an empty page", async () => {
  const down = (async () => { throw new Error("ECONNREFUSED"); }) as typeof fetch;
  await assert.rejects(fetchNewsData("en", { origin: ORIGIN, fetcher: down }), /Strapi unreachable/);
  const error = (async () => new Response("no", { status: 500 })) as typeof fetch;
  await assert.rejects(fetchNewsData("en", { origin: ORIGIN, fetcher: error }), /Strapi HTTP 500/);
  const malformed = fixture({ en: [[row("a", "en", { title: "" })]] });
  await assert.rejects(fetchNewsData("en", { origin: ORIGIN, fetcher: malformed.fetcher }), /"title"/);
});
