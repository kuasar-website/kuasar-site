import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAnnouncementDate } from "./date.ts";

test("announcementDate renders date and 24-hour time in Europe/Istanbul, both locales", () => {
  // 11:30 UTC is 14:30 in Istanbul (UTC+3, no DST).
  assert.equal(formatAnnouncementDate("2026-10-05T11:30:00.000Z", "en"), "Monday, October 5, 2026 · 14:30");
  assert.equal(formatAnnouncementDate("2026-10-05T11:30:00.000Z", "tr"), "5 Ekim 2026 Pazartesi · 14:30");
});

test("the Istanbul calendar day is used, not the UTC one", () => {
  // 22:30 UTC on the 4th is 01:30 on the 5th in Istanbul.
  assert.equal(formatAnnouncementDate("2026-10-04T22:30:00.000Z", "en"), "Monday, October 5, 2026 · 01:30");
});

test("an invalid value fails loudly", () => {
  assert.throws(() => formatAnnouncementDate("not-a-date", "en"), /announcementDate/);
});
