import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

import { CONTENT_TYPES, LOCALES } from "./content-types.mjs";

const API_DIR = new URL("../../apps/cms/src/api/", import.meta.url);
const schemaOf = (uid) => JSON.parse(readFileSync(new URL(`${uid}/content-types/${uid}/schema.json`, API_DIR), "utf8"));

test("the content-type allowlist excludes alumnus", () => {
  const uids = CONTENT_TYPES.map((c) => c.uid);
  assert.ok(!uids.includes("alumnus"), "alumnus must never appear in the allowlist");
  assert.ok(!uids.includes("alumni"), "neither singular nor plural form of Alumni may appear");
});

test("the content-type allowlist is exactly the eight approved types", () => {
  const uids = CONTENT_TYPES.map((c) => c.uid).sort();
  assert.deepEqual(uids, [
    "announcement",
    "galactic-summit",
    "nebula-night",
    "platform-project",
    "project-platform",
    "schedule-event",
    "sponsor",
    "stellar-talk",
  ]);
});

test("every CMS content type except Alumni is backed up, so a new one cannot be silently left out", () => {
  const schemas = readdirSync(API_DIR).filter((uid) => uid !== "alumnus").sort();
  assert.deepEqual(
    CONTENT_TYPES.map((c) => c.uid).sort(),
    schemas,
    "a content type under apps/cms/src/api/ is missing from (or extra in) the backup allowlist",
  );
});

test("each entry's kind and API names match its schema.json", () => {
  for (const contentType of CONTENT_TYPES) {
    const { kind, info } = schemaOf(contentType.uid);
    assert.equal(contentType.kind, kind === "singleType" ? "single" : "collection", `${contentType.uid}: kind`);
    assert.equal(contentType.pluralName, info.pluralName, `${contentType.uid}: pluralName`);
    if (contentType.kind === "single") {
      assert.equal(contentType.singularName, info.singularName, `${contentType.uid}: singularName`);
    }
  }
});

test("every component, media and relation attribute in each schema.json has a populate entry", () => {
  for (const contentType of CONTENT_TYPES) {
    const { attributes } = schemaOf(contentType.uid);
    for (const [name, attribute] of Object.entries(attributes)) {
      if (!["component", "media", "relation", "dynamiczone"].includes(attribute.type)) continue;
      assert.ok(
        contentType.populate.some((fragment) => fragment.startsWith(`populate[${name}]`)),
        `${contentType.uid}: "${name}" (${attribute.type}) has no populate entry, so the API would not return it`,
      );
    }
  }
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
  "platform-project": ["coverImage"],
  "project-platform": ["features"],
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
