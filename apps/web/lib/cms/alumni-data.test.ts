import assert from "node:assert/strict";
import { test } from "node:test";
import { CACHE_TAGS } from "../strapi/registry.ts";
import { ALUMNI_CACHE_TAG, fetchAlumniData, safeLinkedInUrl } from "./alumni-data.ts";

const ORIGIN = "https://cms.example";
const photo = { image: { url: "https://media.kuasar.org/p.jpg", width: 800, height: 800 }, altEn: "Portrait", altTr: "Portre" };
// The Content API's real shape: consent fields are private, so they are simply absent.
const row = (documentId: string, locale: "en" | "tr", extra: Record<string, unknown> = {}) => ({
  documentId, locale, name: `Person ${documentId}`, yearJoined: 2019, yearLeft: 2023, subTeam: "avionics",
  roleHeld: `${locale} role`, photo: null, linkedinUrl: null, publishedAt: "2026-01-01T00:00:00.000Z", ...extra,
});

type Call = { url: URL; init: RequestInit & { next?: { tags: string[]; revalidate: false } } };
function fixture(pages: Record<string, unknown[][]>) {
  const calls: Call[] = [];
  const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init: init as Call["init"] });
    const all = pages[url.searchParams.get("locale")!] ?? [[]];
    const page = Number(url.searchParams.get("pagination[page]"));
    return Response.json({ data: all[page - 1] ?? [], meta: { pagination: { page, pageCount: all.length === 1 && !all[0]!.length ? 0 : all.length } } });
  }) as typeof fetch;
  return { calls, fetcher };
}

test("the loader tag is the registry's reserved alumni tag (no drift)", () => {
  assert.equal(ALUMNI_CACHE_TAG, CACHE_TAGS.alumni);
});

test("zero published alumni is an empty directory, not an error", async () => {
  const { fetcher } = fixture({ en: [[]] });
  assert.deepEqual(await fetchAlumniData("en", { origin: ORIGIN, fetcher }), []);
});

test("requests are published-only, tagged, cached forever and never draft", async () => {
  const { calls, fetcher } = fixture({ en: [[row("a", "en")]], tr: [[]] });
  await fetchAlumniData("tr", { origin: ORIGIN, fetcher });
  assert.equal(calls.length, 2);
  for (const { url, init } of calls) {
    assert.equal(url.pathname, "/api/alumni");
    assert.equal(url.searchParams.get("status"), "published");
    assert.equal(url.searchParams.get("populate[photo][populate][image]"), "true");
    assert.ok(![...url.searchParams.keys()].some((k) => /consent/i.test(k)), "never asks for consent fields");
    assert.equal(init.cache, "force-cache");
    assert.deepEqual(init.next, { tags: [ALUMNI_CACHE_TAG], revalidate: false });
  }
});

test("PRIVACY CANARY: a consent field in the API response fails the build", async () => {
  for (const leak of [{ consentSource: "form" }, { consentRecordedAt: "2024-01-01" }, { consentSource: null }]) {
    const { fetcher } = fixture({ en: [[row("a", "en", leak)]] });
    await assert.rejects(fetchAlumniData("en", { origin: ORIGIN, fetcher }), /exposed consent|"private"/);
  }
});

test("a draft row (no publishedAt) is never returned", async () => {
  const { fetcher } = fixture({ en: [[row("a", "en"), row("draft", "en", { publishedAt: null })]] });
  const groups = await fetchAlumniData("en", { origin: ORIGIN, fetcher });
  assert.deepEqual(groups.flatMap((g) => g.members.map((m) => m.id)), ["a"]);
});

test("every pagination page is collected; grouping is newest yearLeft first, then alphabetical, undated last", async () => {
  const many = Array.from({ length: 120 }, (_, i) => row(`p${String(i).padStart(3, "0")}`, "en", { yearLeft: 2020 + (i % 3) }));
  const { fetcher } = fixture({ en: [many.slice(0, 100), [...many.slice(100), row("z-undated", "en", { yearLeft: null })]] });
  const groups = await fetchAlumniData("en", { origin: ORIGIN, fetcher });
  assert.equal(groups.flatMap((g) => g.members).length, 121);
  assert.deepEqual(groups.map((g) => g.yearLeft), [2022, 2021, 2020, null]);
  const names = groups[0]!.members.map((m) => m.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test("Turkish roleHeld wins on /tr; a person without a Turkish record falls back to English silently", async () => {
  const { fetcher } = fixture({ en: [[row("both", "en"), row("en-only", "en")]], tr: [[row("both", "tr")]] });
  const members = (await fetchAlumniData("tr", { origin: ORIGIN, fetcher })).flatMap((g) => g.members);
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  assert.equal(byId.both?.roleHeld, "tr role");
  assert.equal(byId.both?.contentLocale, "tr");
  assert.equal(byId["en-only"]?.roleHeld, "en role");
  assert.equal(byId["en-only"]?.contentLocale, "en");
});

test("photos stay suppressed without consent evidence, which the API never sends", async () => {
  const { fetcher } = fixture({ en: [[row("a", "en", { photo })]] });
  const [member] = (await fetchAlumniData("en", { origin: ORIGIN, fetcher })).flatMap((g) => g.members);
  assert.equal(member?.photo, null);
  assert.equal(member?.name, "Person a", "the record itself is kept");
});

test("LinkedIn: only an HTTPS linkedin.com URL is kept", () => {
  assert.equal(safeLinkedInUrl("https://www.linkedin.com/in/someone"), "https://www.linkedin.com/in/someone");
  assert.equal(safeLinkedInUrl("https://linkedin.com/in/x"), "https://linkedin.com/in/x");
  for (const bad of ["http://www.linkedin.com/in/x", "https://evil.example/in/x", "https://linkedin.com.evil.example/x",
    "javascript:alert(1)", "https://user:pw@www.linkedin.com/in/x", "not a url", "", null]) {
    assert.equal(safeLinkedInUrl(bad), null, String(bad));
  }
});

test("an unreachable or failing CMS fails loudly", async () => {
  const down = (async () => { throw new Error("ECONNREFUSED"); }) as typeof fetch;
  await assert.rejects(fetchAlumniData("en", { origin: ORIGIN, fetcher: down }), /Strapi unreachable/);
  const error = (async () => new Response("no", { status: 403 })) as typeof fetch;
  await assert.rejects(fetchAlumniData("en", { origin: ORIGIN, fetcher: error }), /Strapi HTTP 403/);
});
