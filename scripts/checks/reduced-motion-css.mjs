#!/usr/bin/env node
/**
 * Tier A static motion check (CSS half): any stylesheet declaring
 * `animation:`/`transition:` — or any of their long-hand sub-properties,
 * such as `transition-duration` used without the shorthand — must also
 * declare a `@media (prefers-reduced-motion: reduce)` block somewhere in
 * the same file. See docs/adr/0004-verification.md and design.md ("CSS
 * static checks") in openspec/changes/verification-gates. The GSAP half of
 * the same requirement (spec.md's "GSAP code with no matchMedia
 * reduced-motion branch fails" scenario) is
 * apps/web/eslint-rules/gsap-reduced-motion.mjs, not this script.
 *
 * A dependency-free directory walk, matching the project's stated
 * preference (design.md's "Locale parity" decision applies the same
 * reasoning) for a small, narrowly-scoped script over pulling in a globbing
 * library for something this simple.
 *
 * Usage: node scripts/checks/reduced-motion-css.mjs [rootDir]
 * Exits 1 (and prints every offending file) if any stylesheet fails; exits
 * 0 — including when no stylesheet declares any motion at all, the vacuous
 * case spec.md states explicitly — otherwise.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import postcss from "postcss";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "build",
  "coverage",
  ".vercel",
]);

// Matches the shorthand (`transition`, `animation`) and every long-hand
// sub-property (`transition-duration`, `animation-timing-function`, ...) —
// a file that only ever writes the long-hand form still declares motion
// and must still be checked, not just files using the shorthand literally.
const MOTION_PROPERTY = /^(transition|animation)(-|$)/i;

const REDUCED_MOTION_QUERY = /prefers-reduced-motion\s*:\s*reduce/i;

function findCssFiles(dir) {
  const results = [];

  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...findCssFiles(fullPath));
    } else if (entry.toLowerCase().endsWith(".css")) {
      results.push(fullPath);
    }
  }

  return results;
}

function declaresMotion(root) {
  let found = false;

  root.walkDecls((decl) => {
    if (MOTION_PROPERTY.test(decl.prop)) found = true;
  });

  return found;
}

function hasReducedMotionBlock(root) {
  let found = false;

  root.walkAtRules(/^media$/i, (atRule) => {
    if (REDUCED_MOTION_QUERY.test(atRule.params)) found = true;
  });

  return found;
}

function checkFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const root = postcss.parse(source, { from: filePath });

  if (!declaresMotion(root)) return { ok: true };

  return { ok: hasReducedMotionBlock(root) };
}

function main() {
  const rootDir = process.argv[2] ?? process.cwd();
  const cssFiles = findCssFiles(rootDir);
  const failures = [];

  for (const filePath of cssFiles) {
    const { ok } = checkFile(filePath);

    if (!ok) failures.push(filePath);
  }

  if (failures.length > 0) {
    console.error(
      "Reduced-motion check failed: the following stylesheets declare " +
        "transition/animation but have no @media (prefers-reduced-motion: reduce) " +
        "block:",
    );

    for (const filePath of failures) {
      console.error(`  ${relative(rootDir, filePath)}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    `Reduced-motion check passed (${cssFiles.length} stylesheet${cssFiles.length === 1 ? "" : "s"} checked).`,
  );
}

main();
