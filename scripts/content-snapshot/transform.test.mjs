import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CONTENT_TYPES } from "./content-types.mjs";

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

test("reduceEntry for announcement keeps announcementDate, the editorial date News sorts by", () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  let entry;
  try {
    entry = reduceEntry(
      "announcement",
      { documentId: "ann-1", title: "Launch Day", announcementDate: "2026-09-10T15:30:00.000Z" },
      "en",
    );
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(entry.announcementDate, "2026-09-10T15:30:00.000Z");
  assert.deepEqual(warnings, [], "announcementDate is an expected field, never dropped as unexpected");
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

// A snapshot that silently drops a schema field cannot restore it. This reads every
// exported type's schema.json, so a field added to a schema without a matching picker
// update fails here (it happened once: Announcement's announcementDate).
test("every attribute of every exported schema is kept by its picker", () => {
  for (const { uid } of CONTENT_TYPES) {
    const schemaUrl = new URL(`../../apps/cms/src/api/${uid}/content-types/${uid}/schema.json`, import.meta.url);
    const attributes = Object.keys(JSON.parse(readFileSync(schemaUrl, "utf8")).attributes);
    const raw = Object.fromEntries([["documentId", "doc-1"], ...attributes.map((name) => [name, null])]);
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(message);
    let entry;
    try {
      entry = reduceEntry(uid, raw, "en");
    } finally {
      console.warn = originalWarn;
    }
    assert.deepEqual(warnings, [], `${uid}: a schema attribute is treated as unexpected`);
    for (const name of attributes) {
      assert.ok(Object.hasOwn(entry, name), `${uid}: schema attribute "${name}" is missing from the snapshot`);
    }
  }
});

// The same guarantee one level down: every field of every component a schema uses is kept.
// shared.image is the one deliberate reduction (the file object becomes its public url).
test("every field of every component used by an exported schema is kept by its picker", () => {
  const componentFields = (name) => {
    const [category, file] = name.split(".");
    const url = new URL(`../../apps/cms/src/components/${category}/${file}.json`, import.meta.url);
    return Object.keys(JSON.parse(readFileSync(url, "utf8")).attributes);
  };
  for (const { uid } of CONTENT_TYPES) {
    const schemaUrl = new URL(`../../apps/cms/src/api/${uid}/content-types/${uid}/schema.json`, import.meta.url);
    const attributes = JSON.parse(readFileSync(schemaUrl, "utf8")).attributes;
    for (const [name, attribute] of Object.entries(attributes)) {
      if (attribute.type !== "component") continue;
      const isImage = attribute.component === "shared.image";
      const item = isImage
        ? { image: { url: "https://media.kuasar.org/x.jpg" }, altEn: "en", altTr: "tr" }
        : Object.fromEntries(componentFields(attribute.component).map((field) => [field, null]));
      const entry = reduceEntry(uid, { documentId: "doc-1", [name]: attribute.repeatable ? [item] : item }, "en");
      const reduced = attribute.repeatable ? entry[name]?.[0] : entry[name];
      if (isImage) {
        assert.deepEqual(reduced, { url: "https://media.kuasar.org/x.jpg", altEn: "en", altTr: "tr" }, `${uid}.${name}: shared.image`);
        continue;
      }
      for (const field of componentFields(attribute.component)) {
        assert.ok(reduced && Object.hasOwn(reduced, field), `${uid}.${name}: component field "${field}" is missing from the snapshot`);
      }
    }
  }
});

test("reduceEntry for platform-project keeps every field, with the cover reduced to url and alts", () => {
  const entry = reduceEntry(
    "platform-project",
    {
      documentId: "proj-1",
      title: "Dummy satellite study",
      summary: "A summary.",
      coverImage: { id: 3, image: { id: 9, url: "https://media.kuasar.org/cover.png", hash: "h" }, altEn: "Cover", altTr: "Kapak" },
      startYear: 2024,
      endYear: 2026,
      projectStatus: "past",
      applicationUrl: "https://example.test/apply",
    },
    "en",
  );
  assert.deepEqual(entry, {
    applicationUrl: "https://example.test/apply",
    coverImage: { altEn: "Cover", altTr: "Kapak", url: "https://media.kuasar.org/cover.png" },
    documentId: "proj-1",
    endYear: 2026,
    locale: "en",
    projectStatus: "past",
    startYear: 2024,
    summary: "A summary.",
    title: "Dummy satellite study",
  });
});

test("reduceEntry for project-platform keeps features in the editor's order", () => {
  const entry = reduceEntry(
    "project-platform",
    {
      documentId: "pp-1",
      intro: "TR giriş",
      whatsappUrl: "https://chat.whatsapp.com/DummyInvite0",
      whatsappLabel: "Katıl",
      features: [
        { id: 4, title: "Proje Desteği", description: "d1" },
        { id: 2, title: "Proje Paylaşımı", description: "d2" },
        { id: 3, title: "Ekip Kurma", description: "d3" },
      ],
    },
    "tr",
  );
  assert.deepEqual(entry.features, [
    { description: "d1", title: "Proje Desteği" },
    { description: "d2", title: "Proje Paylaşımı" },
    { description: "d3", title: "Ekip Kurma" },
  ]);
  assert.equal(entry.whatsappUrl, "https://chat.whatsapp.com/DummyInvite0");
  assert.equal(entry.locale, "tr");
});

test("reduceEntry for resource keeps title, description and the file's URL, original name and MIME type only", () => {
  const entry = reduceEntry(
    "resource",
    {
      documentId: "res-1",
      title: "Avionics training",
      description: "Slides from the autumn session.",
      file: { id: 5, name: "avionics.pdf", url: "https://media.kuasar.org/avionics.pdf", mime: "application/pdf", size: 812.4, hash: "abc", provider: "aws-s3" },
    },
    "en",
  );
  assert.deepEqual(entry, {
    description: "Slides from the autumn session.",
    documentId: "res-1",
    file: { mime: "application/pdf", name: "avionics.pdf", url: "https://media.kuasar.org/avionics.pdf" },
    locale: "en",
    title: "Avionics training",
  });
});
