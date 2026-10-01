import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { collectSnapshots, writeSnapshots } from "./export.mjs";

function jsonResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

function emptyPage() {
  return jsonResponse({ data: [], meta: { pagination: { page: 1, pageCount: 1, total: 0 } } });
}

test("collectSnapshots throws when required env vars are missing, before any request", async () => {
  await assert.rejects(() => collectSnapshots({}, async () => emptyPage()), /CMS_BASE_URL/);
  await assert.rejects(
    () => collectSnapshots({ CMS_BASE_URL: "https://cms.example.org" }, async () => emptyPage()),
    /CONTENT_BACKUP_API_TOKEN/,
  );
});

test("collectSnapshots produces [] for every content type when nothing is published", async () => {
  const snapshots = await collectSnapshots(
    { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
    async () => emptyPage(),
  );
  assert.equal(snapshots.size, 6);
  for (const [, entries] of snapshots) {
    assert.deepEqual(entries, []);
  }
});

test("collectSnapshots orders combined entries by documentId, then locale, regardless of API order", async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/api/sponsors")) return emptyPage();
    const locale = parsed.searchParams.get("locale");
    // Returned out of documentId order on purpose, to prove the export sorts.
    const data =
      locale === "en"
        ? [{ documentId: "z-sponsor", name: "Z Co" }, { documentId: "a-sponsor", name: "A Co" }]
        : [{ documentId: "a-sponsor", name: "A Co (tr)" }];
    return jsonResponse({ data, meta: { pagination: { page: 1, pageCount: 1, total: data.length } } });
  };

  const snapshots = await collectSnapshots(
    { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
    fetchImpl,
  );

  const sponsors = snapshots.get("sponsors");
  assert.deepEqual(
    sponsors.map((s) => `${s.documentId}:${s.locale}`),
    ["a-sponsor:en", "a-sponsor:tr", "z-sponsor:en"],
  );
});

test("collectSnapshots rejects (aborting the whole run) if any single content type fails, never returning a partial map", async () => {
  let sponsorCallCount = 0;
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.includes("/api/sponsors")) {
      sponsorCallCount += 1;
      return { ok: false, status: 503, json: async () => ({}) };
    }
    return emptyPage();
  };

  await assert.rejects(
    () =>
      collectSnapshots(
        { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
        fetchImpl,
      ),
    /sponsor.*HTTP 503/s,
  );
  assert.ok(sponsorCallCount > 0, "the failing content type must actually have been attempted");
});

// --- Regression coverage for PR #34 review findings ---------------------

test("collectSnapshots end to end: a real, non-empty Sponsor record survives into sponsors.json, including its populate query and the summits relation", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/api/sponsors")) return emptyPage();
    if (parsed.searchParams.get("locale") !== "en") return emptyPage();
    return jsonResponse({
      data: [
        {
          documentId: "sponsor-acme",
          name: "Acme Propulsion",
          logo: { image: { url: "https://media.kuasar.org/acme.png" }, altEn: "Acme logo", altTr: "Acme logosu" },
          logoLight: null,
          url: "https://acme.example",
          since: 2024,
          isCurrent: true,
          blurb: "A sponsor.",
          summits: [{ documentId: "summit-2029" }],
        },
      ],
      meta: { pagination: { page: 1, pageCount: 1, total: 1 } },
    });
  };

  const snapshots = await collectSnapshots(
    { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
    fetchImpl,
  );

  // The populate query for sponsors must actually have requested `summits` —
  // this is the exact fix for the PR #34 review finding: fetching the data
  // is necessary but not sufficient if it was never asked for.
  const sponsorRequestUrls = requestedUrls.filter((u) => new URL(u).pathname.includes("/api/sponsors"));
  assert.ok(sponsorRequestUrls.length > 0);
  assert.ok(
    sponsorRequestUrls.every((u) => u.includes("populate%5Bsummits%5D=true") || u.includes("populate[summits]=true")),
    "every sponsors request must include populate[summits]=true",
  );

  const sponsors = snapshots.get("sponsors");
  assert.equal(sponsors.length, 1, "the real Sponsor record must be present, not an empty array");
  assert.equal(sponsors[0].documentId, "sponsor-acme");
  assert.equal(sponsors[0].name, "Acme Propulsion");
  assert.deepEqual(sponsors[0].summits, [{ documentId: "summit-2029" }]);
});

test("collectSnapshots end to end: a real, non-empty Galactic Summit programme survives, and the request includes populate[programme]", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/api/galactic-summits")) return emptyPage();
    if (parsed.searchParams.get("locale") !== "en") return emptyPage();
    return jsonResponse({
      data: [
        {
          documentId: "summit-2029",
          year: 2029,
          programme: [
            { time: "09:00", title: "Opening", description: "Welcome" },
            { time: "10:30", title: "Panel", description: "Discussion" },
          ],
        },
      ],
      meta: { pagination: { page: 1, pageCount: 1, total: 1 } },
    });
  };

  const snapshots = await collectSnapshots(
    { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
    fetchImpl,
  );

  const summitRequestUrls = requestedUrls.filter((u) => new URL(u).pathname.includes("/api/galactic-summits"));
  assert.ok(
    summitRequestUrls.every((u) => u.includes("populate%5Bprogramme%5D=true") || u.includes("populate[programme]=true")),
    "every galactic-summits request must include populate[programme]=true",
  );

  const summits = snapshots.get("galactic-summits");
  assert.equal(summits.length, 1);
  assert.equal(summits[0].programme.length, 2, "both programme items must survive, not be reduced to []");
});

test("writeSnapshots writes one file per content type, including an empty array for zero entries", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "content-snapshot-test-"));
  try {
    const snapshots = new Map([
      ["sponsors", []],
      ["announcements", [{ documentId: "a", locale: "en" }]],
    ]);
    await writeSnapshots(snapshots, dir);
    const sponsorsRaw = await readFile(path.join(dir, "sponsors.json"), "utf8");
    const announcementsRaw = await readFile(path.join(dir, "announcements.json"), "utf8");
    assert.deepEqual(JSON.parse(sponsorsRaw), []);
    assert.deepEqual(JSON.parse(announcementsRaw), [{ documentId: "a", locale: "en" }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
