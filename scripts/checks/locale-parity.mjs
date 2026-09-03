#!/usr/bin/env node
/**
 * Tier A locale-parity check (docs/adr/0004-verification.md, design/i18n.md
 * "How this coexists with the CI parity gate"). Every directory directly
 * under `content/<type>/` (one per Mission or Timeline Entry) must contain
 * both `en.mdx` and `tr.mdx`, and each must declare a non-empty `slug` in
 * its frontmatter — a missing file or a missing slug is a broken route
 * under design/i18n.md's fully localized URL segments, not a mere
 * incompleteness. `status: incomplete` licenses a placeholder body but
 * never waives the slug requirement.
 *
 * Timeline Entry included, despite design/content-model.md documenting its
 * frontmatter without a `slug` field — see design.md's "Cross-document
 * reconciliation" in openspec/changes/verification-gates: per CLAUDE.md's
 * authority order the ADR wins where the two disagree.
 *
 * A dependency-free frontmatter scanner, not a general YAML/frontmatter
 * library — see design.md's "Locale parity" decision. It recognizes only
 * two fields (`slug`, `status`), as a plain top-level `key: value` line
 * (optionally quoted), and ignores every other field's shape entirely. If
 * `slug` cannot be confidently parsed in that narrow form, it is treated as
 * absent rather than guessed at — a false failure just means reformatting
 * that field; a false pass would let a broken route merge. That includes
 * YAML's own "no value" spellings (`null`, `~`, an empty value), a bare or
 * trailing `#` comment, a malformed/incomplete quoted scalar, and a
 * tag/anchor/alias/block/flow indicator (`!tag`, `&anchor`, `*alias`,
 * `|`/`>`, `{...}`, `[...]`) — none of which this scanner tries to
 * interpret.
 *
 * Usage: node scripts/checks/locale-parity.mjs [rootDir]
 * Exits 1 (and prints every problem, across every directory independently)
 * on any missing file or missing slug; exits 0 — including when `content/`
 * doesn't exist at all, the vacuous case spec.md states explicitly —
 * otherwise.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REQUIRED_LOCALES = ["en", "tr"];

// YAML's spellings of "no value" (1.1/1.2 core schema): only these four
// unquoted forms count — a quoted "null" or "~" is a real string value.
const YAML_NULL_LIKE = new Set(["null", "Null", "NULL", "~"]);

// Leading characters that start a YAML construct this scanner does not
// parse: block scalars (| >), an anchor (&) or alias (*), a flow mapping
// ({) or sequence ([), or a tag (!, !!str, ...). A plain unquoted scalar
// never legitimately starts with one of these.
const UNSUPPORTED_INDICATOR = /^[|>&*{[!]/;

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function findEntryDirectories(contentDir) {
  const entryDirs = [];

  for (const typeName of readdirSync(contentDir)) {
    const typePath = join(contentDir, typeName);

    if (!isDirectory(typePath)) continue;

    for (const entryName of readdirSync(typePath)) {
      const entryPath = join(typePath, entryName);

      if (isDirectory(entryPath)) entryDirs.push(entryPath);
    }
  }

  return entryDirs;
}

/**
 * The lines of the `---`-delimited frontmatter block at the very start of
 * the file, or null if the file doesn't open with one (no closing `---`
 * found, or the file doesn't start with `---` at all).
 */
function extractFrontmatterLines(source) {
  const lines = source.split(/\r\n|\r|\n/);

  if (lines[0]?.trim() !== "---") return null;

  const closingIndex = lines.indexOf("---", 1);

  if (closingIndex === -1) return null;

  return lines.slice(1, closingIndex);
}

/**
 * A single top-level `key: value` line, or null if the key is absent, has
 * nothing usable after the colon, or the value doesn't look like a simple
 * scalar this narrow scanner understands — fails closed rather than
 * guessing. Deliberately column-0-anchored: this scanner only understands
 * flat, top-level fields, so an indented line under some other key is
 * never mistaken for one.
 *
 * A value starting with a quote character MUST be a complete, single-line,
 * matching-quote scalar (`"..."` or `'...'`, quote to quote, nothing
 * before or after) or it fails closed — an unterminated quote, an escaped
 * inner quote, or trailing content after the closing quote is never
 * silently treated as an unquoted value. A well-formed quoted value is
 * taken literally, which is exactly how a real slug named e.g. "null" or
 * containing "#" would be written, and bypasses every check below.
 *
 * Otherwise (unquoted), fails closed on: an unsupported YAML indicator
 * (see UNSUPPORTED_INDICATOR); a line containing `#` anywhere — a bare
 * comment (`# ...`) and a value followed by a trailing comment look
 * identical to this scanner, and it does not attempt to tell them apart;
 * and YAML's unquoted null spellings (`null`/`Null`/`NULL`/`~`).
 */
function extractSimpleField(frontmatterLines, key) {
  const pattern = new RegExp(`^${key}:\\s*(.*)$`);

  for (const line of frontmatterLines) {
    const match = pattern.exec(line);

    if (!match) continue;

    const raw = match[1].trim();

    if (raw === "") return null;

    if (raw.startsWith('"') || raw.startsWith("'")) {
      const quoted = raw.match(/^"([^"]*)"$/) ?? raw.match(/^'([^']*)'$/);

      if (!quoted) return null;

      const value = quoted[1];

      return value.length > 0 ? value : null;
    }

    if (UNSUPPORTED_INDICATOR.test(raw)) return null;
    if (raw.includes("#")) return null;
    if (YAML_NULL_LIKE.has(raw)) return null;

    return raw;
  }

  return null;
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function checkLocaleFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const frontmatterLines = extractFrontmatterLines(source);

  if (frontmatterLines === null) {
    return { ok: false, reason: "no frontmatter block found" };
  }

  const slug = extractSimpleField(frontmatterLines, "slug");
  // `status` is scanned per design.md's decision but is informational only
  // here — `status: incomplete` never waives the slug requirement below.
  void extractSimpleField(frontmatterLines, "status");

  if (slug === null) {
    return { ok: false, reason: "no non-empty slug declared" };
  }

  return { ok: true };
}

function checkEntryDirectory(entryDir) {
  const problems = [];

  for (const locale of REQUIRED_LOCALES) {
    const filePath = join(entryDir, `${locale}.mdx`);

    if (!existsSync(filePath)) {
      problems.push(`missing ${locale}.mdx`);
      continue;
    }

    const result = checkLocaleFile(filePath);

    if (!result.ok) {
      problems.push(`${locale}.mdx: ${result.reason}`);
    }
  }

  return problems;
}

function main() {
  const rootDir = process.argv[2] ?? process.cwd();
  const contentDir = join(rootDir, "content");

  if (!isDirectory(contentDir)) {
    console.log("Locale-parity check passed (no content/ directory yet).");
    return;
  }

  const entryDirs = findEntryDirectories(contentDir);
  const failures = [];

  for (const entryDir of entryDirs) {
    const problems = checkEntryDirectory(entryDir);

    if (problems.length > 0) {
      failures.push({ entryDir, problems });
    }
  }

  if (failures.length > 0) {
    console.error("Locale-parity check failed:");

    for (const { entryDir, problems } of failures) {
      console.error(`  ${relative(rootDir, entryDir)}`);
      for (const problem of problems) {
        console.error(`    - ${problem}`);
      }
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    `Locale-parity check passed (${entryDirs.length} director${entryDirs.length === 1 ? "y" : "ies"} checked).`,
  );
}

main();
