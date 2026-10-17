import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRequestUrl, buildSingleTypeRequestUrl } from "./request.mjs";

const FIXTURE_TYPE = Object.freeze({
  uid: "announcement",
  pluralName: "announcements",
  populate: Object.freeze(["populate[coverImage][populate]=image"]),
});

test("buildRequestUrl always includes status=published", () => {
  const url = buildRequestUrl("https://cms.example.org", FIXTURE_TYPE, "en", 1);
  assert.match(url, /(?:\?|&)status=published(?:&|$)/);
});

test("buildRequestUrl's function signature has no parameter capable of requesting drafts", () => {
  // The strongest static guarantee available in plain JS: the function
  // simply does not accept a status/draft argument at all. This is a
  // deliberate design choice (see design.md), not an oversight — inspect
  // the declared arity to catch a future accidental parameter addition.
  assert.equal(
    buildRequestUrl.length,
    4,
    "buildRequestUrl must take exactly (cmsBaseUrl, contentType, locale, page) — adding a status/draft parameter would change this and must be caught",
  );
});

test("buildRequestUrl never produces status=draft under any input", () => {
  for (const locale of ["en", "tr"]) {
    for (const page of [1, 2, 99]) {
      const url = buildRequestUrl("https://cms.example.org", FIXTURE_TYPE, locale, page);
      assert.ok(!url.includes("status=draft"));
      assert.match(url, /status=published/);
    }
  }
});

test("buildRequestUrl includes the requested locale and page", () => {
  const url = buildRequestUrl("https://cms.example.org", FIXTURE_TYPE, "tr", 3);
  assert.match(url, /locale=tr/);
  assert.match(url, /pagination\[page\]=3/);
});

test("buildRequestUrl includes every populate fragment for the content type", () => {
  const url = buildRequestUrl("https://cms.example.org", FIXTURE_TYPE, "en", 1);
  assert.match(url, /populate\[coverImage\]\[populate\]=image/);
});

const SINGLE_FIXTURE_TYPE = Object.freeze({
  uid: "project-platform",
  kind: "single",
  singularName: "project-platform",
  pluralName: "project-platforms",
  populate: Object.freeze(["populate[features]=true"]),
});

test("buildSingleTypeRequestUrl's signature has no parameter capable of requesting drafts", () => {
  assert.equal(
    buildSingleTypeRequestUrl.length,
    3,
    "buildSingleTypeRequestUrl must take exactly (cmsBaseUrl, contentType, locale)",
  );
});

test("buildSingleTypeRequestUrl is published-only, per locale, unpaginated and populated", () => {
  for (const locale of ["en", "tr"]) {
    const url = buildSingleTypeRequestUrl("https://cms.example.org/", SINGLE_FIXTURE_TYPE, locale);
    assert.match(url, /^https:\/\/cms\.example\.org\/api\/project-platform\?/);
    assert.match(url, /(?:\?|&)status=published(?:&|$)/);
    assert.ok(!url.includes("status=draft"));
    assert.match(url, new RegExp(`locale=${locale}`));
    assert.ok(!url.includes("pagination"));
    assert.match(url, /populate\[features\]=true/);
  }
});
