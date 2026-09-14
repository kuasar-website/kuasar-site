#!/usr/bin/env node
/**
 * Tier A weight-budget check: per-route first-load JS, and the two L1
 * routes' deferred-animation-chunk size, against apps/web/budgets.json.
 * See docs/adr/0004-verification.md and design.md's "Decision: the
 * first-load JS and deferred-animation-chunk budgets on Next.js 16.3.1 are
 * a version-pinned compatibility mechanism" in
 * openspec/changes/verification-gates for the full reasoning — this file
 * implements that decision; read it before changing this one.
 *
 * Next.js 16 removed the build-time size metrics `next build` used to
 * print. This script reads the same information back out of
 * `.next/diagnostics/route-bundle-stats.json` — an undocumented, internal,
 * version-pinned artifact (see the Decision above) — and gzip-computes the
 * actual byte counts itself rather than trusting the uncompressed number
 * that file reports. It does not run a build; a fresh `npm run build -w
 * apps/web` must have already succeeded (see design.md's "Workflow"
 * decision and tasks.md 7.2).
 *
 * Every exported function here is a pure function of its arguments (no
 * hidden file-system access beyond an explicit `chunksBaseDir`), so the
 * fixture suite (tasks.md section 8) can exercise every pass/fail/
 * compatibility-error case against a temp directory it constructs itself —
 * no real `next build` required. Only main() touches the real repository.
 */

import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { join, relative, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

export const PINNED_NEXT_VERSION = "16.3.1";

// Most JS-tooling size budgets (webpack performance hints, several bundle-
// size CI actions) treat "KB" as 1024 bytes rather than a decimal
// kilobyte; design/motion.md's table doesn't pin one explicitly, so this
// is the one place that choice is made, and it is made here rather than
// left ambiguous per-callsite.
export const BYTES_PER_KB = 1024;

/**
 * Distinguishes an infrastructure/compatibility failure (missing artifact,
 * schema mismatch, missing referenced file, version mismatch) from an
 * ordinary budget-exceeded failure — spec.md's "A compatibility failure
 * reads differently from a budget failure" scenario.
 */
export class CompatibilityError extends Error {}

// --- Diagnostics schema (tasks.md 7.3) -------------------------------

/**
 * Validates the shape of `route-bundle-stats.json`: a JSON array, each
 * entry a { route: string, firstLoadUncompressedJsBytes: number,
 * firstLoadChunkPaths: string[] (non-empty) }. Throws CompatibilityError,
 * naming exactly what didn't match, on any deviation — never silently
 * skips a malformed entry or treats it as zero routes.
 */
export function validateDiagnostics(raw) {
  if (!Array.isArray(raw)) {
    throw new CompatibilityError(
      "route-bundle-stats.json must be a JSON array, but it is not.",
    );
  }

  raw.forEach((entry, index) => {
    const label = `route-bundle-stats.json[${index}]`;

    if (typeof entry?.route !== "string") {
      throw new CompatibilityError(`${label}: "route" is missing or not a string.`);
    }

    if (typeof entry.firstLoadUncompressedJsBytes !== "number") {
      throw new CompatibilityError(
        `${label} (route "${entry.route}"): "firstLoadUncompressedJsBytes" is missing or not a number.`,
      );
    }

    if (
      !Array.isArray(entry.firstLoadChunkPaths) ||
      entry.firstLoadChunkPaths.length === 0 ||
      !entry.firstLoadChunkPaths.every((path) => typeof path === "string")
    ) {
      throw new CompatibilityError(
        `${label} (route "${entry.route}"): "firstLoadChunkPaths" must be a non-empty array of strings.`,
      );
    }
  });

  return raw;
}

// --- Version pin (tasks.md 7.4) ---------------------------------------

/**
 * The diagnostics schema above was verified by hand against Next.js
 * 16.3.1's real build output (design.md's Decision). Any other installed
 * version fails closed rather than silently trusting a format that was
 * never checked against it.
 */
export function checkNextVersionPin(installedVersion) {
  if (installedVersion !== PINNED_NEXT_VERSION) {
    throw new CompatibilityError(
      `This budget-measurement mechanism is pinned to Next.js ${PINNED_NEXT_VERSION} and must be ` +
        `re-verified against the installed version (${installedVersion}) before it can be trusted ` +
        "again. See design.md's Decision.",
    );
  }
}

// --- Route -> budget-entry matching (tasks.md 7.1, 7.7) ----------------

// design/i18n.md: the only two locale codes are "en" and "tr". Next.js may
// report either a resolved instance ("/en", "/tr") or, for an unresolved
// dynamic segment, the literal placeholder ("/[locale]").
const LOCALE_ROOT_SEGMENTS = new Set(["en", "tr", "[locale]"]);

/**
 * "home" matches the future /[locale] route (a single path segment, not
 * yet built — Next.js reports either the literal dynamic segment
 * "/[locale]" or a resolved instance like "/en"); "timeline" matches
 * /[locale]/timeline. Everything else — today's bare "/", Next's own
 * "/_not-found", and any other single-segment route that isn't an actual
 * locale root (e.g. "/robots.txt", "/sitemap.xml") — falls through to
 * "default". Matching against an explicit locale-code allowlist rather
 * than merely excluding an "_" prefix: a single-segment root-level route
 * that is neither a locale root nor Next-internal (a Metadata Route like
 * robots.txt/sitemap.ts, both named in design/i18n.md, or any future one)
 * must not be mistaken for the home route just because it also happens to
 * be one path segment.
 */
export function matchRouteBudgetKey(route) {
  if (route === "/[locale]/timeline" || /^\/[^/]+\/timeline$/.test(route)) {
    return "timeline";
  }

  const homeMatch = /^\/([^/]+)$/.exec(route);

  if (homeMatch && LOCALE_ROOT_SEGMENTS.has(homeMatch[1])) {
    return "home";
  }

  return "default";
}

// --- Chunk resolution and gzip measurement -----------------------------

/**
 * Diagnostics-provided chunk paths carry a ".next/" prefix (e.g.
 * ".next/static/chunks/abc.js"); references discovered while scanning
 * chunk text for further deferred chunks do not (they read as
 * "static/chunks/abc.js", matching how the bundler runtime addresses them
 * relative to the .next/ output root). This is the ONE canonical form
 * (no ".next/" prefix) every ref is normalized to before it is ever put in
 * a Set, compared, or used as a map key — measureDeferred's visited/
 * first-load-set logic depends on every ref for the same chunk comparing
 * equal regardless of which spelling produced it. Resolving to an actual
 * on-disk path is a separate step (resolveChunkPath) and accepts either
 * spelling for convenience at that boundary.
 */
export function canonicalizeChunkRef(chunkRef) {
  return chunkRef.startsWith(".next/") ? chunkRef.slice(".next/".length) : chunkRef;
}

export function resolveChunkPath(chunksBaseDir, chunkRef) {
  return join(chunksBaseDir, ".next", canonicalizeChunkRef(chunkRef));
}

export function gzipFileSize(filePath) {
  return gzipSync(readFileSync(filePath)).length;
}

// --- First-load measurement (tasks.md 7.5) ------------------------------

/**
 * Never trusts firstLoadUncompressedJsBytes directly (uncompressed;
 * budgets.json is gzipped KB) — resolves every firstLoadChunkPaths entry,
 * gzip-compresses its actual contents, and sums. A named chunk missing
 * from disk is a CompatibilityError, never a zero-byte contribution.
 */
export function measureFirstLoad(routeEntry, chunksBaseDir) {
  const contributions = routeEntry.firstLoadChunkPaths.map((chunkRef) => {
    const diskPath = resolveChunkPath(chunksBaseDir, chunkRef);

    if (!existsSync(diskPath)) {
      throw new CompatibilityError(
        `Route "${routeEntry.route}": first-load chunk "${chunkRef}" is named in ` +
          `route-bundle-stats.json but does not exist at ${diskPath}.`,
      );
    }

    return { ref: canonicalizeChunkRef(chunkRef), bytes: gzipFileSize(diskPath) };
  });

  const totalBytes = contributions.reduce((sum, c) => sum + c.bytes, 0);

  return { totalBytes, contributions };
}

// --- Deferred-animation-chunk traversal (tasks.md 7.6) ------------------

// A fully quoted, both-quotes-anchored literal (either quote style) so it
// can't false-positive on an unquoted `//# sourceMappingURL=...` comment.
// Always produces the canonical (no ".next/" prefix) form already.
const CHUNK_REFERENCE_PATTERN = /(["'])(static\/chunks\/[\w.-]+\.js)\1/g;

export function findChunkReferences(text) {
  const refs = [];
  let match;

  CHUNK_REFERENCE_PATTERN.lastIndex = 0;
  while ((match = CHUNK_REFERENCE_PATTERN.exec(text)) !== null) {
    refs.push(match[2]);
  }

  return refs;
}

/**
 * Breadth-first, starting from the route's own first-load chunks (so a
 * deferred chunk referenced directly from first-load code is found), over
 * every chunk transitively reachable through further chunk-path
 * references — run only for the two named L1 routes (home, timeline).
 *
 * Every ref is canonicalized before entering `firstLoadSet`/`visited`/the
 * frontier, and compared only in that canonical form: an actual first-load
 * chunk re-referenced elsewhere using the other path spelling (".next/"
 * prefix vs. not) must still be recognized as already-visited, not
 * rediscovered and miscounted as a deferred contribution. Deduplicated and
 * cycle-safe: the `visited` set means a chunk reachable by more than one
 * path, or two chunks referencing each other, is each counted exactly once
 * and the traversal still terminates.
 *
 * A referenced chunk missing from disk is a CompatibilityError, checked
 * explicitly before that chunk is ever read or gzip'd — never a raw
 * filesystem exception, and never a silently skipped contribution.
 */
export function measureDeferred(routeEntry, chunksBaseDir) {
  const firstLoadRefs = routeEntry.firstLoadChunkPaths.map(canonicalizeChunkRef);
  const firstLoadSet = new Set(firstLoadRefs);
  const visited = new Set(firstLoadRefs);
  const frontier = [...firstLoadRefs];
  const contributions = [];

  while (frontier.length > 0) {
    const currentRef = frontier.shift();
    const currentDiskPath = resolveChunkPath(chunksBaseDir, currentRef);

    if (!existsSync(currentDiskPath)) {
      throw new CompatibilityError(
        `Route "${routeEntry.route}": chunk "${currentRef}", referenced while tracing deferred ` +
          `chunks, does not exist at ${currentDiskPath}.`,
      );
    }

    const text = readFileSync(currentDiskPath, "utf8");

    for (const rawFoundRef of findChunkReferences(text)) {
      const foundRef = canonicalizeChunkRef(rawFoundRef);

      if (visited.has(foundRef)) continue;

      const foundDiskPath = resolveChunkPath(chunksBaseDir, foundRef);

      if (!existsSync(foundDiskPath)) {
        throw new CompatibilityError(
          `Route "${routeEntry.route}": chunk "${foundRef}", referenced from "${currentRef}" while ` +
            `tracing deferred chunks, does not exist at ${foundDiskPath}.`,
        );
      }

      visited.add(foundRef);
      frontier.push(foundRef);
      contributions.push({
        ref: foundRef,
        bytes: gzipFileSize(foundDiskPath),
        discoveredVia: firstLoadSet.has(currentRef) ? "direct" : "transitive",
        fromRef: currentRef,
      });
    }
  }

  const totalBytes = contributions.reduce((sum, c) => sum + c.bytes, 0);

  return { totalBytes, contributions };
}

// --- Orchestration (tasks.md 7.7, 7.8) ----------------------------------

function checkBudget(totalBytes, budgetKb) {
  const budgetBytes = budgetKb * BYTES_PER_KB;

  return { totalBytes, budgetBytes, ok: totalBytes <= budgetBytes };
}

/**
 * Runs the full check against already-loaded inputs (no file-system
 * access beyond `chunksBaseDir`, for chunk files). Returns a structured
 * result rather than throwing for an ordinary budget failure — every
 * route is still checked even if an earlier one fails; a
 * CompatibilityError from validation/measurement is the one thing that
 * stops the run early, since nothing after it can be trusted.
 */
export function runBudgetCheck({
  diagnosticsRaw,
  chunksBaseDir,
  budgetsConfig,
  installedNextVersion,
}) {
  try {
    checkNextVersionPin(installedNextVersion);

    const diagnostics = validateDiagnostics(diagnosticsRaw);

    const routes = diagnostics.map((routeEntry) => {
      const budgetKey = matchRouteBudgetKey(routeEntry.route);
      const budgetEntry =
        budgetKey === "default" ? budgetsConfig.default : budgetsConfig.routes[budgetKey];

      const firstLoadMeasurement = measureFirstLoad(routeEntry, chunksBaseDir);
      const firstLoad = {
        ...checkBudget(firstLoadMeasurement.totalBytes, budgetEntry.firstLoadKb),
        contributions: firstLoadMeasurement.contributions,
      };

      let deferred = null;

      if (budgetKey === "home" || budgetKey === "timeline") {
        const deferredMeasurement = measureDeferred(routeEntry, chunksBaseDir);

        deferred = {
          ...checkBudget(deferredMeasurement.totalBytes, budgetEntry.deferredAnimationKb),
          contributions: deferredMeasurement.contributions,
        };
      }

      return { route: routeEntry.route, budgetKey, firstLoad, deferred };
    });

    const ok = routes.every((r) => r.firstLoad.ok && (r.deferred === null || r.deferred.ok));

    return { compatibilityError: null, ok, routes };
  } catch (error) {
    if (error instanceof CompatibilityError) {
      return { compatibilityError: { message: error.message }, ok: false, routes: [] };
    }

    throw error;
  }
}

// --- Reporting (tasks.md 7.8) -------------------------------------------

function formatKb(bytes) {
  return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
}

export function formatReport(result) {
  const lines = [];

  if (result.compatibilityError) {
    lines.push("=".repeat(70));
    lines.push("COMPATIBILITY / INFRASTRUCTURE FAILURE — not a budget-exceeded failure");
    lines.push("=".repeat(70));
    lines.push(result.compatibilityError.message);
    return lines.join("\n");
  }

  for (const route of result.routes) {
    const routeOk = route.firstLoad.ok && (route.deferred === null || route.deferred.ok);

    lines.push(`${routeOk ? "PASS" : "FAIL"} ${route.route} (budget: ${route.budgetKey})`);
    lines.push(
      `  first-load: ${formatKb(route.firstLoad.totalBytes)} / ${formatKb(route.firstLoad.budgetBytes)} budget` +
        (route.firstLoad.ok ? "" : "  *** OVER BUDGET ***"),
    );

    if (!route.firstLoad.ok) {
      for (const c of route.firstLoad.contributions) {
        lines.push(`    - ${c.ref}: ${formatKb(c.bytes)}`);
      }
    }

    if (route.deferred) {
      lines.push(
        `  deferred-animation: ${formatKb(route.deferred.totalBytes)} / ${formatKb(route.deferred.budgetBytes)} budget` +
          (route.deferred.ok ? "" : "  *** OVER BUDGET ***"),
      );

      if (!route.deferred.ok) {
        for (const c of route.deferred.contributions) {
          lines.push(`    - ${c.ref}: ${formatKb(c.bytes)} (${c.discoveredVia} via ${c.fromRef})`);
        }
      }
    }
  }

  lines.push(result.ok ? "Budget check passed." : "Budget check failed.");

  return lines.join("\n");
}

// --- CLI entry point ------------------------------------------------------

function readInstalledNextVersion(fromDir) {
  const require = createRequire(join(fromDir, "package.json"));
  const nextPackageJsonPath = require.resolve("next/package.json");

  return JSON.parse(readFileSync(nextPackageJsonPath, "utf8")).version;
}

export function main() {
  const webDir = resolvePath(process.argv[2] ?? "apps/web");
  const diagnosticsPath = join(webDir, ".next", "diagnostics", "route-bundle-stats.json");
  const budgetsPath = join(webDir, "budgets.json");

  if (!existsSync(diagnosticsPath)) {
    console.error(
      formatReport({
        compatibilityError: {
          message:
            `Missing ${relative(process.cwd(), diagnosticsPath)}. A production build ` +
            `("npm run build -w apps/web") must succeed before this check runs.`,
        },
        ok: false,
        routes: [],
      }),
    );
    process.exitCode = 1;
    return;
  }

  const diagnosticsRaw = JSON.parse(readFileSync(diagnosticsPath, "utf8"));
  const budgetsConfig = JSON.parse(readFileSync(budgetsPath, "utf8"));
  const installedNextVersion = readInstalledNextVersion(webDir);

  const result = runBudgetCheck({
    diagnosticsRaw,
    chunksBaseDir: webDir,
    budgetsConfig,
    installedNextVersion,
  });

  console.log(formatReport(result));
  process.exitCode = result.ok ? 0 : 1;
}

const isMainModule =
  process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main();
}
