import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../apps/web/app/[locale]/page.tsx", import.meta.url),
  "utf8",
);

test("home remains a static Server Component", () => {
  assert.doesNotMatch(source, /["']use client["']/);
  assert.match(source, /export const dynamic = "error"/);
  assert.match(source, /export const revalidate = false/);
  assert.doesNotMatch(source, /searchParams|Date\.now|new Date|fetch\s*\(/);
});

test("home composes owner handoffs in the agreed order", () => {
  const components = [
    "<HomeHero",
    "<TimelineSection",
    "<MissionArchiveSection",
    "<EventsSection",
  ];
  const positions = components.map((component) => source.indexOf(component));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.match(source, /sponsorHref=\{FORM_LINKS\.connect\}/);
});

test("home owns only timeline rhythm and hides its zero-state wrapper", () => {
  assert.match(source, /empty:hidden/);
  assert.match(source, /--space-section/);
  assert.match(source, /--space-section-lg/);
});

test("home publishes bilingual canonical and hreflang metadata", () => {
  assert.match(source, /canonical: homePath\(locale\)/);
  assert.match(source, /en: homePath\("en"\)/);
  assert.match(source, /tr: homePath\("tr"\)/);
  assert.match(source, /"x-default": homePath\(DEFAULT_LOCALE\)/);
});
