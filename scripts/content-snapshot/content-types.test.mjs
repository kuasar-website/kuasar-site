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

/**
 * Every component, media, or relation attribute on each of the six schemas
 * must have its own `populate[<attr>]` entry — Strapi's REST API does not
 * return these by default regardless of whether the attribute itself
 * carries further nesting. Built directly from each content type's own
 * schema.json under apps/cms/src/api (verified against the live schemas,
 * not assumed).
 *
 * This test exists specifically because of a real bug found in PR #34
 * review: `galactic-summit`'s `programme` and `sponsor`'s `summits` were
 * both omitted, on the mistaken reasoning that "no nested media/relation
 * means no populate entry needed" — the schema audit in design.md was
 * correct that neither needs *deep* populate, but both still need to be
 * populated at all. This test fails loudly if that mistake recurs, for
 * these fields or any other.
 */
const REQUIRED_POPULATE_ATTRIBUTES = {
  "stellar-talk": ["speakerPortrait", "hoverVideo"],
  "nebula-night": ["photos"],
  "galactic-summit": [
    "sponsors",
    "photos",
    "backgroundImage",
    "sponsorshipPdf",
    "speakers",
    "programme",
  ],
  "schedule-event": [],
  announcement: ["coverImage"],
  sponsor: ["logo", "logoLight", "summits"],
};

test("every component/media/relation attribute has its own populate entry, for every content type", () => {
  for (const contentType of CONTENT_TYPES) {
    const required = REQUIRED_POPULATE_ATTRIBUTES[contentType.uid];
    assert.ok(
      required !== undefined,
      `REQUIRED_POPULATE_ATTRIBUTES is missing an entry for "${contentType.uid}" — update this test's own schema audit`,
    );
    for (const attr of required) {
      const hasEntry = contentType.populate.some((fragment) => fragment.startsWith(`populate[${attr}]`));
      assert.ok(
        hasEntry,
        `${contentType.uid}: expected a populate entry for "${attr}" (populate[${attr}]...), found: ${contentType.populate.join(", ") || "(none)"}`,
      );
    }
  }
});
