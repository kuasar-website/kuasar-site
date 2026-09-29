import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTimelineEntryFacts } from "./timeline.ts";

const VALID: Record<string, unknown> = {
  date: "2022-03-01",
  kind: "founding",
};

test("a well-formed Timeline Entry validates", () => {
  const facts = validateTimelineEntryFacts(VALID, "founding");
  assert.equal(facts.kind, "founding");
  assert.equal(facts.date, "2022-03-01");
  assert.equal(facts.image, null);
  assert.equal(facts.link, null);
});

test("an invalid date throws", () => {
  const raw = { ...VALID, date: "not-a-date" };
  assert.throws(
    () => validateTimelineEntryFacts(raw, "founding"),
    /Timeline Entry "founding".*"date"/,
  );
});

test("an invalid kind enum value throws", () => {
  const raw = { ...VALID, kind: "party" };
  assert.throws(() => validateTimelineEntryFacts(raw, "founding"), /"kind"/);
});

test("optional image and link pass through when present", () => {
  const raw = { ...VALID, image: "/timeline/founding.jpg", link: "/en/missions/apogee-1" };
  const facts = validateTimelineEntryFacts(raw, "founding");
  assert.equal(facts.image, "/timeline/founding.jpg");
  assert.equal(facts.link, "/en/missions/apogee-1");
});
