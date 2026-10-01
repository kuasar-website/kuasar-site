import { test } from "node:test";
import assert from "node:assert/strict";

import { MediaImageError, toMediaImage, type StrapiImage } from "./image.ts";

const SOURCE = { collection: "Nebula Night", entry: "interstellar-2026", field: "photos[0]" };
const BUILD = { mode: "production" };

function image(overrides: Partial<NonNullable<StrapiImage["image"]>> = {}, alts: Partial<StrapiImage> = {}): StrapiImage {
  return {
    image: { url: "https://media.kuasar.org/nebula_a1b2.jpg", width: 3000, height: 2000, ...overrides },
    altEn: "Audience watching the screening under the stars",
    altTr: "Yıldızların altında gösterimi izleyen seyirciler",
    ...alts,
  };
}

test("maps a media-host image to render data with the English alt on /en", () => {
  assert.deepEqual(toMediaImage(image(), "en", SOURCE, BUILD), {
    src: "https://media.kuasar.org/nebula_a1b2.jpg",
    width: 3000,
    height: 2000,
    alt: "Audience watching the screening under the stars",
    unoptimized: false,
  });
});

test("uses the Turkish alt on /tr, with ş ğ İ ı intact", () => {
  const alt = "Apogee-1'in şafakta fırlatılışı — İstanbul, ğ";
  assert.equal(toMediaImage(image({}, { altTr: alt }), "tr", SOURCE, BUILD)?.alt, alt);
});

test("an absent optional image is allowed and needs no alt", () => {
  assert.equal(toMediaImage(null, "en", SOURCE, BUILD), null);
  assert.equal(toMediaImage(undefined, "tr", SOURCE, BUILD), null);
  assert.equal(toMediaImage({ image: null, altEn: null, altTr: null }, "tr", SOURCE, BUILD), null);
});

for (const [label, url] of [
  ["r2.dev", "https://pub-0123456789abcdef.r2.dev/nebula_a1b2.jpg"],
  ["the R2 S3 endpoint", "https://0123456789abcdef.r2.cloudflarestorage.com/kuasar-media/nebula_a1b2.jpg"],
  ["the CMS host", "https://kuasar-cms.onrender.com/uploads/nebula_a1b2.jpg"],
  ["a relative /uploads path", "/uploads/nebula_a1b2.jpg"],
] as const) {
  test(`build refuses ${label}, naming the entry and field`, () => {
    assert.throws(
      () => toMediaImage(image({ url }), "en", SOURCE, BUILD),
      (err: unknown) =>
        err instanceof MediaImageError &&
        err.message.includes('Nebula Night "interstellar-2026", field photos[0]') &&
        err.message.includes("https://media.kuasar.org"),
    );
  });
}

test("build refuses an image without width", () => {
  assert.throws(() => toMediaImage(image({ width: null }), "en", SOURCE, BUILD), /width\/height/);
});

test("build refuses an image without height", () => {
  assert.throws(() => toMediaImage(image({ height: undefined }), "tr", SOURCE, BUILD), /width\/height/);
});

test("refuses an empty English alt on /en", () => {
  assert.throws(() => toMediaImage(image({}, { altEn: "   " }), "en", SOURCE, BUILD), /English \(altEn\)/);
});

test("refuses an empty Turkish alt on /tr", () => {
  assert.throws(() => toMediaImage(image({}, { altTr: null }), "tr", SOURCE, BUILD), /Turkish \(altTr\)/);
});

test("in next dev only, a non-media host renders unoptimised instead of failing", () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const dev = { mode: "development", cmsOrigin: "http://localhost:1337" };
    assert.deepEqual(toMediaImage(image({ url: "/uploads/nebula_a1b2.jpg" }), "en", SOURCE, dev), {
      src: "http://localhost:1337/uploads/nebula_a1b2.jpg",
      width: 3000,
      height: 2000,
      alt: "Audience watching the screening under the stars",
      unoptimized: true,
    });
    assert.throws(() => toMediaImage(image({ url: "/uploads/nebula_a1b2.jpg" }), "en", SOURCE, BUILD));
  } finally {
    console.warn = warn;
  }
});

test("dev mode does not relax the alt or dimension rules", () => {
  const dev = { mode: "development" };
  assert.throws(() => toMediaImage(image({}, { altTr: "" }), "tr", SOURCE, dev), /altTr/);
  assert.throws(() => toMediaImage(image({ width: 0 }), "en", SOURCE, dev), /width\/height/);
});
