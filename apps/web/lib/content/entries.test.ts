import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEntries } from "./entries.ts";

/** A validator that accepts anything — these tests exercise the engine, not any entity's own facts schema. */
function acceptAnyFacts(raw: unknown): unknown {
  return raw;
}

function withTempContentRoot(run: (contentRoot: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "git-content-pipeline-test-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeEntry(
  contentRoot: string,
  contentType: string,
  entryId: string,
  files: { indexJson?: unknown; en?: string; tr?: string },
): void {
  const entryDir = join(contentRoot, contentType, entryId);
  mkdirSync(entryDir, { recursive: true });
  if (files.indexJson !== undefined) {
    writeFileSync(join(entryDir, "index.json"), JSON.stringify(files.indexJson));
  }
  if (files.en !== undefined) writeFileSync(join(entryDir, "en.mdx"), files.en);
  if (files.tr !== undefined) writeFileSync(join(entryDir, "tr.mdx"), files.tr);
}

const MDX = (slug: string, extra = "") =>
  `---\nslug: ${slug}\n${extra}---\n\nBody for ${slug}.\n`;

test("zero entries: content type directory does not exist", () => {
  withTempContentRoot((root) => {
    const entries = loadEntries("missions", acceptAnyFacts, { contentRoot: root });
    assert.deepEqual(entries, []);
  });
});

test("zero entries: content type directory exists but is empty", () => {
  withTempContentRoot((root) => {
    mkdirSync(join(root, "missions"), { recursive: true });
    const entries = loadEntries("missions", acceptAnyFacts, { contentRoot: root });
    assert.deepEqual(entries, []);
  });
});

test("one entry loads — demonstrates adding an entry is three files and no code edit", () => {
  withTempContentRoot((root) => {
    // Exactly the three files docs/task-assignments.html's acceptance
    // criterion names: index.json, en.mdx, tr.mdx. No loader code changes
    // for this test to pass — loadEntries is the unmodified production
    // function.
    writeEntry(root, "missions", "apogee-1", {
      indexJson: { year: 2026 },
      en: MDX("apogee-1"),
      tr: MDX("gorevler-apogee-1"),
    });

    const entries = loadEntries("missions", acceptAnyFacts, { contentRoot: root });

    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, "apogee-1");
    assert.equal(entries[0].locales.en.slug, "apogee-1");
    assert.equal(entries[0].locales.tr.slug, "gorevler-apogee-1");
  });
});

test("many entries: every valid entry is returned", () => {
  withTempContentRoot((root) => {
    for (const id of ["a", "b", "c"]) {
      writeEntry(root, "missions", id, {
        indexJson: {},
        en: MDX(`${id}-en`),
        tr: MDX(`${id}-tr`),
      });
    }

    const entries = loadEntries("missions", acceptAnyFacts, { contentRoot: root });
    assert.equal(entries.length, 3);
    assert.deepEqual(
      entries.map((e) => e.id).sort(),
      ["a", "b", "c"],
    );
  });
});

test("a missing locale file throws", () => {
  withTempContentRoot((root) => {
    writeEntry(root, "missions", "apogee-1", {
      indexJson: {},
      en: MDX("apogee-1"),
      // no tr.mdx
    });

    assert.throws(
      () => loadEntries("missions", acceptAnyFacts, { contentRoot: root }),
      /apogee-1.*missing tr\.mdx/,
    );
  });
});

test("a missing index.json throws", () => {
  withTempContentRoot((root) => {
    writeEntry(root, "missions", "apogee-1", { en: MDX("apogee-1"), tr: MDX("apogee-1-tr") });
    assert.throws(
      () => loadEntries("missions", acceptAnyFacts, { contentRoot: root }),
      /apogee-1.*missing index\.json/,
    );
  });
});

test("a missing slug throws", () => {
  withTempContentRoot((root) => {
    writeEntry(root, "missions", "apogee-1", {
      indexJson: {},
      en: "---\ntitle: no slug here\n---\n\nBody.\n",
      tr: MDX("apogee-1-tr"),
    });

    assert.throws(
      () => loadEntries("missions", acceptAnyFacts, { contentRoot: root }),
      /apogee-1.*"slug"/,
    );
  });
});

test("an empty slug throws", () => {
  withTempContentRoot((root) => {
    writeEntry(root, "missions", "apogee-1", {
      indexJson: {},
      en: "---\nslug: \n---\n\nBody.\n",
      tr: MDX("apogee-1-tr"),
    });

    assert.throws(() => loadEntries("missions", acceptAnyFacts, { contentRoot: root }), /"slug"/);
  });
});

test("status: incomplete on tr.mdx surfaces as translationStatus, en.mdx stays undefined", () => {
  withTempContentRoot((root) => {
    writeEntry(root, "missions", "apogee-1", {
      indexJson: {},
      en: MDX("apogee-1"),
      tr: MDX("apogee-1-tr", "status: incomplete\n"),
    });

    const [entry] = loadEntries("missions", acceptAnyFacts, { contentRoot: root });
    assert.equal(entry.locales.tr.translationStatus, "incomplete");
    assert.equal(entry.locales.en.translationStatus, undefined);
  });
});

test("an unrecognized status value throws rather than being silently accepted", () => {
  withTempContentRoot((root) => {
    writeEntry(root, "missions", "apogee-1", {
      indexJson: {},
      en: MDX("apogee-1"),
      tr: MDX("apogee-1-tr", "status: draft\n"),
    });

    assert.throws(
      () => loadEntries("missions", acceptAnyFacts, { contentRoot: root }),
      /unsupported status "draft"/,
    );
  });
});

test("validateFacts errors propagate uncaught, naming the entry", () => {
  withTempContentRoot((root) => {
    writeEntry(root, "missions", "apogee-1", {
      indexJson: { bad: true },
      en: MDX("apogee-1"),
      tr: MDX("apogee-1-tr"),
    });

    assert.throws(
      () =>
        loadEntries(
          "missions",
          (_raw, entryId) => {
            throw new Error(`Mission "${entryId}": deliberately invalid for this test`);
          },
          { contentRoot: root },
        ),
      /apogee-1.*deliberately invalid/,
    );
  });
});
