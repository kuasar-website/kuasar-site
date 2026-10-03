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
  announcementDate: "2026-06-01T10:00:00.000Z",
  // Strapi's system field, present on every published row; the mapper ignores it.
  publishedAt: "2026-09-30T08:00:00.000Z",
  // The shared.image component, as Strapi 5 returns it with populate.
  coverImage: {
    image: { url: "https://media.kuasar.org/launch.jpg", width: 1600, height: 900 },
    altEn: "Rocket on the pad",
    altTr: "Rampadaki roket",
  },
};

test("a well-formed Strapi response maps successfully", () => {
  const mapped = mapAnnouncement(VALID);
  assert.equal(mapped.title, "Launch success");
  assert.equal(mapped.locale, "en");
  assert.deepEqual(mapped.coverImage, VALID.coverImage);
});

test("coverImage is null when absent", () => {
  const raw = { ...VALID };
  delete raw.coverImage;
  const mapped = mapAnnouncement(raw);
  assert.equal(mapped.coverImage, null);
});

test("a coverImage that is not a component object throws", () => {
  assert.throws(() => mapAnnouncement({ ...VALID, coverImage: "x.jpg" }), /"coverImage"/);
  assert.throws(() => mapAnnouncement({ ...VALID, coverImage: { image: "x.jpg" } }), /"coverImage.image"/);
});

test("optional excerpt and body map to null when Strapi returns null or blank", () => {
  const mapped = mapAnnouncement({ ...VALID, excerpt: null, body: "   " });
  assert.equal(mapped.excerpt, null);
  assert.equal(mapped.body, null);
  const absent = { ...VALID };
  delete absent.excerpt;
  delete absent.body;
  assert.equal(mapAnnouncement(absent).excerpt, null);
});

test("a wrong-typed optional field still throws", () => {
  assert.throws(() => mapAnnouncement({ ...VALID, excerpt: 42 }), /"excerpt"/);
  assert.throws(() => mapAnnouncement({ ...VALID, body: { text: "x" } }), /"body"/);
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

test("pinned entries sort before unpinned regardless of announcementDate", () => {
  const older_pinned = makeEntry({
    documentId: "a",
    pinned: true,
    announcementDate: "2020-01-01T00:00:00.000Z",
  });
  const newer_unpinned = makeEntry({
    documentId: "b",
    pinned: false,
    announcementDate: "2026-01-01T00:00:00.000Z",
  });

  const ordered = orderAnnouncements([newer_unpinned, older_pinned]);
  assert.deepEqual(
    ordered.map((e) => e.documentId),
    ["a", "b"],
  );
});

test("entries within the same group sort by announcementDate descending", () => {
  const first = makeEntry({ documentId: "a", announcementDate: "2026-01-01T00:00:00.000Z" });
  const second = makeEntry({ documentId: "b", announcementDate: "2026-06-01T00:00:00.000Z" });
  const third = makeEntry({ documentId: "c", announcementDate: "2026-03-01T00:00:00.000Z" });

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

test("announcementDate is required and must be a full date-time with an offset", () => {
  const missing = { ...VALID };
  delete missing.announcementDate;
  assert.throws(() => mapAnnouncement(missing), /"announcementDate"/);
  for (const bad of [null, "", "not-a-date", "2026-10-05", "2026-10-05T14:30", "2026-13-01T10:00:00.000Z", 1759660200000]) {
    assert.throws(() => mapAnnouncement({ ...VALID, announcementDate: bad }), /"announcementDate"/, String(bad));
  }
});

test("Strapi's publishedAt is not part of the mapped announcement", () => {
  const mapped = mapAnnouncement(VALID) as unknown as Record<string, unknown>;
  assert.equal("publishedAt" in mapped, false);
  assert.equal(mapped.announcementDate, "2026-06-01T10:00:00.000Z");
});

test("old A, newer B: B comes first", () => {
  const a = makeEntry({ documentId: "a", announcementDate: "2026-09-01T09:00:00.000Z" });
  const b = makeEntry({ documentId: "b", announcementDate: "2026-09-20T09:00:00.000Z" });
  assert.deepEqual(orderAnnouncements([a, b]).map((e) => e.documentId), ["b", "a"]);
});

test("editing and republishing A (Strapi resets its publishedAt) does not move it above B", () => {
  // As Strapi 5.52.3 returns them after A was edited and republished: A's publishedAt is now
  // newer than B's, but announcementDate (editor-set) is unchanged.
  const a = mapAnnouncement({ ...VALID, documentId: "a", announcementDate: "2026-09-01T09:00:00.000Z", publishedAt: "2026-10-03T07:22:45.405Z" });
  const b = mapAnnouncement({ ...VALID, documentId: "b", announcementDate: "2026-09-20T09:00:00.000Z", publishedAt: "2026-09-20T09:00:05.000Z" });
  assert.deepEqual(orderAnnouncements([a, b]).map((e) => e.documentId), ["b", "a"]);
});

test("same calendar day: the later time comes first", () => {
  const morning = makeEntry({ documentId: "m", announcementDate: "2026-10-05T06:00:00.000Z" });
  const evening = makeEntry({ documentId: "e", announcementDate: "2026-10-05T16:45:00.000Z" });
  const noon = makeEntry({ documentId: "n", announcementDate: "2026-10-05T09:00:00.000Z" });
  assert.deepEqual(orderAnnouncements([morning, evening, noon]).map((e) => e.documentId), ["e", "n", "m"]);
});

test("equal announcementDate: documentId breaks the tie, whatever the input order", () => {
  const at = "2026-10-05T09:00:00.000Z";
  const entries = ["c", "a", "b"].map((id) => makeEntry({ documentId: id, announcementDate: at }));
  assert.deepEqual(orderAnnouncements(entries).map((e) => e.documentId), ["a", "b", "c"]);
  assert.deepEqual(orderAnnouncements([...entries].reverse()).map((e) => e.documentId), ["a", "b", "c"]);
});

test("pinned still overrides date ordering", () => {
  const pinnedOld = makeEntry({ documentId: "p", pinned: true, announcementDate: "2024-01-01T00:00:00.000Z" });
  const newest = makeEntry({ documentId: "n", announcementDate: "2026-10-05T16:45:00.000Z" });
  assert.deepEqual(orderAnnouncements([newest, pinnedOld]).map((e) => e.documentId), ["p", "n"]);
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
