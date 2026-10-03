import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAnnouncementBody } from "./body.ts";

test("empty or null bodies produce no blocks", () => {
  assert.deepEqual(parseAnnouncementBody(null), []);
  assert.deepEqual(parseAnnouncementBody(""), []);
  assert.deepEqual(parseAnnouncementBody("\n\n  \n"), []);
});

test("paragraphs, headings and lists map to MissionProse blocks", () => {
  const blocks = parseAnnouncementBody("# Big\n\nFirst line\nsame paragraph.\n\n- one\n- **two**\n\n1. first\n2) second");
  assert.deepEqual(blocks.map((b) => b.kind), ["heading", "paragraph", "list", "list"]);
  assert.equal(blocks[0]?.kind === "heading" && blocks[0].level, 3);
  assert.deepEqual(blocks[1], { kind: "paragraph", children: [{ kind: "text", value: "First line same paragraph." }] });
  assert.equal(blocks[2]?.kind === "list" && blocks[2].items.length, 2, "bulleted list");
  assert.equal(blocks[3]?.kind === "list" && blocks[3].items.length, 2, "numbered list, separated by the blank line");
});

test("inline emphasis and safe links are kept", () => {
  const [block] = parseAnnouncementBody("Read **this** and [the rules](https://kuasar.org/rules).");
  assert.ok(block?.kind === "paragraph");
  assert.deepEqual(block.children.map((n) => n.kind), ["text", "strong", "text", "link", "text"]);
});

test("never throws on Markdown the mission parser rejects; unsafe links stay text", () => {
  const nasty = [
    "> a quote", "```", "code();", "```", "![alt](https://evil.example/x.png)",
    "<script>alert(1)</script>", "[bad](javascript:alert(1))", "[plain](http://insecure.example)", "#### deep",
  ].join("\n");
  const blocks = parseAnnouncementBody(nasty);
  const text = JSON.stringify(blocks);
  assert.ok(!text.includes("evil.example"), "images are dropped");
  assert.ok(!blocks.some((b) => b.kind === "paragraph" && b.children.some((n) => n.kind === "link")), "no unsafe link becomes a link");
  assert.ok(text.includes("<script>alert(1)</script>"), "raw HTML survives only as text (React escapes it)");
});
