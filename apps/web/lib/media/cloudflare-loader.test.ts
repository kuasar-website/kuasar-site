import { test } from "node:test";
import assert from "node:assert/strict";

import cloudflareLoader, { snapWidth } from "./cloudflare-loader.ts";
import { MEDIA_WIDTHS } from "./sizes.ts";

const SRC = "https://media.kuasar.org/launch_apogee_1_a1b2c3.jpg";

test("emits a same-zone Cloudflare edge transformation URL", () => {
  assert.equal(
    cloudflareLoader({ src: SRC, width: 1080 }),
    "https://media.kuasar.org/cdn-cgi/image/width=1080,quality=75,format=auto,onerror=redirect/launch_apogee_1_a1b2c3.jpg",
  );
});

test("never points at Vercel's optimiser", () => {
  assert.doesNotMatch(cloudflareLoader({ src: SRC, width: 640 }), /\/_next\/image/);
});

test("ignores a requested quality — one quality keeps the transformation count bounded", () => {
  assert.match(cloudflareLoader({ src: SRC, width: 640, quality: 100 }), /quality=75,/);
});

test("every configured width passes through unchanged", () => {
  for (const width of MEDIA_WIDTHS) {
    assert.match(cloudflareLoader({ src: SRC, width }), new RegExp(`width=${width},`));
  }
});

test("an unexpected width snaps into the set instead of minting a new transformation", () => {
  assert.equal(snapWidth(700), 1080);
  assert.equal(snapWidth(1), 256);
  assert.equal(snapWidth(5000), 2048);
  for (const width of [1, 300, 999, 1601, 9999]) {
    assert.ok(MEDIA_WIDTHS.includes(snapWidth(width)), `snapWidth(${width}) is outside the set`);
  }
});

test("keeps percent-encoded object keys intact", () => {
  assert.match(
    cloudflareLoader({ src: "https://media.kuasar.org/f%C4%B1rlatma_%C5%9Fafak.jpg", width: 640 }),
    /onerror=redirect\/f%C4%B1rlatma_%C5%9Fafak\.jpg$/,
  );
});

for (const [label, src] of [
  ["r2.dev", "https://pub-0123456789abcdef.r2.dev/launch.jpg"],
  ["the R2 S3 endpoint", "https://0123456789abcdef.r2.cloudflarestorage.com/kuasar-media/launch.jpg"],
  ["the CMS host", "https://kuasar-cms.onrender.com/uploads/launch.jpg"],
  ["a relative /uploads path", "/uploads/launch.jpg"],
  ["a local /public asset", "/next.svg"],
] as const) {
  test(`refuses ${label}`, () => {
    assert.throws(() => cloudflareLoader({ src, width: 640 }), /\[media\].*media\.kuasar\.org/);
  });
}
