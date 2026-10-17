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

/**
 * Strapi's "nothing published" for any URL: an empty page for a collection,
 * and 404 NotFoundError for the single type (a single type is never paginated).
 */
function nothingPublished(url) {
  if (new URL(url).pathname === "/api/project-platform") {
    return { ok: false, status: 404, json: async () => ({ data: null, error: { status: 404, name: "NotFoundError", message: "Not Found", details: {} } }) };
  }
  return emptyPage();
}

test("collectSnapshots throws when required env vars are missing, before any request", async () => {
  await assert.rejects(() => collectSnapshots({}, async (url) => nothingPublished(url)), /CMS_BASE_URL/);
  await assert.rejects(
    () => collectSnapshots({ CMS_BASE_URL: "https://cms.example.org" }, async (url) => nothingPublished(url)),
    /CONTENT_BACKUP_API_TOKEN/,
  );
});

test("collectSnapshots produces [] for every content type when nothing is published", async () => {
  const snapshots = await collectSnapshots(
    { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
    async (url) => nothingPublished(url),
  );
  assert.equal(snapshots.size, 9);
  for (const [, entries] of snapshots) {
    assert.deepEqual(entries, []);
  }
});

test("collectSnapshots orders combined entries by documentId, then locale, regardless of API order", async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/api/sponsors")) return nothingPublished(url);
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
    return nothingPublished(url);
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
    if (!parsed.pathname.includes("/api/sponsors")) return nothingPublished(url);
    if (parsed.searchParams.get("locale") !== "en") return nothingPublished(url);
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
    if (!parsed.pathname.includes("/api/galactic-summits")) return nothingPublished(url);
    if (parsed.searchParams.get("locale") !== "en") return nothingPublished(url);
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

test("collectSnapshots end to end: Project Platform with a locale that has nothing published, and a Platform Project with a cover", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    const parsed = new URL(url);
    const locale = parsed.searchParams.get("locale");
    if (parsed.pathname === "/api/project-platform" && locale === "en") {
      return jsonResponse({
        data: {
          documentId: "pp-1",
          intro: "Intro",
          whatsappUrl: "https://chat.whatsapp.com/DummyInvite0",
          whatsappLabel: "Join",
          features: [{ title: "Project Sharing", description: "d" }],
        },
        meta: {},
      });
    }
    if (parsed.pathname === "/api/platform-projects" && locale === "tr") {
      const data = [{
        documentId: "proj-1",
        title: "Örnek proje",
        summary: "Özet",
        coverImage: { image: { url: "https://media.kuasar.org/c.png" }, altEn: "Cover", altTr: "Kapak" },
        startYear: 2025,
        endYear: null,
        projectStatus: "current",
        applicationUrl: null,
      }];
      return jsonResponse({ data, meta: { pagination: { page: 1, pageCount: 1, total: 1 } } });
    }
    return nothingPublished(url);
  };

  const snapshots = await collectSnapshots(
    { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
    fetchImpl,
  );

  assert.deepEqual(snapshots.get("project-platforms"), [{
    documentId: "pp-1",
    features: [{ description: "d", title: "Project Sharing" }],
    intro: "Intro",
    locale: "en",
    whatsappLabel: "Join",
    whatsappUrl: "https://chat.whatsapp.com/DummyInvite0",
  }], "tr had nothing published, so it is absent rather than an error");
  assert.deepEqual(snapshots.get("platform-projects").map((p) => [p.documentId, p.locale, p.projectStatus, p.coverImage.url]), [
    ["proj-1", "tr", "current", "https://media.kuasar.org/c.png"],
  ]);
  assert.ok(urls.some((u) => u.includes("/api/project-platform?") && u.includes("populate[features]=true")));
  assert.ok(urls.some((u) => u.includes("/api/platform-projects?") && u.includes("populate[coverImage][populate]=image")));
});

test("a backup token without permission on a new type fails the whole run, and nothing is written", async () => {
  const forbidden = { ok: false, status: 403, json: async () => ({ data: null, error: { status: 403, name: "ForbiddenError" } }) };
  for (const path of ["/api/project-platform", "/api/platform-projects"]) {
    const fetchImpl = async (url) => (new URL(url).pathname === path ? forbidden : nothingPublished(url));
    let snapshots;
    await assert.rejects(async () => {
      snapshots = await collectSnapshots(
        { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "six-type-token" },
        fetchImpl,
      );
    }, /HTTP 403/);
    assert.equal(snapshots, undefined, `${path}: no partial snapshot map is returned to write`);
  }
});

test("collectSnapshots end to end: Resources keep each locale's own file, and English-only and Turkish-only entries stay in their locale", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    const parsed = new URL(url);
    if (parsed.pathname !== "/api/resources") return nothingPublished(url);
    const locale = parsed.searchParams.get("locale");
    const file = (name, mime) => ({ id: 1, name, url: `https://media.kuasar.org/${name}`, mime, size: 120.5, hash: "h" });
    const data =
      locale === "en"
        ? [
            { documentId: "res-both", title: "Guide", description: "EN", file: file("guide-en.pdf", "application/pdf") },
            { documentId: "res-en-only", title: "Checklist", description: "EN only", file: file("checklist.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document") },
          ]
        : [
            { documentId: "res-both", title: "Rehber", description: "TR", file: file("guide-tr.pdf", "application/pdf") },
            { documentId: "res-tr-only", title: "Eğitim notları", description: "TR only", file: file("notlar.pdf", "application/pdf") },
          ];
    return jsonResponse({ data, meta: { pagination: { page: 1, pageCount: 1, total: data.length } } });
  };

  const snapshots = await collectSnapshots(
    { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "fixture" },
    fetchImpl,
  );

  assert.deepEqual(snapshots.get("resources").map((r) => `${r.documentId}:${r.locale}:${r.file.url}`), [
    "res-both:en:https://media.kuasar.org/guide-en.pdf",
    "res-both:tr:https://media.kuasar.org/guide-tr.pdf",
    "res-en-only:en:https://media.kuasar.org/checklist.docx",
    "res-tr-only:tr:https://media.kuasar.org/notlar.pdf",
  ]);
  assert.ok(urls.some((u) => u.includes("/api/resources?") && u.includes("populate[file]=true")));
});

test("a backup token without permission on Resource fails the whole run, and nothing is written", async () => {
  const forbidden = { ok: false, status: 403, json: async () => ({ data: null, error: { status: 403, name: "ForbiddenError" } }) };
  const fetchImpl = async (url) => (new URL(url).pathname === "/api/resources" ? forbidden : nothingPublished(url));
  let snapshots;
  await assert.rejects(async () => {
    snapshots = await collectSnapshots(
      { CMS_BASE_URL: "https://cms.example.org", CONTENT_BACKUP_API_TOKEN: "eight-type-token" },
      fetchImpl,
    );
  }, /resource \(en\) page 1 failed: HTTP 403/);
  assert.equal(snapshots, undefined, "no partial snapshot map is returned to write");
});
