import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, requireField } from "./frontmatter.ts";

const FIELDS = ["slug", "title", "status"] as const;

test("parses a simple frontmatter block and body", () => {
  const source = ["---", "slug: apogee-1", "title: Apogee One", "---", "", "Body text."].join(
    "\n",
  );
  const result = parseFrontmatter(source, FIELDS);
  assert.equal(result?.fields.slug, "apogee-1");
  assert.equal(result?.fields.title, "Apogee One");
  assert.equal(result?.fields.status, null);
  assert.equal(result?.body, "Body text.");
});

test("returns null when there is no frontmatter block", () => {
  assert.equal(parseFrontmatter("Just a body, no frontmatter.", FIELDS), null);
});

test("returns null when the frontmatter block never closes", () => {
  const source = ["---", "slug: apogee-1", "Body text."].join("\n");
  assert.equal(parseFrontmatter(source, FIELDS), null);
});

test("accepts a well-formed quoted value, including one containing '#'", () => {
  const source = ['---', 'slug: "apogee-#1"', "---", "Body."].join("\n");
  const result = parseFrontmatter(source, FIELDS);
  assert.equal(result?.fields.slug, "apogee-#1");
});

test("rejects an unquoted value containing '#' as an unparseable comment", () => {
  const source = ["---", "slug: apogee-1 # a trailing comment", "---", "Body."].join("\n");
  const result = parseFrontmatter(source, FIELDS);
  assert.equal(result?.fields.slug, null);
});

test("rejects YAML null-like spellings", () => {
  for (const spelling of ["null", "Null", "NULL", "~"]) {
    const source = ["---", `slug: ${spelling}`, "---", "Body."].join("\n");
    const result = parseFrontmatter(source, FIELDS);
    assert.equal(result?.fields.slug, null, `expected "${spelling}" to be rejected`);
  }
});

test("a quoted null-like spelling is a real string value", () => {
  const source = ["---", 'slug: "null"', "---", "Body."].join("\n");
  const result = parseFrontmatter(source, FIELDS);
  assert.equal(result?.fields.slug, "null");
});

test("rejects an unsupported YAML indicator", () => {
  for (const value of ["[a, b]", "{a: b}", "*alias", "&anchor", "!tag", "|", ">"]) {
    const source = ["---", `slug: ${value}`, "---", "Body."].join("\n");
    const result = parseFrontmatter(source, FIELDS);
    assert.equal(result?.fields.slug, null, `expected "${value}" to be rejected`);
  }
});

test("requireField throws naming the context and field for a missing value", () => {
  const source = ["---", "title: Apogee One", "---", "Body."].join("\n");
  const result = parseFrontmatter(source, FIELDS)!;
  assert.throws(
    () => requireField(result, "slug", "content entry \"apogee-1\", en.mdx"),
    /content entry "apogee-1", en\.mdx.*"slug"/,
  );
});
