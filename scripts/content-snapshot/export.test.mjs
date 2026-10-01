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
