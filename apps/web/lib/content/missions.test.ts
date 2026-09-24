import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMissionFacts } from "./missions.ts";

const VALID: Record<string, unknown> = {
  year: 2026,
  type: "competition",
  status: "flown",
  patch: "/patches/apogee-1.png",
  launchDate: "2026-06-01",
  apogeeMetres: 1200,
  gallery: ["/gallery/1.jpg"],
  links: [{ label: "Flight report", url: "https://example.com/report" }],
  team: [{ name: "Ada", role: "Lead" }],
};

test("a well-formed Mission validates", () => {
  const facts = validateMissionFacts(VALID, "apogee-1");
  assert.equal(facts.id, "apogee-1");
  assert.equal(facts.year, 2026);
  assert.equal(facts.apogeeMetres, 1200);
});

test("a non-numeric apogeeMetres throws, naming the entry and field", () => {
  const raw = { ...VALID, apogeeMetres: "high" };
  assert.throws(
    () => validateMissionFacts(raw, "apogee-1"),
    /Mission "apogee-1".*"apogeeMetres"/,
  );
});

test("a missing required fact (year) throws", () => {
  const raw = { ...VALID };
  delete raw.year;
  assert.throws(() => validateMissionFacts(raw, "apogee-1"), /Mission "apogee-1".*"year"/);
});

test("an invalid type enum value throws", () => {
  const raw = { ...VALID, type: "hobby" };
  assert.throws(() => validateMissionFacts(raw, "apogee-1"), /"type"/);
});

test("an invalid lifecycle status enum value throws", () => {
  const raw = { ...VALID, status: "cancelled" };
  assert.throws(() => validateMissionFacts(raw, "apogee-1"), /"status"/);
});

test("an invalid launchDate throws", () => {
  const raw = { ...VALID, launchDate: "not-a-date" };
  assert.throws(() => validateMissionFacts(raw, "apogee-1"), /"launchDate"/);
});

test("optional facts default to null when absent", () => {
  const raw = { ...VALID };
  delete raw.launchDate;
  delete raw.apogeeMetres;
  delete raw.competition;
  const facts = validateMissionFacts(raw, "apogee-1");
  assert.equal(facts.launchDate, null);
  assert.equal(facts.apogeeMetres, null);
  assert.equal(facts.competition, null);
});

test("a malformed team entry throws", () => {
  const raw = { ...VALID, team: [{ name: "Ada" }] };
  assert.throws(() => validateMissionFacts(raw, "apogee-1"), /"team\[0\]"/);
});
