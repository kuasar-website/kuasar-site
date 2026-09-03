import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { randomFillSync } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runBudgetCheck,
  formatReport,
  PINNED_NEXT_VERSION,
  CompatibilityError,
  measureDeferred,
} from "./budgets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// A deterministic, tightly-scoped budget config used across most tests —
// small round numbers so a handful of test-authored bytes can sit clearly
// above or below the line without relying on gzip's exact output size.
const BUDGETS = {
  default: { firstLoadKb: 10, deferredAnimationKb: 0 },
  routes: {
    home: { firstLoadKb: 10, deferredAnimationKb: 5 },
    timeline: { firstLoadKb: 10, deferredAnimationKb: 5 },
  },
};

const SMALL_CONTENT = "console.log('hi');";
// Random bytes are incompressible, so a 20 KB buffer of them reliably
// gzips to well over any of the KB-scale budgets above — unlike real JS
// text, its gzip size can't accidentally land under the line.
function incompressibleContent(bytes) {
  return randomFillSync(Buffer.alloc(bytes));
}

/** A fresh temp dir shaped like a Next.js build's chunksBaseDir. */
function makeChunksBaseDir() {
  const dir = mkdtempSync(join(tmpdir(), "budgets-test-"));

  mkdirSync(join(dir, ".next", "static", "chunks"), { recursive: true });

  return dir;
}

/** Writes a chunk file and returns its diagnostics-style ref (".next/..." prefix). */
function writeChunk(chunksBaseDir, name, content) {
  writeFileSync(join(chunksBaseDir, ".next", "static", "chunks", name), content);

  return `.next/static/chunks/${name}`;
}

function routeEntry(route, firstLoadChunkPaths) {
  return { route, firstLoadUncompressedJsBytes: 0, firstLoadChunkPaths };
}

/** Mirrors formatReport's own formatKb — ties assertions to the same rounding. */
function kbString(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

test("first-load: below budget passes", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const ref = writeChunk(chunksBaseDir, "a.js", SMALL_CONTENT);

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en", [ref])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.equal(result.compatibilityError, null);
  assert.equal(result.ok, true);
  assert.equal(result.routes[0].firstLoad.ok, true);
});

test("first-load: above budget fails", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const ref = writeChunk(chunksBaseDir, "a.js", incompressibleContent(20 * 1024));

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/", [ref])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.equal(result.compatibilityError, null);
  assert.equal(result.ok, false);
  assert.equal(result.routes[0].firstLoad.ok, false);
  assert.ok(result.routes[0].firstLoad.contributions.length > 0);
});

test("deferred: L1 route below budget passes", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const firstLoadRef = writeChunk(chunksBaseDir, "home-entry.js", SMALL_CONTENT);
  writeChunk(chunksBaseDir, "hero-anim.js", SMALL_CONTENT);
  // home-entry.js dynamically references the deferred chunk.
  writeFileSync(
    join(chunksBaseDir, ".next", "static", "chunks", "home-entry.js"),
    'import("static/chunks/hero-anim.js");',
  );

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en", [firstLoadRef])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.equal(result.compatibilityError, null);
  assert.equal(result.ok, true);
  assert.equal(result.routes[0].budgetKey, "home");
  assert.ok(result.routes[0].deferred !== null);
  assert.equal(result.routes[0].deferred.ok, true);
});

test("deferred: L1 route above budget fails", () => {
  const chunksBaseDir = makeChunksBaseDir();
  writeFileSync(
    join(chunksBaseDir, ".next", "static", "chunks", "home-entry.js"),
    'import("static/chunks/hero-anim.js");',
  );
  const firstLoadRef = ".next/static/chunks/home-entry.js";
  writeChunk(chunksBaseDir, "hero-anim.js", incompressibleContent(20 * 1024));

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en/timeline", [firstLoadRef])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.equal(result.compatibilityError, null);
  assert.equal(result.ok, false);
  assert.equal(result.routes[0].budgetKey, "timeline");
  assert.equal(result.routes[0].deferred.ok, false);
});

test("deferred: a non-L1 route is never traversed at all, even if its first-load chunk contains a chunk-path-shaped literal", () => {
  const chunksBaseDir = makeChunksBaseDir();
  writeChunk(chunksBaseDir, "unrelated.js", SMALL_CONTENT);
  const firstLoadRef = writeChunk(
    chunksBaseDir,
    "entry.js",
    'var x = "static/chunks/unrelated.js";',
  );

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en/missions", [firstLoadRef])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.equal(result.routes[0].budgetKey, "default");
  assert.equal(result.routes[0].deferred, null);
});

test("deferred traversal: a multi-hop chain is followed transitively", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const aRef = writeChunk(chunksBaseDir, "a.js", 'import("static/chunks/b.js");');
  writeChunk(chunksBaseDir, "b.js", 'import("static/chunks/c.js");');
  writeChunk(chunksBaseDir, "c.js", SMALL_CONTENT);

  const result = measureDeferred(routeEntry("/en", [aRef]), chunksBaseDir);

  const refs = result.contributions.map((c) => c.ref).sort();

  assert.deepEqual(refs, ["static/chunks/b.js", "static/chunks/c.js"]);

  const bEntry = result.contributions.find((c) => c.ref === "static/chunks/b.js");
  const cEntry = result.contributions.find((c) => c.ref === "static/chunks/c.js");

  assert.equal(bEntry.discoveredVia, "direct");
  assert.equal(bEntry.fromRef, "static/chunks/a.js");
  assert.equal(cEntry.discoveredVia, "transitive");
  assert.equal(cEntry.fromRef, "static/chunks/b.js");
});

test("deferred traversal: a chunk reachable by two paths is counted exactly once", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const aRef = writeChunk(
    chunksBaseDir,
    "a.js",
    'import("static/chunks/b.js"); import("static/chunks/shared.js");',
  );
  writeChunk(chunksBaseDir, "b.js", 'import("static/chunks/shared.js");');
  writeChunk(chunksBaseDir, "shared.js", SMALL_CONTENT);

  const result = measureDeferred(routeEntry("/en", [aRef]), chunksBaseDir);

  const sharedContributions = result.contributions.filter(
    (c) => c.ref === "static/chunks/shared.js",
  );

  assert.equal(sharedContributions.length, 1);
});

test("deferred traversal: a cycle terminates and each chunk is counted exactly once", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const aRef = writeChunk(chunksBaseDir, "a.js", 'import("static/chunks/b.js");');
  writeChunk(chunksBaseDir, "b.js", 'import("static/chunks/c.js");');
  writeChunk(chunksBaseDir, "c.js", 'import("static/chunks/b.js");'); // cycle back to b

  const result = measureDeferred(routeEntry("/en", [aRef]), chunksBaseDir);

  const refs = result.contributions.map((c) => c.ref).sort();

  assert.deepEqual(refs, ["static/chunks/b.js", "static/chunks/c.js"]);
});

test("deferred traversal: a first-load chunk re-referenced under the alternate path spelling is not double-counted as deferred", () => {
  const chunksBaseDir = makeChunksBaseDir();
  // a.js's own text references itself using the alternate (no ".next/"
  // prefix) spelling than the diagnostics entry provides for it.
  const aRef = writeChunk(chunksBaseDir, "a.js", 'var self = "static/chunks/a.js";');

  const result = measureDeferred(routeEntry("/en", [aRef]), chunksBaseDir);

  assert.equal(result.totalBytes, 0);
  assert.deepEqual(result.contributions, []);
});

test("compatibility: a diagnostics entry with a missing/wrong-typed field is a schema-mismatch compatibility error, not a route failure", () => {
  const chunksBaseDir = makeChunksBaseDir();

  const result = runBudgetCheck({
    diagnosticsRaw: [
      { route: "/en", firstLoadUncompressedJsBytes: "not-a-number", firstLoadChunkPaths: ["a.js"] },
    ],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.notEqual(result.compatibilityError, null);
  assert.equal(result.ok, false);
  assert.equal(result.routes.length, 0);
});

test("compatibility: a diagnostics value that isn't an array at all is a schema-mismatch error", () => {
  const chunksBaseDir = makeChunksBaseDir();

  const result = runBudgetCheck({
    diagnosticsRaw: { not: "an array" },
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.notEqual(result.compatibilityError, null);
});

test("compatibility: a first-load chunk named in diagnostics but absent from disk is a compatibility error, not a zero-byte contribution", () => {
  const chunksBaseDir = makeChunksBaseDir();

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en", [".next/static/chunks/does-not-exist.js"])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.ok(result.compatibilityError.message.includes("does-not-exist.js"));
});

test("compatibility: a chunk discovered transitively but absent from disk is a compatibility error, not a silently skipped contribution", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const aRef = writeChunk(chunksBaseDir, "a.js", 'import("static/chunks/missing.js");');

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en", [aRef])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.ok(result.compatibilityError.message.includes("missing.js"));
});

test("compatibility: an installed Next.js version other than the pinned one fails with a revalidation-required error", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const ref = writeChunk(chunksBaseDir, "a.js", SMALL_CONTENT);

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en", [ref])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: "16.4.0",
  });

  assert.notEqual(result.compatibilityError, null);
  assert.match(result.compatibilityError.message, /16\.3\.1/);
  assert.match(result.compatibilityError.message, /16\.4\.0/);
});

test("compatibility: a missing diagnostics file reports a compatibility failure via the CLI, not a crash", () => {
  const webDir = mkdtempSync(join(tmpdir(), "budgets-cli-test-"));

  writeFileSync(join(webDir, "budgets.json"), JSON.stringify(BUDGETS));
  // Deliberately no .next/diagnostics/route-bundle-stats.json.

  let output = "";
  let status = 0;

  try {
    output = execFileSync(process.execPath, [join(__dirname, "budgets.mjs"), webDir], {
      encoding: "utf8",
    });
  } catch (error) {
    output = (error.stdout ?? "") + (error.stderr ?? "");
    status = error.status;
  }

  assert.equal(status, 1);
  assert.match(output, /COMPATIBILITY \/ INFRASTRUCTURE FAILURE/);
});

test("formatReport: an ordinary first-load-over-budget result names the route, budget type, configured limit, measured total, and every contributing chunk", () => {
  const chunksBaseDir = makeChunksBaseDir();
  const ref = writeChunk(chunksBaseDir, "a.js", incompressibleContent(20 * 1024));

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/", [ref])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.equal(result.routes[0].firstLoad.ok, false);

  const report = formatReport(result);
  const { firstLoad } = result.routes[0];

  // Route + budget type.
  assert.match(report, /FAIL \/ \(budget: default\)/);
  // Configured limit and measured total, tied to the actual computed values.
  assert.ok(report.includes(kbString(firstLoad.totalBytes)));
  assert.ok(report.includes(kbString(firstLoad.budgetBytes)));
  assert.match(report, /\*\*\* OVER BUDGET \*\*\*/);
  // The contributing chunk path and its individual gzip size.
  assert.ok(report.includes("static/chunks/a.js"));
  assert.ok(report.includes(kbString(firstLoad.contributions[0].bytes)));
  // Visibly distinct from a compatibility/infrastructure failure.
  assert.doesNotMatch(report, /COMPATIBILITY \/ INFRASTRUCTURE FAILURE/);
});

test("formatReport: a deferred-over-budget result names direct vs. transitive discovery for each contributing chunk", () => {
  const chunksBaseDir = makeChunksBaseDir();
  writeFileSync(
    join(chunksBaseDir, ".next", "static", "chunks", "home-entry.js"),
    'import("static/chunks/hero-anim.js");',
  );
  const firstLoadRef = ".next/static/chunks/home-entry.js";
  writeFileSync(
    join(chunksBaseDir, ".next", "static", "chunks", "hero-anim.js"),
    'import("static/chunks/extra.js");',
  );
  writeChunk(chunksBaseDir, "extra.js", incompressibleContent(10 * 1024));

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en", [firstLoadRef])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  assert.equal(result.routes[0].budgetKey, "home");
  assert.equal(result.routes[0].deferred.ok, false);

  const report = formatReport(result);
  const { deferred } = result.routes[0];
  const heroContribution = deferred.contributions.find((c) => c.ref === "static/chunks/hero-anim.js");
  const extraContribution = deferred.contributions.find((c) => c.ref === "static/chunks/extra.js");

  assert.match(report, /FAIL \/en \(budget: home\)/);
  assert.ok(report.includes(kbString(deferred.totalBytes)));
  assert.ok(report.includes(kbString(deferred.budgetBytes)));
  assert.match(report, /deferred-animation:.*\*\*\* OVER BUDGET \*\*\*/);
  // Direct attribution: hero-anim.js was referenced from the route's own
  // first-load chunk.
  assert.ok(
    report.includes(
      `static/chunks/hero-anim.js: ${kbString(heroContribution.bytes)} (direct via static/chunks/home-entry.js)`,
    ),
  );
  // Transitive attribution: extra.js was referenced from hero-anim.js, not
  // from first-load code directly.
  assert.ok(
    report.includes(
      `static/chunks/extra.js: ${kbString(extraContribution.bytes)} (transitive via static/chunks/hero-anim.js)`,
    ),
  );
  assert.doesNotMatch(report, /COMPATIBILITY \/ INFRASTRUCTURE FAILURE/);
});

test("formatReport: a compatibility failure is visibly distinct from a budget-exceeded failure — different heading, no route PASS/FAIL lines", () => {
  const chunksBaseDir = makeChunksBaseDir();

  const result = runBudgetCheck({
    diagnosticsRaw: [routeEntry("/en", [".next/static/chunks/does-not-exist.js"])],
    chunksBaseDir,
    budgetsConfig: BUDGETS,
    installedNextVersion: PINNED_NEXT_VERSION,
  });

  const report = formatReport(result);

  assert.match(report, /COMPATIBILITY \/ INFRASTRUCTURE FAILURE/);
  assert.doesNotMatch(report, /^(PASS|FAIL) /m);
  assert.doesNotMatch(report, /OVER BUDGET/);
});

test("CompatibilityError is a distinct class from an ordinary Error", () => {
  assert.ok(new CompatibilityError("x") instanceof Error);
  assert.notEqual(CompatibilityError, Error);
});
