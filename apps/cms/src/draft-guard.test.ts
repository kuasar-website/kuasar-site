import assert from "node:assert/strict";
import { test } from "node:test";
import { assertDraftReadAllowed, draftReadAllowed, READ_ACTIONS } from "./draft-guard.ts";

const base = { apiPrefix: "/api", path: "/api/alumni", status: "draft" as unknown };

test("public and end-user draft reads on the Content API are refused, for every read action", () => {
  for (const action of READ_ACTIONS) {
    for (const strategy of ["users-permissions", undefined, "something-else"]) {
      assert.equal(draftReadAllowed({ ...base, action, strategy }), false, `${action} ${strategy}`);
    }
  }
  assert.equal(draftReadAllowed({ ...base, action: "findOne", path: "/api/alumni/abc123", strategy: "users-permissions" }), false);
  assert.equal(draftReadAllowed({ ...base, action: "findMany", path: "/api", strategy: undefined }), false);
});

test("API tokens keep draft access", () => {
  for (const action of READ_ACTIONS) assert.equal(draftReadAllowed({ ...base, action, strategy: "content-api-token" }), true);
});

test("published or absent status is unaffected", () => {
  for (const status of ["published", undefined, null]) {
    assert.equal(draftReadAllowed({ ...base, action: "findMany", status, strategy: "users-permissions" }), true);
  }
});

test("admin panel, non-REST paths, writes and server-side code are unaffected", () => {
  assert.equal(draftReadAllowed({ ...base, action: "findMany", path: "/content-manager/collection-types/api::alumnus.alumnus", strategy: "admin" }), true);
  assert.equal(draftReadAllowed({ ...base, action: "findMany", path: "/apiary", strategy: "users-permissions" }), true, "prefix must match a whole segment");
  assert.equal(draftReadAllowed({ ...base, action: "update", strategy: "users-permissions" }), true);
  assert.equal(draftReadAllowed({ ...base, action: "findMany", path: undefined, strategy: undefined }), true);
});

test("a custom REST prefix is honoured", () => {
  assert.equal(draftReadAllowed({ ...base, apiPrefix: "/rest", path: "/rest/alumni", action: "findMany", strategy: "users-permissions" }), false);
  assert.equal(draftReadAllowed({ ...base, apiPrefix: "/rest/", path: "/rest/alumni", action: "findMany", strategy: "users-permissions" }), false);
  assert.equal(draftReadAllowed({ ...base, apiPrefix: "/rest", path: "/api/alumni", action: "findMany", strategy: "users-permissions" }), true);
});

test("assertDraftReadAllowed throws 403 through the request, or returns", () => {
  const request = (strategy?: string) => ({
    path: "/api/alumni",
    state: { auth: { strategy: { name: strategy } } },
    throw: (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); },
  });
  const context = { action: "findMany", params: { status: "draft" } };
  assert.throws(() => assertDraftReadAllowed(context, request("users-permissions"), "/api"),
    (e: Error & { status?: number }) => e.status === 403 && /requires an API token/.test(e.message));
  assert.doesNotThrow(() => assertDraftReadAllowed(context, request("content-api-token"), "/api"));
  assert.doesNotThrow(() => assertDraftReadAllowed(context, undefined, "/api"));
  assert.doesNotThrow(() => assertDraftReadAllowed({ action: "findMany", params: undefined }, request("users-permissions"), "/api"));
});
