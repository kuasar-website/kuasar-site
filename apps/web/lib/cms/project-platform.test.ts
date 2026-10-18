import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapPlatformProject,
  mapProjectPlatform,
  orderPlatformProjects,
  projectYears,
  safeHttpsUrl,
  safeWhatsAppUrl,
  selectLocaleVariants,
} from "./project-platform.ts";

const page = (extra: Record<string, unknown> = {}) => ({
  documentId: "pp000000000000000000", locale: "en", intro: "What the **platform** is.",
  whatsappUrl: null, whatsappLabel: null, features: [], ...extra,
});
const project = (extra: Record<string, unknown> = {}) => ({
  documentId: "prj00000000000000001", locale: "en", title: "CubeSat", summary: "A small satellite.",
  coverImage: null, startYear: 2025, endYear: null, projectStatus: "current", applicationUrl: null, ...extra,
});

test("the page entry maps every field and keeps the features' order", () => {
  const features = [
    { id: 3, title: "Project Sharing", description: "Share ideas." },
    { id: 1, title: "Team Formation", description: "Find people." },
    { id: 2, title: "Project Support", description: "Get help." },
  ];
  const entry = mapProjectPlatform(page({
    whatsappUrl: "https://chat.whatsapp.com/DummyInvite0", whatsappLabel: "  Join us  ", features,
  }));
  assert.equal(entry.intro, "What the **platform** is.");
  assert.equal(entry.whatsappUrl, "https://chat.whatsapp.com/DummyInvite0");
  assert.equal(entry.whatsappLabel, "Join us");
  assert.deepEqual(entry.features.map((f) => f.title), ["Project Sharing", "Team Formation", "Project Support"]);
});

test("zero features and a missing features field are both an empty list", () => {
  assert.deepEqual(mapProjectPlatform(page()).features, []);
  assert.deepEqual(mapProjectPlatform(page({ features: null })).features, []);
});

test("a blank label means the default label", () => {
  assert.equal(mapProjectPlatform(page({ whatsappLabel: "   " })).whatsappLabel, null);
});

test("the page entry's contract violations throw, naming the field", () => {
  assert.throws(() => mapProjectPlatform(page({ intro: "  " })), /field "intro".*runbook/);
  assert.throws(() => mapProjectPlatform(page({ intro: null })), /field "intro"/);
  assert.throws(() => mapProjectPlatform(page({ features: [{ title: "A", description: "" }] })), /features\[0\]\.description/);
  assert.throws(() => mapProjectPlatform(page({ features: [{ description: "x" }] })), /features\[0\]\.title/);
  assert.throws(() => mapProjectPlatform(page({ features: "nope" })), /field "features"/);
  assert.throws(() => mapProjectPlatform(page({ whatsappLabel: 4 })), /whatsappLabel/);
  assert.throws(() => mapProjectPlatform(page({ locale: "de" })), /"locale"/);
  assert.throws(() => mapProjectPlatform([]), /expected an object/);
});

test("WhatsApp links: the four accepted shapes pass, everything else is dropped without throwing", () => {
  for (const ok of [
    "https://chat.whatsapp.com/AbC123", "https://whatsapp.com/channel/0029Va",
    "https://www.whatsapp.com/channel/0029Va", "https://wa.me/905551112233",
  ]) assert.equal(safeWhatsAppUrl(ok), ok);
  for (const bad of [
    "http://chat.whatsapp.com/AbC123", "https://evilwhatsapp.com/x", "https://whatsapp.com.evil.com/x",
    "https://chat.whatsapp.com/", "https://chat.whatsapp.com", "https://example.org/x", "join our group",
    "https://user:pw@chat.whatsapp.com/x", "https://chat.whatsapp.com@evil.com/x", "javascript:alert(1)",
    "https://a.b.whatsapp.com/x", "", null, 42,
  ]) {
    assert.equal(safeWhatsAppUrl(bad), null, String(bad));
    assert.equal(mapProjectPlatform(page({ whatsappUrl: bad })).whatsappUrl, null, String(bad));
  }
});

test("application links: absolute HTTPS only, otherwise dropped without throwing", () => {
  assert.equal(safeHttpsUrl("https://forms.gle/abc"), "https://forms.gle/abc");
  assert.equal(safeHttpsUrl(" https://docs.google.com/forms/d/x/viewform "), "https://docs.google.com/forms/d/x/viewform");
  for (const bad of ["http://forms.gle/abc", "forms.gle/abc", "/apply", "javascript:alert(1)", "https://user:pw@x.org/", "https://x.org/a b", "mailto:a@b.c", "", null, {}]) {
    assert.equal(safeHttpsUrl(bad), null, String(bad));
    assert.equal(mapPlatformProject(project({ applicationUrl: bad })).applicationUrl, null, String(bad));
  }
});

test("a project maps every field", () => {
  const cover = { image: { url: "https://media.kuasar.org/c.jpg", width: 10, height: 10 }, altEn: "a", altTr: "b" };
  const entry = mapPlatformProject(project({
    coverImage: cover, startYear: 2024, endYear: 2026, projectStatus: "past", applicationUrl: "https://forms.gle/x",
  }));
  assert.deepEqual(entry, {
    documentId: "prj00000000000000001", locale: "en", title: "CubeSat", summary: "A small satellite.",
    coverImage: cover, startYear: 2024, endYear: 2026, projectStatus: "past", applicationUrl: "https://forms.gle/x",
  });
});

test("a project's contract violations throw, naming the document and field", () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ title: "" }, /prj00000000000000001 \(en\) field "title"/],
    [{ summary: null }, /field "summary"/],
    [{ startYear: null }, /field "startYear".*integer/],
    [{ startYear: "2025" }, /field "startYear"/],
    [{ startYear: 1899 }, /outside 1900–2100/],
    [{ endYear: 2101 }, /field "endYear".*outside/],
    [{ startYear: 2026, endYear: 2024 }, /field "endYear": 2024 is before startYear 2026/],
    [{ projectStatus: null }, /field "projectStatus"/],
    [{ projectStatus: "upcoming" }, /field "projectStatus"/],
    [{ coverImage: "x.jpg" }, /field "coverImage"/],
    [{ coverImage: { image: [] } }, /field "coverImage"/],
    [{ documentId: "" }, /documentId/],
  ];
  for (const [extra, message] of cases) assert.throws(() => mapPlatformProject(project(extra)), message, JSON.stringify(extra));
});

test("status is the editor's choice, whatever the years say", () => {
  assert.equal(mapPlatformProject(project({ projectStatus: "current", startYear: 2001, endYear: 2002 })).projectStatus, "current");
  assert.equal(mapPlatformProject(project({ projectStatus: "past", endYear: null })).projectStatus, "past");
});

test("years: one year, equal years and a range", () => {
  assert.equal(projectYears(2025, null), "2025");
  assert.equal(projectYears(2025, 2025), "2025");
  assert.equal(projectYears(2024, 2026), "2024–2026");
});

test("order: startYear newest first, then title in the page locale, then documentId", () => {
  const entries = [
    { documentId: "d", title: "Zeta", startYear: 2024 },
    { documentId: "c", title: "Beta", startYear: 2026 },
    { documentId: "b", title: "Alpha", startYear: 2026 },
    { documentId: "a", title: "Alpha", startYear: 2026 },
  ];
  assert.deepEqual(orderPlatformProjects(entries, "en").map((e) => e.documentId), ["a", "b", "c", "d"]);
  // Turkish collation: "Ç" sorts after "C", and "İ" after "I".
  const turkish = [
    { documentId: "1", title: "Çanta", startYear: 2025 },
    { documentId: "2", title: "Deneme", startYear: 2025 },
    { documentId: "3", title: "Cam", startYear: 2025 },
  ];
  assert.deepEqual(orderPlatformProjects(turkish, "tr").map((e) => e.title), ["Cam", "Çanta", "Deneme"]);
  assert.deepEqual(orderPlatformProjects([], "en"), []);
});

test("locale variants: /tr prefers Turkish by document, /en never shows Turkish-only", () => {
  const en = [{ documentId: "a", v: "en-a" }, { documentId: "b", v: "en-b" }];
  const tr = [{ documentId: "a", v: "tr-a" }, { documentId: "c", v: "tr-c" }];
  assert.deepEqual(selectLocaleVariants("tr", en, tr).map((e) => e.v).sort(), ["en-b", "tr-a", "tr-c"]);
  assert.deepEqual(selectLocaleVariants("en", en, tr).map((e) => e.v).sort(), ["en-a", "en-b"]);
});
