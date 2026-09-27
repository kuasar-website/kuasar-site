/**
 * The shared engine behind every git-resident entity type: one directory
 * per entry under `content/<contentType>/`, each containing `index.json`
 * (locale-independent facts, validated by the caller-supplied
 * `validateFacts`) plus `en.mdx` and `tr.mdx` (locale-specific prose, a
 * slug, and an optional translation-incompleteness marker). See
 * design.md, "A generic loading engine, parameterized by an entity-
 * specific fact schema."
 *
 * Resolves `content/` relative to this file's own location, not
 * `process.cwd()` — `content/` lives at the repo root, a sibling of
 * `apps/`, not inside the `apps/web` workspace where Next's build process
 * actually runs, so `process.cwd()` would resolve to the wrong directory.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, requireField } from "./frontmatter.ts";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
// apps/web/lib/content/ -> repo root is four directories up.
const REPO_ROOT = join(THIS_DIR, "..", "..", "..", "..");

export type Locale = "en" | "tr";
export const LOCALES: readonly Locale[] = ["en", "tr"];

const LOCALE_FIELD_NAMES = ["slug", "name", "title", "summary", "status"] as const;

export type LocaleContent = {
  readonly slug: string;
  readonly body: string;
  /**
   * Named apart from any entity's own lifecycle `status` fact (see
   * design.md) — this is the translation-completeness marker from
   * `design/i18n.md`, exposed as data only. Rendering the required visible
   * notice for it is out of scope for this capability.
   */
  readonly translationStatus?: "incomplete";
  readonly fields: Readonly<Record<string, string | null>>;
};

export type Entry<Facts> = {
  readonly id: string;
  readonly facts: Facts;
  readonly locales: Readonly<Record<Locale, LocaleContent>>;
};

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function loadLocaleContent(
  entryDir: string,
  locale: Locale,
  entryId: string,
): LocaleContent {
  const filePath = join(entryDir, `${locale}.mdx`);

  if (!existsSync(filePath)) {
    throw new Error(`content entry "${entryId}": missing ${locale}.mdx`);
  }

  const source = readFileSync(filePath, "utf8");
  const parsed = parseFrontmatter(source, LOCALE_FIELD_NAMES);

  if (parsed === null) {
    throw new Error(
      `content entry "${entryId}", ${locale}.mdx: no frontmatter block found`,
    );
  }

  const context = `content entry "${entryId}", ${locale}.mdx`;
  const slug = requireField(parsed, "slug", context);
  const status = parsed.fields.status;

  if (status !== null && status !== "incomplete") {
    throw new Error(
      `${context}: unsupported status "${status}" (only "incomplete" is recognized)`,
    );
  }

  return {
    slug,
    body: parsed.body,
    translationStatus: status === "incomplete" ? "incomplete" : undefined,
    fields: parsed.fields,
  };
}

/**
 * Loads every entry under `content/<contentType>/`. Returns `[]` when that
 * directory does not exist or contains no entry subdirectories — the
 * zero-entries case, not an error. `validateFacts` throws (naming the
 * entry and the offending field) on malformed or missing required facts;
 * this function does not catch or soften that.
 *
 * `options.contentRoot` overrides where `content/` is resolved from — for
 * tests only, so they can point at a throwaway temp directory instead of
 * the real repository content (see design.md, "The 'three files, no code
 * edit' acceptance criterion is demonstrated by a test, not by committed
 * content"). Production callers never pass it.
 */
export function loadEntries<Facts>(
  contentType: string,
  validateFacts: (raw: unknown, entryId: string) => Facts,
  options?: { readonly contentRoot?: string },
): Entry<Facts>[] {
  const contentDir = join(options?.contentRoot ?? join(REPO_ROOT, "content"), contentType);

  if (!isDirectory(contentDir)) return [];

  const entries: Entry<Facts>[] = [];

  for (const entryId of readdirSync(contentDir)) {
    const entryDir = join(contentDir, entryId);

    if (!isDirectory(entryDir)) continue;

    const indexPath = join(entryDir, "index.json");

    if (!existsSync(indexPath)) {
      throw new Error(`content entry "${entryId}": missing index.json`);
    }

    let raw: unknown;

    try {
      raw = JSON.parse(readFileSync(indexPath, "utf8"));
    } catch (cause) {
      throw new Error(`content entry "${entryId}": index.json is not valid JSON`, {
        cause,
      });
    }

    const facts = validateFacts(raw, entryId);

    const locales = {} as Record<Locale, LocaleContent>;

    for (const locale of LOCALES) {
      locales[locale] = loadLocaleContent(entryDir, locale, entryId);
    }

    entries.push({ id: entryId, facts, locales });
  }

  return entries;
}
