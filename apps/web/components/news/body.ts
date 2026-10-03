import { parseInline, type InlineNode, type ProseBlock } from "../missions/markdown.ts";

/**
 * Announcement `body` (Strapi rich text, i.e. Markdown) → the same blocks `MissionProse`
 * renders. Unlike `parseMissionBody`, which rejects anything outside its subset because git
 * content is checked in CI, this NEVER throws: an editor's Markdown must not be able to
 * break the build or a revalidation. Anything unsupported degrades to plain text, which
 * React escapes. Images and raw HTML are not rendered as such (images cannot be validated
 * against the media host here).
 *
 * Headings are all level 3: on the News page the announcement title is the h2.
 */
function inline(source: string): InlineNode[] {
  try {
    return parseInline(source, "announcement body");
  } catch {
    // An unparsable or disallowed link (e.g. http:, javascript:) stays visible as text.
    return [{ kind: "text", value: source }];
  }
}

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const HEADING = /^#{1,6}\s+(.*?)\s*#*\s*$/;
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;

export function parseAnnouncementBody(source: string | null): ProseBlock[] {
  if (!source) return [];
  const blocks: ProseBlock[] = [];
  let paragraph: string[] = [];
  let list: InlineNode[][] = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", children: inline(text) });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: "list", items: list });
    list = [];
  };
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(IMAGE, "").replace(/^\s*>\s?/, "").replace(/^\s*```.*$/, "").trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = HEADING.exec(line.trim());
    if (heading) {
      flushParagraph();
      flushList();
      if (heading[1]) blocks.push({ kind: "heading", level: 3, children: inline(heading[1]) });
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      flushParagraph();
      if (item[1]?.trim()) list.push(inline(item[1].trim()));
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}
