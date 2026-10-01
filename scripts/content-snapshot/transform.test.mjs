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

// --- Regression coverage for PR #34 review findings ---------------------
// Both findings traced to the same root cause: content-types.mjs omitted a
// populate entry for a field that needs no *deep* populate but still needs
// to be requested at all (see content-types.test.mjs's new populate-
// completeness test for the structural fix). These tests prove transform.mjs
// itself correctly PRESERVES such fields once the raw API response actually
// contains them — i.e. that the bug was in the populate list, not here.

test("reduceEntry for galactic-summit preserves two full programme items unchanged, modulo key order", () => {
  const entry = reduceEntry(
    "galactic-summit",
    {
      documentId: "summit-2029",
      year: 2029,
      programme: [
        { time: "09:00", title: "Opening", description: "Welcome address" },
        { time: "10:30", title: "Panel: Propulsion", description: "Three teams compare notes" },
      ],
    },
    "en",
  );
  assert.deepEqual(entry.programme, [
    { description: "Welcome address", time: "09:00", title: "Opening" },
    { description: "Three teams compare notes", time: "10:30", title: "Panel: Propulsion" },
  ]);
});

test("reduceEntry for galactic-summit does not silently convert a present, non-empty programme to []", () => {
  const entry = reduceEntry(
    "galactic-summit",
    { documentId: "summit-2029", year: 2029, programme: [{ time: "09:00", title: "Opening", description: "" }] },
    "en",
  );
  assert.equal(entry.programme.length, 1);
  assert.notDeepEqual(entry.programme, []);
});

test("reduceEntry for sponsor preserves a full, non-empty Sponsor record including the summits relation", () => {
  const entry = reduceEntry(
    "sponsor",
    {
      documentId: "sponsor-acme",
      name: "Acme Propulsion",
      logo: {
        image: { url: "https://media.kuasar.org/acme-logo.png" },
        altEn: "Acme Propulsion logo",
        altTr: "Acme Propulsion logosu",
      },
      logoLight: {
        image: { url: "https://media.kuasar.org/acme-logo-light.png" },
        altEn: "Acme Propulsion logo (light)",
        altTr: "Acme Propulsion logosu (açık)",
      },
      url: "https://acme.example",
      since: 2024,
      isCurrent: true,
      blurb: "A long-time KUASAR sponsor.",
      summits: [{ documentId: "summit-2029" }, { documentId: "summit-2030" }],
    },
    "en",
  );
  assert.deepEqual(entry, {
    blurb: "A long-time KUASAR sponsor.",
    documentId: "sponsor-acme",
    isCurrent: true,
    locale: "en",
    logo: {
      altEn: "Acme Propulsion logo",
      altTr: "Acme Propulsion logosu",
      url: "https://media.kuasar.org/acme-logo.png",
    },
    logoLight: {
      altEn: "Acme Propulsion logo (light)",
      altTr: "Acme Propulsion logosu (açık)",
      url: "https://media.kuasar.org/acme-logo-light.png",
    },
    name: "Acme Propulsion",
    since: 2024,
    summits: [{ documentId: "summit-2029" }, { documentId: "summit-2030" }],
    url: "https://acme.example",
  });
  assert.notDeepEqual(entry.summits, [], "a sponsor with real relations must not serialize summits as []");
});

test("reduceEntry for nebula-night preserves a full, non-empty entry", () => {
  const entry = reduceEntry(
    "nebula-night",
    {
      documentId: "nebula-1",
      date: "2026-11-01T20:00:00.000Z",
      title: "Nebula Night: Interstellar",
      description: "A screening under the stars.",
      filmTitle: "Interstellar",
      photos: [
        { image: { url: "https://media.kuasar.org/n1.jpg" }, altEn: "Crowd", altTr: "Kalabalık" },
      ],
    },
    "en",
  );
  assert.deepEqual(entry, {
    date: "2026-11-01T20:00:00.000Z",
    description: "A screening under the stars.",
    documentId: "nebula-1",
    filmTitle: "Interstellar",
    locale: "en",
    photos: [{ altEn: "Crowd", altTr: "Kalabalık", url: "https://media.kuasar.org/n1.jpg" }],
    title: "Nebula Night: Interstellar",
  });
});

test("reduceEntry for schedule-event preserves a full, non-empty entry", () => {
  const entry = reduceEntry(
    "schedule-event",
    {
      documentId: "event-1",
      startsAt: "2026-12-01T18:00:00.000Z",
      endsAt: "2026-12-01T20:00:00.000Z",
      type: "talk",
      location: "Main hall",
      title: "Avionics deep dive",
      description: "A closer look at the flight computer.",
      url: "https://kuasar.org/events/avionics",
    },
    "en",
  );
  assert.deepEqual(entry, {
    description: "A closer look at the flight computer.",
    documentId: "event-1",
    endsAt: "2026-12-01T20:00:00.000Z",
    locale: "en",
    location: "Main hall",
    startsAt: "2026-12-01T18:00:00.000Z",
    title: "Avionics deep dive",
    type: "talk",
    url: "https://kuasar.org/events/avionics",
  });
});
