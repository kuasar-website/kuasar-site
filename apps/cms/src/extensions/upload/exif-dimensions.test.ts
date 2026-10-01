import { test } from "node:test";
import assert from "node:assert/strict";
import { createReadStream, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { displayDimensions, isQuarterTurn, withDisplayDimensions, type GetDimensions, type SharpFactory } from "./exif-dimensions.ts";

/*
 * Runs against the REAL `sharp` and the REAL Strapi `image-manipulation` service that
 * apps/cms has installed, not stand-ins. That is the point: the extension wraps a Strapi
 * internal, and these tests are what tell whoever upgrades Strapi whether it still fits
 * (docs/ops/cms-runbook.md, "Upgrading Strapi").
 */
const requireFromCms = createRequire(import.meta.url);
const uploadPackageJson = requireFromCms.resolve("@strapi/upload/package.json");
const requireFromUpload = createRequire(uploadPackageJson);
const sharp = requireFromUpload("sharp");
const uploadServerDir = join(dirname(uploadPackageJson), "dist", "server");

type ImageManipulation = { getDimensions: GetDimensions };

function loadStrapiImageManipulation(): ImageManipulation {
  // The plugin's service registry, keyed by the names Strapi looks services up by.
  const { services } = requireFromUpload(join(uploadServerDir, "services", "index.js"));
  return services?.["image-manipulation"];
}

/** A 400×300 JPEG (stored pixels) carrying the given EXIF orientation tag. */
async function photo(dir: string, orientation: number): Promise<string> {
  const file = join(dir, `orientation-${orientation}.jpg`);
  await sharp({ create: { width: 400, height: 300, channels: 3, background: "#808080" } })
    .jpeg()
    .withMetadata({ orientation })
    .toFile(file);
  return file;
}

function withTempDir(run: (dir: string) => Promise<void>): () => Promise<void> {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), "exif-dimensions-test-"));
    try {
      await run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

test("orientations 5–8 are quarter turns; 1–4 and missing are not", () => {
  for (const o of [5, 6, 7, 8]) assert.equal(isQuarterTurn(o), true, `orientation ${o}`);
  for (const o of [undefined, 1, 2, 3, 4]) assert.equal(isQuarterTurn(o), false, `orientation ${o}`);
});

test("displayDimensions swaps only for quarter turns", () => {
  assert.deepEqual(displayDimensions({ width: 400, height: 300 }, 6), { width: 300, height: 400 });
  assert.deepEqual(displayDimensions({ width: 400, height: 300 }, 3), { width: 400, height: 300 });
  assert.deepEqual(displayDimensions({ width: 400, height: 300 }, undefined), { width: 400, height: 300 });
});

test("Strapi's upload plugin still exposes image-manipulation.getDimensions", () => {
  const service = loadStrapiImageManipulation();
  assert.ok(service, "service 'image-manipulation' is gone — re-check strapi-server.ts");
  assert.equal(typeof service.getDimensions, "function", "getDimensions is gone — re-check strapi-server.ts");
});

test(
  "Strapi alone still records STORED dimensions for a rotated photo (if this fails, the swap would double-rotate: remove the extension)",
  withTempDir(async (dir) => {
    const { getDimensions } = loadStrapiImageManipulation();
    assert.deepEqual(await getDimensions({ filepath: await photo(dir, 6) }), { width: 400, height: 300 });
  }),
);

test(
  "wrapped getDimensions records displayed dimensions for all eight orientations, from a file path",
  withTempDir(async (dir) => {
    const wrapped = withDisplayDimensions(loadStrapiImageManipulation().getDimensions, sharp as SharpFactory);
    for (let o = 1; o <= 8; o++) {
      const expected = o >= 5 ? { width: 300, height: 400 } : { width: 400, height: 300 };
      assert.deepEqual(await wrapped({ filepath: await photo(dir, o) }), expected, `orientation ${o}`);
    }
  }),
);

test(
  "wrapped getDimensions also works when Strapi hands over a stream instead of a path",
  withTempDir(async (dir) => {
    const wrapped = withDisplayDimensions(loadStrapiImageManipulation().getDimensions, sharp as SharpFactory);
    const file = await photo(dir, 8);
    assert.deepEqual(await wrapped({ getStream: () => createReadStream(file) }), { width: 300, height: 400 });
  }),
);
