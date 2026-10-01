import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sortKeysDeep,
  reduceImage,
  reduceMedia,
  reduceRelation,
  warnUnexpectedKeys,
  reduceEntry,
} from "./transform.mjs";

test("sortKeysDeep produces the same output regardless of input key order", () => {
  const a = { b: 1, a: { d: 2, c: [{ y: 1, x: 2 }] } };
  const b = { a: { c: [{ x: 2, y: 1 }], d: 2 }, b: 1 };
  assert.deepEqual(JSON.stringify(sortKeysDeep(a)), JSON.stringify(sortKeysDeep(b)));
});

test("reduceImage keeps only url, altEn, altTr from a shared.image component", () => {
  const result = reduceImage({
    id: 42,
    image: { id: 7, url: "https://media.kuasar.org/x.jpg", hash: "abc", provider: "aws-s3" },
    altEn: "A rocket",
    altTr: "Bir roket",
  });
  assert.deepEqual(result, {
    url: "https://media.kuasar.org/x.jpg",
    altEn: "A rocket",
    altTr: "Bir roket",
  });
});

test("reduceImage returns null for an absent image field", () => {
  assert.equal(reduceImage(null), null);
  assert.equal(reduceImage(undefined), null);
});

test("reduceMedia keeps only the url of a direct media field (hoverVideo, sponsorshipPdf)", () => {
  const result = reduceMedia({
    id: 9,
    url: "https://media.kuasar.org/sponsorship.pdf",
    mime: "application/pdf",
    provider: "aws-s3",
  });
  assert.deepEqual(result, { url: "https://media.kuasar.org/sponsorship.pdf" });
});

test("reduceMedia returns null when the field is empty", () => {
  assert.equal(reduceMedia(null), null);
});

test("reduceRelation reduces a populated relation to documentId references only", () => {
  const result = reduceRelation([
    { id: 1, documentId: "doc-a", name: "Acme" },
    { id: 2, documentId: "doc-b", name: "Beta" },
  ]);
  assert.deepEqual(result, [{ documentId: "doc-a" }, { documentId: "doc-b" }]);
});

test("reduceRelation returns an empty array for a missing/empty relation", () => {
  assert.deepEqual(reduceRelation(null), []);
  assert.deepEqual(reduceRelation(undefined), []);
});

test("warnUnexpectedKeys warns on an unanticipated field (e.g. an unexpected relation) and does not throw", () => {
  const originalWarn = console.warn;
  const messages = [];
  console.warn = (msg) => messages.push(msg);
  try {
    warnUnexpectedKeys(
      { documentId: "x", name: "Acme", alumniRelation: [{ documentId: "should-never-appear" }] },
      ["name"],
      "sponsor",
    );
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(messages.length, 1);
  assert.match(messages[0], /alumniRelation/);
});

test("reduceEntry for galactic-summit drops an unexpected Alumni-shaped relation entirely", () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  let entry;
  try {
    entry = reduceEntry(
      "galactic-summit",
      {
        documentId: "summit-2029",
        year: 2029,
        sponsors: [{ documentId: "sponsor-1" }],
        // An unexpected field a future schema/API change might introduce —
        // must never reach the snapshot output.
        alumniRelation: [{ documentId: "alum-1" }],
      },
      "en",
    );
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(entry.alumniRelation, undefined);
  assert.deepEqual(JSON.stringify(entry).includes("alum-1"), false);
});

test("reduceEntry for galactic-summit reduces the nested speakers.portrait component", () => {
  const entry = reduceEntry(
    "galactic-summit",
    {
      documentId: "summit-2029",
      year: 2029,
      speakers: [
        {
          speakerName: "Dr. Orbit",
          role: "Keynote",
          portrait: {
            image: { url: "https://media.kuasar.org/orbit.jpg" },
            altEn: "Dr. Orbit portrait",
            altTr: "Dr. Orbit portresi",
          },
        },
      ],
    },
    "en",
  );
  assert.deepEqual(entry.speakers, [
    {
      speakerName: "Dr. Orbit",
      role: "Keynote",
      portrait: {
        url: "https://media.kuasar.org/orbit.jpg",
        altEn: "Dr. Orbit portrait",
        altTr: "Dr. Orbit portresi",
      },
    },
  ]);
});

test("reduceEntry for announcement preserves the exact slug value verbatim", () => {
  const entry = reduceEntry(
    "announcement",
    { documentId: "ann-1", title: "Launch Day", slug: "launch-day-exact-slug" },
    "en",
  );
  assert.equal(entry.slug, "launch-day-exact-slug");
});

test("reduceEntry for stellar-talk reduces the direct hoverVideo media field", () => {
  const entry = reduceEntry(
    "stellar-talk",
    {
      documentId: "talk-1",
      speakerName: "Dr. Orbit",
      eventNumber: 3,
      hoverVideo: { url: "https://media.kuasar.org/hover.mp4", mime: "video/mp4" },
    },
    "en",
  );
  assert.deepEqual(entry.hoverVideo, { url: "https://media.kuasar.org/hover.mp4" });
});

test("reduceEntry for galactic-summit reduces the direct sponsorshipPdf media field", () => {
  const entry = reduceEntry(
    "galactic-summit",
    { documentId: "summit-2029", year: 2029, sponsorshipPdf: { url: "https://media.kuasar.org/s.pdf" } },
    "en",
  );
  assert.deepEqual(entry.sponsorshipPdf, { url: "https://media.kuasar.org/s.pdf" });
});
