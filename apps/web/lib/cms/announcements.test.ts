import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapAnnouncement,
  orderAnnouncements,
  selectAnnouncementLocale,
  type AnnouncementLocaleContent,
} from "./announcements.ts";

const VALID: Record<string, unknown> = {
  documentId: "doc-1",
  locale: "en",
  title: "Launch success",
  slug: "launch-success",
  excerpt: "A short excerpt.",
  body: "Full body text.",
  pinned: false,
  publishedAt: "2026-06-01T10:00:00.000Z",
  coverImage: { url: "https://media.example/launch.jpg" },
};

test("a well-formed Strapi response maps successfully", () => {
  const mapped = mapAnnouncement(VALID);
  assert.equal(mapped.title, "Launch success");
  assert.equal(mapped.locale, "en");
  assert.deepEqual(mapped.coverImage, { url: "https://media.example/launch.jpg" });
});

test("coverImage is null when absent", () => {
  const raw = { ...VALID };
  delete raw.coverImage;
  const mapped = mapAnnouncement(raw);
  assert.equal(mapped.coverImage, null);
});

test("a missing required field throws, naming it", () => {
  const raw = { ...VALID };
  delete raw.title;
  assert.throws(() => mapAnnouncement(raw), /"title"/);
});

test("a wrong-typed field throws", () => {
  const raw = { ...VALID, pinned: "yes" };
  assert.throws(() => mapAnnouncement(raw), /"pinned"/);
});

test("an invalid locale throws", () => {
  const raw = { ...VALID, locale: "de" };
  assert.throws(() => mapAnnouncement(raw), /"locale"/);
});

function makeEntry(
  overrides: Partial<AnnouncementLocaleContent>,
): AnnouncementLocaleContent {
  return mapAnnouncement({ ...VALID, ...overrides });
}

test("pinned entries sort before unpinned regardless of publishedAt", () => {
  const older_pinned = makeEntry({
    documentId: "a",
    pinned: true,
    publishedAt: "2020-01-01T00:00:00.000Z",
  });
  const newer_unpinned = makeEntry({
    documentId: "b",
    pinned: false,
    publishedAt: "2026-01-01T00:00:00.000Z",
  });

  const ordered = orderAnnouncements([newer_unpinned, older_pinned]);
  assert.deepEqual(
    ordered.map((e) => e.documentId),
    ["a", "b"],
  );
});

test("entries within the same group sort by publishedAt descending", () => {
  const first = makeEntry({ documentId: "a", publishedAt: "2026-01-01T00:00:00.000Z" });
  const second = makeEntry({ documentId: "b", publishedAt: "2026-06-01T00:00:00.000Z" });
  const third = makeEntry({ documentId: "c", publishedAt: "2026-03-01T00:00:00.000Z" });

  const ordered = orderAnnouncements([first, second, third]);
  assert.deepEqual(
    ordered.map((e) => e.documentId),
    ["b", "c", "a"],
  );
});

test("ordering handles zero, one, and many entries", () => {
  assert.deepEqual(orderAnnouncements([]), []);
  assert.equal(orderAnnouncements([makeEntry({})]).length, 1);
  assert.equal(orderAnnouncements([makeEntry({}), makeEntry({}), makeEntry({})]).length, 3);
});

test("selectAnnouncementLocale returns the requested locale when present", () => {
  const en = makeEntry({ documentId: "d", locale: "en" });
  const tr = makeEntry({ documentId: "d", locale: "tr", title: "Başarılı fırlatma" });

  const selected = selectAnnouncementLocale("d", "tr", { en, tr });
  assert.equal(selected.locale, "tr");
  assert.equal(selected.title, "Başarılı fırlatma");
});

test("selectAnnouncementLocale falls back to en silently when tr is absent", () => {
  const en = makeEntry({ documentId: "d", locale: "en" });

  const selected = selectAnnouncementLocale("d", "tr", { en });
  assert.equal(selected.locale, "en");
});

test("selectAnnouncementLocale throws when neither locale is present", () => {
  assert.throws(() => selectAnnouncementLocale("d", "tr", {}), /"d"/);
});

test("selectAnnouncementLocale throws when variants disagree on documentId", () => {
  const en = makeEntry({ documentId: "d", locale: "en" });
  const tr = makeEntry({ documentId: "different", locale: "tr" });

  assert.throws(() => selectAnnouncementLocale("d", "tr", { en, tr }), /does not match/);
});
