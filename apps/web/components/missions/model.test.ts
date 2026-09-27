import assert from "node:assert/strict";
import test from "node:test";

import type { Mission } from "../../lib/content/missions.ts";
import {
  archivePath,
  detailAlternates,
  findMissionView,
  formatApogee,
  missionViews,
} from "./model.ts";

function mission(id: string, year: number, enSlug = `${id}-en`, trSlug = `${id}-tr`): Mission {
  return {
    id,
    facts: {
      id,
      year,
      type: "test",
      competition: null,
      status: "flown",
      launchDate: "2026-05-10",
      apogeeMetres: null,
      patch: `/missions/${id}/patch.png`,
      gallery: [],
      links: [],
      team: [],
    },
    locales: {
      en: {
        slug: enSlug,
        body: "## Objective\n\nTest.",
        fields: { name: `Mission ${id}`, summary: "English summary." },
      },
      tr: {
        slug: trSlug,
        body: "## Amaç\n\nTest.",
        fields: { name: `${id} Görevi`, summary: "Türkçe özet." },
      },
    },
  };
}

test("zero missions returns an empty archive model", () => {
  assert.deepEqual(missionViews("en", []), []);
});

test("missions sort newest-first with stable id tie-breaking", () => {
  const views = missionViews("en", [mission("zeta", 2025), mission("alpha", 2025), mission("new", 2026)]);
  assert.deepEqual(views.map(({ id }) => id), ["new", "alpha", "zeta"]);
});

test("fifty missions remain present after normalization", () => {
  const input = Array.from({ length: 50 }, (_, index) => mission(`mission-${index}`, 2050 - index));
  assert.equal(missionViews("tr", input).length, 50);
});

test("localized paths, lookup, and alternates use authored slugs", () => {
  const input = [mission("flight", 2026, "flight-record", "ucus-kaydi")];
  const view = findMissionView("tr", "ucus-kaydi", input);
  assert.ok(view);
  assert.equal(archivePath("en"), "/en/missions");
  assert.equal(archivePath("tr"), "/tr/gorevler");
  assert.equal(view.href, "/tr/gorevler/ucus-kaydi");
  assert.equal(view.alternateHref, "/en/missions/flight-record");
  assert.deepEqual(detailAlternates(view), {
    canonical: "/tr/gorevler/ucus-kaydi",
    languages: {
      en: "/en/missions/flight-record",
      tr: "/tr/gorevler/ucus-kaydi",
      "x-default": "/en/missions/flight-record",
    },
  });
  assert.equal(findMissionView("en", "missing", input), null);
});

test("apogee formatting is localized and null stays explicit", () => {
  assert.equal(formatApogee(null, "en", "Not yet confirmed"), "Not yet confirmed");
  assert.equal(formatApogee(12345, "en", "missing"), "12,345 m");
  assert.equal(formatApogee(12345, "tr", "missing"), "12.345 m");
});

test("missing localized name fails with mission and locale context", () => {
  const valid = mission("missing-name", 2026);
  const invalid: Mission = {
    ...valid,
    locales: {
      ...valid.locales,
      en: {
        ...valid.locales.en,
        fields: { ...valid.locales.en.fields, name: null },
      },
    },
  };
  assert.throws(() => missionViews("en", [invalid]), /missing-name.*en\.mdx.*name/);
});
