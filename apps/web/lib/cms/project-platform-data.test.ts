import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchProjectPlatformData, hasProjectPlatformContent, PROJECT_PLATFORM_CACHE_TAG } from "./project-platform-data.ts";

const ORIGIN = "https://cms.example";
const PUBLISHED = "2026-10-01T09:00:00.000Z";
const cover = { image: { url: "https://media.kuasar.org/cover.jpg", width: 1600, height: 900 }, altEn: "Satellite", altTr: "Uydu" };
const entry = (locale: "en" | "tr", extra: Record<string, unknown> = {}) => ({
  documentId: "pp000000000000000000", locale, intro: `${locale} intro`, publishedAt: PUBLISHED,
  whatsappUrl: "https://chat.whatsapp.com/DummyInvite0", whatsappLabel: null,
  features: [{ id: 1, title: `${locale} one`, description: "d" }, { id: 2, title: `${locale} two`, description: "d" }], ...extra,
});
const project = (documentId: string, locale: "en" | "tr", extra: Record<string, unknown> = {}) => ({
  documentId, locale, title: `${locale} ${documentId}`, summary: `${locale} summary`, publishedAt: PUBLISHED,
  coverImage: null, startYear: 2025, endYear: null, projectStatus: "current", applicationUrl: null, ...extra,
});

type Single = Record<string, unknown> | "missing" | Response;
type Call = { url: URL; init: RequestInit & { next?: { tags: string[]; revalidate: false } } };
function fixture({ pages = {}, projects = {} }: { pages?: Partial<Record<string, Single>>; projects?: Record<string, unknown[][]> }) {
  const calls: Call[] = [];
  const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init: init as Call["init"] });
    const locale = url.searchParams.get("locale")!;
    if (url.pathname === "/api/project-platform") {
      const single = pages[locale] ?? "missing";
      if (single instanceof Response) return single;
      if (single === "missing") {
        return Response.json({ data: null, error: { status: 404, name: "NotFoundError", message: "Not Found", details: {} } }, { status: 404 });
      }
      return Response.json({ data: single, meta: {} });
    }
    const page = Number(url.searchParams.get("pagination[page]"));
    const all = projects[locale] ?? [[]];
    const pageCount = all.length === 1 && !all[0]!.length ? 0 : all.length;
    return Response.json({ data: all[page - 1] ?? [], meta: { pagination: { page, pageCount } } });
  }) as typeof fetch;
  return { calls, fetcher };
}

test("nothing published: no page entry, two empty sections, no content", async () => {
  const { fetcher } = fixture({});
  for (const locale of ["en", "tr"] as const) {
    const data = await fetchProjectPlatformData(locale, { origin: ORIGIN, fetcher });
    assert.deepEqual(data, { page: null, current: [], past: [] });
    assert.equal(hasProjectPlatformContent(data), false);
  }
});

test("requests are published-only, tagged, cached forever, with no token header by default", async () => {
  const { calls, fetcher } = fixture({ pages: { en: entry("en") } });
  await fetchProjectPlatformData("tr", { origin: ORIGIN, fetcher });
  assert.equal(calls.length, 4);
  for (const { url, init } of calls) {
    assert.equal(url.searchParams.get("status"), "published");
    assert.equal(init.cache, "force-cache");
    assert.deepEqual(init.next, { tags: [PROJECT_PLATFORM_CACHE_TAG], revalidate: false });
    assert.equal(new Headers(init.headers).get("authorization"), null);
  }
  const single = calls.filter((c) => c.url.pathname === "/api/project-platform");
  assert.deepEqual(single.map((c) => c.url.searchParams.get("locale")).sort(), ["en", "tr"]);
  for (const { url } of single) assert.equal(url.searchParams.get("populate[features]"), "true");
  const list = calls.filter((c) => c.url.pathname === "/api/platform-projects");
  for (const { url } of list) assert.equal(url.searchParams.get("populate[coverImage][populate][image]"), "true");
});

test("/en reads English only", async () => {
  const { calls, fetcher } = fixture({});
  await fetchProjectPlatformData("en", { origin: ORIGIN, fetcher });
  assert.deepEqual(calls.map((c) => c.url.searchParams.get("locale")), ["en", "en"]);
});

test("an optional read token is sent as a Bearer header", async () => {
  const { calls, fetcher } = fixture({});
  await fetchProjectPlatformData("en", { origin: ORIGIN, token: "read-token", fetcher });
  for (const { init } of calls) assert.equal(new Headers(init.headers).get("authorization"), "Bearer read-token");
});

test("the page entry: Turkish when published, otherwise English, with the locale it is in", async () => {
  const both = fixture({ pages: { en: entry("en"), tr: entry("tr", { whatsappLabel: "Katıl" }) } });
  const tr = await fetchProjectPlatformData("tr", { origin: ORIGIN, fetcher: both.fetcher });
  assert.equal(tr.page?.intro, "tr intro");
  assert.equal(tr.page?.contentLocale, "tr");
  assert.equal(tr.page?.whatsappLabel, "Katıl");
  assert.deepEqual(tr.page?.features.map((f) => f.title), ["tr one", "tr two"]);

  const englishOnly = fixture({ pages: { en: entry("en") } });
  const fallback = await fetchProjectPlatformData("tr", { origin: ORIGIN, fetcher: englishOnly.fetcher });
  assert.equal(fallback.page?.intro, "en intro");
  assert.equal(fallback.page?.contentLocale, "en");
  assert.equal(hasProjectPlatformContent(fallback), true);

  const turkishOnly = fixture({ pages: { tr: entry("tr") } });
  assert.equal((await fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: turkishOnly.fetcher })).page, null, "/en never shows Turkish-only");
});

test("a page entry without publishedAt is never shown", async () => {
  const { fetcher } = fixture({ pages: { en: entry("en", { publishedAt: null }) } });
  assert.equal((await fetchProjectPlatformData("en", { origin: ORIGIN, fetcher })).page, null);
});

test("an invalid WhatsApp link drops the button, not the page", async () => {
  const { fetcher } = fixture({ pages: { en: entry("en", { whatsappUrl: "http://chat.whatsapp.com/x" }) } });
  const data = await fetchProjectPlatformData("en", { origin: ORIGIN, fetcher });
  assert.equal(data.page?.whatsappUrl, null);
  assert.equal(data.page?.intro, "en intro");
});

test("projects split by projectStatus, ordered, with years, covers and Apply only on current", async () => {
  const { fetcher } = fixture({
    projects: {
      en: [[
        project("a", "en", { startYear: 2024, endYear: 2026, applicationUrl: "https://forms.gle/a" }),
        project("b", "en", { startYear: 2026, title: "Beta", applicationUrl: "http://forms.gle/insecure" }),
        project("c", "en", { startYear: 2026, title: "Alpha", coverImage: cover }),
        project("d", "en", { projectStatus: "past", startYear: 2020, endYear: 2020, applicationUrl: "https://forms.gle/d" }),
        project("e", "en", { projectStatus: "past", startYear: 2022 }),
        project("draft", "en", { publishedAt: null, title: "DRAFT-ONLY" }),
      ]],
    },
  });
  const data = await fetchProjectPlatformData("en", { origin: ORIGIN, fetcher });
  assert.deepEqual(data.current.map((p) => p.id), ["c", "b", "a"]);
  assert.deepEqual(data.past.map((p) => p.id), ["e", "d"]);
  assert.deepEqual(data.current.map((p) => p.applicationUrl), [null, null, "https://forms.gle/a"]);
  assert.deepEqual(data.past.map((p) => p.applicationUrl), [null, null], "a past project never has Apply");
  assert.deepEqual([...data.current, ...data.past].map((p) => p.years), ["2026", "2026", "2024–2026", "2022", "2020"]);
  assert.equal(data.current[0]!.coverImage?.alt, "Satellite");
  assert.equal(data.current[1]!.coverImage, null);
});

test("one project in each section", async () => {
  const { fetcher } = fixture({ projects: { en: [[project("a", "en"), project("b", "en", { projectStatus: "past" })]] } });
  const data = await fetchProjectPlatformData("en", { origin: ORIGIN, fetcher });
  assert.equal(data.current.length, 1);
  assert.equal(data.past.length, 1);
  assert.equal(hasProjectPlatformContent(data), true);
});

test("projects on /tr: Turkish by document, English fallback, Turkish alt text, Turkish order", async () => {
  const { fetcher } = fixture({
    projects: {
      en: [[project("a", "en", { coverImage: cover }), project("b", "en")]],
      tr: [[project("a", "tr", { coverImage: cover, title: "Çanta" }), project("t", "tr", { title: "Cam" })]],
    },
  });
  const data = await fetchProjectPlatformData("tr", { origin: ORIGIN, fetcher });
  assert.deepEqual(data.current.map((p) => [p.title, p.contentLocale]), [["Cam", "tr"], ["Çanta", "tr"], ["en b", "en"]]);
  assert.equal(data.current[1]!.coverImage?.alt, "Uydu");
});

test("many projects across pages are all read", async () => {
  const many = Array.from({ length: 150 }, (_, i) => project(`p${String(i).padStart(3, "0")}`, "en", { projectStatus: i % 2 ? "past" : "current" }));
  const { fetcher } = fixture({ projects: { en: [many.slice(0, 100), many.slice(100)] } });
  const data = await fetchProjectPlatformData("en", { origin: ORIGIN, fetcher });
  assert.equal(data.current.length + data.past.length, 150);
});

test("failures are loud and name the runbook", async () => {
  const forbidden = fixture({ pages: { en: Response.json({ error: { status: 403, name: "ForbiddenError" } }, { status: 403 }) } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: forbidden.fetcher }), /project-platform\/en: Strapi HTTP 403.*runbook/);

  const other404 = fixture({ pages: { en: new Response("Not here", { status: 404 }) } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: other404.fetcher }), /404 that is not a NotFoundError/);

  const array = fixture({ pages: { en: Response.json({ data: [], meta: {} }) } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: array.fetcher }), /data: expected an object/);

  const html = fixture({ pages: { en: new Response("<html>", { status: 200 }) } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: html.fetcher }), /expected a JSON response/);

  const unreachable = (async () => { throw new TypeError("fetch failed"); }) as typeof fetch;
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: unreachable }), /Strapi unreachable/);

  const badYears = fixture({ projects: { en: [[project("a", "en", { startYear: 2026, endYear: 2024 })]] } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: badYears.fetcher }), /Platform Project a \(en\) field "endYear"/);

  const wrongLocale = fixture({ projects: { en: [[project("a", "tr")]] } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: wrongLocale.fetcher }), /unexpected locale/);

  const duplicate = fixture({ projects: { en: [[project("a", "en")], [project("a", "en")]] } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: duplicate.fetcher }), /duplicate document a/);

  const offHost = fixture({ projects: { en: [[project("a", "en", { coverImage: { ...cover, image: { ...cover.image, url: "https://x.r2.dev/c.jpg" } } })]] } });
  await assert.rejects(fetchProjectPlatformData("en", { origin: ORIGIN, fetcher: offHost.fetcher }), /media/);
});
