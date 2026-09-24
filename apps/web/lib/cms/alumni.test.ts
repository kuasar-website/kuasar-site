import { test } from "node:test";
import assert from "node:assert/strict";
import { mapAlumnus, groupAndOrderAlumni, type PublicAlumni } from "./alumni.ts";

const VALID: Record<string, unknown> = {
  documentId: "doc-1",
  locale: "en",
  name: "Ada Lovelace",
  yearJoined: 2020,
  yearLeft: 2024,
  subTeam: "avionics",
  roleHeld: "Avionics Lead",
  linkedinUrl: "https://linkedin.com/in/example",
  photo: { url: "https://media.example/ada.jpg" },
  consentRecordedAt: "2024-06-01",
  consentSource: "Signed consent form, June 2024",
};

test("a well-formed record with valid consent maps with its photo included", () => {
  const mapped = mapAlumnus(VALID);
  assert.equal(mapped.name, "Ada Lovelace");
  assert.deepEqual(mapped.photo, { url: "https://media.example/ada.jpg" });
  assert.equal(mapped.subTeam, "avionics");
});

test("a record with no photo maps with photo: null, everything else intact", () => {
  const raw = { ...VALID };
  delete raw.photo;
  const mapped = mapAlumnus(raw);
  assert.equal(mapped.photo, null);
  assert.equal(mapped.name, "Ada Lovelace");
});

test("a photo with missing consentRecordedAt maps with photo: null", () => {
  const raw = { ...VALID };
  delete raw.consentRecordedAt;
  const mapped = mapAlumnus(raw);
  assert.equal(mapped.photo, null);
  assert.equal(mapped.name, "Ada Lovelace");
});

test("a photo with missing consentSource maps with photo: null", () => {
  const raw = { ...VALID };
  delete raw.consentSource;
  const mapped = mapAlumnus(raw);
  assert.equal(mapped.photo, null);
});

test("a photo with an invalid consentRecordedAt maps with photo: null", () => {
  const raw = { ...VALID, consentRecordedAt: "not-a-date" };
  const mapped = mapAlumnus(raw);
  assert.equal(mapped.photo, null);
});

test("a photo with an empty consentSource maps with photo: null", () => {
  const raw = { ...VALID, consentSource: "   " };
  const mapped = mapAlumnus(raw);
  assert.equal(mapped.photo, null);
});

test("a missing name throws", () => {
  const raw = { ...VALID };
  delete raw.name;
  assert.throws(() => mapAlumnus(raw), /"name"/);
});

test("a wrong-typed optional field throws", () => {
  const raw = { ...VALID, yearJoined: "twenty-twenty" };
  assert.throws(() => mapAlumnus(raw), /"yearJoined"/);
});

test("a structurally malformed photo throws even with valid consent present", () => {
  const raw = { ...VALID, photo: "not-an-object" };
  assert.throws(() => mapAlumnus(raw), /"photo"/);
});

test("an invalid subTeam enum value throws", () => {
  const raw = { ...VALID, subTeam: "marketing" };
  assert.throws(() => mapAlumnus(raw), /"subTeam"/);
});

test("optional fields default to null when absent", () => {
  const raw = { ...VALID };
  delete raw.yearJoined;
  delete raw.yearLeft;
  delete raw.subTeam;
  delete raw.roleHeld;
  delete raw.linkedinUrl;
  delete raw.photo;
  const mapped = mapAlumnus(raw);
  assert.equal(mapped.yearJoined, null);
  assert.equal(mapped.yearLeft, null);
  assert.equal(mapped.subTeam, null);
  assert.equal(mapped.roleHeld, null);
  assert.equal(mapped.linkedinUrl, null);
  assert.equal(mapped.photo, null);
});

test("the mapped record has no consentRecordedAt or consentSource property at all", () => {
  const mapped = mapAlumnus(VALID) as unknown as Record<string, unknown>;
  assert.equal("consentRecordedAt" in mapped, false);
  assert.equal("consentSource" in mapped, false);
});

function makeAlumnus(overrides: Partial<Record<string, unknown>>): PublicAlumni {
  return mapAlumnus({ ...VALID, ...overrides });
}

test("groups order newest yearLeft first", () => {
  const left2023 = makeAlumnus({ documentId: "a", name: "Amy", yearLeft: 2023 });
  const left2026 = makeAlumnus({ documentId: "b", name: "Bea", yearLeft: 2026 });

  const groups = groupAndOrderAlumni([left2023, left2026]);
  assert.deepEqual(
    groups.map((g) => g.yearLeft),
    [2026, 2023],
  );
});

test("entries within a group sort alphabetically by name", () => {
  const zoe = makeAlumnus({ documentId: "a", name: "Zoe", yearLeft: 2024 });
  const amy = makeAlumnus({ documentId: "b", name: "Amy", yearLeft: 2024 });

  const [group] = groupAndOrderAlumni([zoe, amy]);
  assert.deepEqual(
    group.members.map((m) => m.name),
    ["Amy", "Zoe"],
  );
});

test("entries with no yearLeft form one trailing group", () => {
  const dated = makeAlumnus({ documentId: "a", name: "Amy", yearLeft: 2024 });

  const rawUndated: Record<string, unknown> = { ...VALID, documentId: "b", name: "Bea" };
  delete rawUndated.yearLeft;
  const undatedEntry = mapAlumnus(rawUndated);

  const groups = groupAndOrderAlumni([dated, undatedEntry]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].yearLeft, 2024);
  assert.equal(groups[1].yearLeft, null);
  assert.deepEqual(
    groups[1].members.map((m) => m.name),
    ["Bea"],
  );
});

test("grouping succeeds on zero, one, and many entries", () => {
  assert.deepEqual(groupAndOrderAlumni([]), []);
  assert.equal(groupAndOrderAlumni([makeAlumnus({})]).length, 1);
  assert.equal(
    groupAndOrderAlumni([
      makeAlumnus({ documentId: "a" }),
      makeAlumnus({ documentId: "b", yearLeft: 2020 }),
      makeAlumnus({ documentId: "c", yearLeft: 2021 }),
    ]).length,
    3,
  );
});
