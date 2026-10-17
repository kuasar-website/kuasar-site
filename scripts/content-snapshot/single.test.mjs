import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchSingleType } from "./single.mjs";

const FIXTURE_TYPE = Object.freeze({
  uid: "project-platform",
  kind: "single",
  singularName: "project-platform",
  pluralName: "project-platforms",
  populate: Object.freeze(["populate[features]=true"]),
});
const ARGS = { cmsBaseUrl: "https://cms.example.org", token: "fixture", contentType: FIXTURE_TYPE, locale: "en" };

const respond = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const notFound = { data: null, error: { status: 404, name: "NotFoundError", message: "Not Found", details: {} } };

test("fetchSingleType returns the published document as a one-entry array", async () => {
  const document = { documentId: "pp-1", intro: "Intro" };
  assert.deepEqual(await fetchSingleType({ ...ARGS, fetchImpl: respond(200, { data: document, meta: {} }) }), [document]);
});

test("fetchSingleType treats Strapi's 404 NotFoundError as nothing published in that locale", async () => {
  assert.deepEqual(await fetchSingleType({ ...ARGS, fetchImpl: respond(404, notFound) }), []);
});

test("fetchSingleType fails loudly when the token lacks permission (401/403), never as an empty locale", async () => {
  for (const status of [401, 403]) {
    const body = { data: null, error: { status, name: status === 403 ? "ForbiddenError" : "UnauthorizedError" } };
    await assert.rejects(() => fetchSingleType({ ...ARGS, fetchImpl: respond(status, body) }), new RegExp(`HTTP ${status}`));
  }
});

test("fetchSingleType fails on a server error or a 404 that is not Strapi's NotFoundError", async () => {
  await assert.rejects(() => fetchSingleType({ ...ARGS, fetchImpl: respond(500, { error: { name: "InternalServerError" } }) }), /HTTP 500/);
  await assert.rejects(() => fetchSingleType({ ...ARGS, fetchImpl: respond(404, { message: "proxy" }) }), /HTTP 404/);
  const html = async () => ({ ok: false, status: 404, json: async () => { throw new SyntaxError("Unexpected token <"); } });
  await assert.rejects(() => fetchSingleType({ ...ARGS, fetchImpl: html }), /non-JSON/);
});

test("fetchSingleType rejects an unexpected shape rather than recording it", async () => {
  for (const body of [{ data: [] }, { data: null }, { data: "text" }, {}]) {
    await assert.rejects(() => fetchSingleType({ ...ARGS, fetchImpl: respond(200, body) }), /unexpected response shape/);
  }
});

test("fetchSingleType wraps a network failure", async () => {
  const fetchImpl = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(() => fetchSingleType({ ...ARGS, fetchImpl }), /Network failure fetching project-platform \(en\)/);
});

test("fetchSingleType requests the singular path, published only, with its populate and no pagination", async () => {
  const urls = [];
  const fetchImpl = async (url, init) => {
    urls.push({ url, auth: init.headers.Authorization });
    return { ok: false, status: 404, json: async () => notFound };
  };
  await fetchSingleType({ ...ARGS, locale: "tr", fetchImpl });
  const url = new URL(urls[0].url);
  assert.equal(url.pathname, "/api/project-platform");
  assert.equal(url.searchParams.get("status"), "published");
  assert.equal(url.searchParams.get("locale"), "tr");
  assert.equal(url.searchParams.get("populate[features]"), "true");
  assert.ok(![...url.searchParams.keys()].some((key) => key.startsWith("pagination")));
  assert.equal(urls[0].auth, "Bearer fixture");
});
