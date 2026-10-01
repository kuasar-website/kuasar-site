import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTENT_TYPES, LOCALES } from "./content-types.mjs";

test("the content-type allowlist excludes alumnus", () => {
  const uids = CONTENT_TYPES.map((c) => c.uid);
  assert.ok(!uids.includes("alumnus"), "alumnus must never appear in the allowlist");
  assert.ok(!uids.includes("alumni"), "neither singular nor plural form of Alumni may appear");
});

test("the content-type allowlist is exactly the six approved types", () => {
  const uids = CONTENT_TYPES.map((c) => c.uid).sort();
  assert.deepEqual(uids, [
    "announcement",
    "galactic-summit",
    "nebula-night",
    "schedule-event",
    "sponsor",
    "stellar-talk",
  ]);
});

test("both en and tr are configured as locales to export", () => {
  assert.deepEqual([...LOCALES].sort(), ["en", "tr"]);
});
