/**
 * A `---`-delimited, flat `key: value` frontmatter scanner for git-resident
 * content's `en.mdx`/`tr.mdx` files. Independent of, but philosophically
 * matching, `scripts/checks/locale-parity.mjs` (Dev 1's CI script, not
 * imported here — see design.md, "Frontmatter parsing stays hand-rolled and
 * narrow, independently of the CI script"): fail closed on anything this
 * narrow scanner cannot confidently parse, rather than guess. A false
 * failure just means reformatting a field; a false pass would let bad
 * content reach the loader's caller undetected.
 *
 * Deliberately not a general YAML/frontmatter library — no dependency
 * exists in this workspace for one, and this project's established
 * precedent (the CI script above) is to hand-roll this exact narrow shape
 * rather than add one.
 */

const YAML_NULL_LIKE = new Set(["null", "Null", "NULL", "~"]);

// Leading characters that start a YAML construct this scanner does not
// parse: block scalars (| >), an anchor (&) or alias (*), a flow mapping
// ({) or sequence ([), or a tag (!, !!str, ...). A plain unquoted scalar
// never legitimately starts with one of these.
const UNSUPPORTED_INDICATOR = /^[|>&*{[!]/;

export type Frontmatter = {
  readonly fields: Readonly<Record<string, string | null>>;
  readonly body: string;
};

/**
 * A single top-level `key: value` line's value, or null if the key is
 * absent, empty, or doesn't look like a simple scalar this scanner
 * understands. Column-0-anchored: only flat, top-level fields are
 * recognized, so an indented line under some other key is never mistaken
 * for one. See `scripts/checks/locale-parity.mjs` for the full reasoning
 * behind each rejection below — this mirrors it field-for-field.
 */
function extractSimpleField(
  frontmatterLines: readonly string[],
  key: string,
): string | null {
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

function splitFrontmatter(
  source: string,
): { lines: string[]; body: string } | null {
  const allLines = source.split(/\r\n|\r|\n/);

  if (allLines[0]?.trim() !== "---") return null;

  const closingIndex = allLines.indexOf("---", 1);

  if (closingIndex === -1) return null;

  const lines = allLines.slice(1, closingIndex);
  const body = allLines
    .slice(closingIndex + 1)
    .join("\n")
    .replace(/^\n+/, "");

  return { lines, body };
}

/**
 * Parses the named fields out of a file's frontmatter block, or returns
 * `null` if the file has no `---`-delimited block at all (no opening or no
 * closing `---`). A field present in `fieldNames` but not confidently
 * parseable from the file resolves to `null` in `fields`, not an absent
 * key — callers use `requireField` to turn that into a thrown error where
 * the field is required.
 */
export function parseFrontmatter(
  source: string,
  fieldNames: readonly string[],
): Frontmatter | null {
  const split = splitFrontmatter(source);

  if (split === null) return null;

  const fields: Record<string, string | null> = {};

  for (const name of fieldNames) {
    fields[name] = extractSimpleField(split.lines, name);
  }

  return { fields, body: split.body };
}

/** Throws with `context` and the field name when the field is null. */
export function requireField(
  frontmatter: Frontmatter,
  key: string,
  context: string,
): string {
  const value = frontmatter.fields[key];

  if (value === null || value === undefined) {
    throw new Error(
      `${context}: missing or malformed required frontmatter field "${key}"`,
    );
  }

  return value;
}
