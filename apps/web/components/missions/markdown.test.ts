import assert from "node:assert/strict";
import test from "node:test";

import { parseMissionBody } from "./markdown.ts";

test("safe mission prose parses headings, paragraphs, lists, emphasis, and links", () => {
  const parsed = parseMissionBody(
    "## Objective\n\nBuild a **safe** rocket with [test notes](https://example.com).\n\n- First item\n- *Second* item",
    [],
    "Mission test, en.mdx",
  );
  assert.deepEqual(parsed.blocks.map(({ kind }) => kind), ["heading", "paragraph", "list"]);
});

test("gallery alternatives match index.json order in both locales", () => {
  const paths = ["/missions/one/launch.jpg", "/missions/one/recovery.jpg"];
  const en = parseMissionBody(
    "## Gallery\n\n![Rocket leaving the rail](/missions/one/launch.jpg)\n\n![Parachute opening above the field](/missions/one/recovery.jpg)",
    paths,
    "Mission one, en.mdx",
  );
  const tr = parseMissionBody(
    "## Galeri\n\n![Roketin rampadan ayrılışı](/missions/one/launch.jpg)\n\n![Paraşütün saha üzerinde açılması](/missions/one/recovery.jpg)",
    paths,
    "Mission one, tr.mdx",
  );
  assert.deepEqual(en.gallery.map(({ src }) => src), paths);
  assert.deepEqual(tr.gallery.map(({ src }) => src), paths);
  assert.notEqual(en.gallery[0].alt, tr.gallery[0].alt);
});

test("unsupported MDX, HTML, and unsafe links fail with context", () => {
  for (const body of [
    "import Thing from './thing'",
    "<Component />",
    "## Objective\n\n[unsafe](javascript:alert(1))",
  ]) {
    assert.throws(
      () => parseMissionBody(body, [], "Mission unsafe, en.mdx"),
      /Mission unsafe, en\.mdx/,
    );
  }
});

test("gallery validation rejects missing, extra, duplicate, and empty alternatives", () => {
  assert.throws(
    () => parseMissionBody("## Gallery", ["/expected.jpg"], "missing"),
    /no localized alternative/,
  );
  assert.throws(
    () => parseMissionBody("## Gallery\n\n![Extra](/extra.jpg)", [], "extra"),
    /not listed in index\.json/,
  );
  assert.throws(
    () => parseMissionBody("## Gallery\n\n![One](/one.jpg)\n\n![Again](/one.jpg)", ["/one.jpg"], "duplicate"),
    /more than once/,
  );
  assert.throws(
    () => parseMissionBody("## Gallery\n\n![](/one.jpg)", ["/one.jpg"], "empty"),
    /empty alternative text/,
  );
});
