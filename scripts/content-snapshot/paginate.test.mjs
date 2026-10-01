import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchAllPages } from "./paginate.mjs";

const FIXTURE_TYPE = Object.freeze({
  uid: "sponsor",
  pluralName: "sponsors",
  populate: Object.freeze([]),
});

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

test("fetchAllPages exhausts every page of a multi-page fixture", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const page = Number(new URL(url).searchParams.get("pagination[page]"));
    if (page === 1) {
      return jsonResponse({
        data: [{ documentId: "a" }, { documentId: "b" }],
        meta: { pagination: { page: 1, pageCount: 3, total: 5 } },
      });
    }
    if (page === 2) {
      return jsonResponse({
        data: [{ documentId: "c" }],
        meta: { pagination: { page: 2, pageCount: 3, total: 5 } },
      });
    }
    return jsonResponse({
      data: [{ documentId: "d" }, { documentId: "e" }],
      meta: { pagination: { page: 3, pageCount: 3, total: 5 } },
    });
  };

  const entries = await fetchAllPages({
    cmsBaseUrl: "https://cms.example.org",
    token: "fixture-token",
    contentType: FIXTURE_TYPE,
    locale: "en",
    fetchImpl,
  });

  assert.equal(calls.length, 3, "must request all three pages, not assume page 1 is complete");
  assert.deepEqual(
    entries.map((e) => e.documentId),
    ["a", "b", "c", "d", "e"],
  );
});

test("fetchAllPages returns an empty array for a single empty page, not an error", async () => {
  const fetchImpl = async () =>
    jsonResponse({ data: [], meta: { pagination: { page: 1, pageCount: 1, total: 0 } } });

  const entries = await fetchAllPages({
    cmsBaseUrl: "https://cms.example.org",
    token: "fixture-token",
    contentType: FIXTURE_TYPE,
    locale: "en",
    fetchImpl,
  });

  assert.deepEqual(entries, []);
});

test("fetchAllPages aborts on a failed request mid-pagination, without returning a partial result", async () => {
  const fetchImpl = async (url) => {
    const page = Number(new URL(url).searchParams.get("pagination[page]"));
    if (page === 1) {
      return jsonResponse({
        data: [{ documentId: "a" }],
        meta: { pagination: { page: 1, pageCount: 2, total: 2 } },
      });
    }
    return jsonResponse(null, { ok: false, status: 500 });
  };

  await assert.rejects(
    () =>
      fetchAllPages({
        cmsBaseUrl: "https://cms.example.org",
        token: "fixture-token",
        contentType: FIXTURE_TYPE,
        locale: "en",
        fetchImpl,
      }),
    /page 2 failed: HTTP 500/,
  );
});

test("fetchAllPages rejects an unexpected response shape rather than silently proceeding", async () => {
  const fetchImpl = async () => jsonResponse({ notData: true });

  await assert.rejects(
    () =>
      fetchAllPages({
        cmsBaseUrl: "https://cms.example.org",
        token: "fixture-token",
        contentType: FIXTURE_TYPE,
        locale: "en",
        fetchImpl,
      }),
    /unexpected response shape/,
  );
});
