export type InlineNode =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "strong"; readonly children: readonly InlineNode[] }
  | { readonly kind: "emphasis"; readonly children: readonly InlineNode[] }
  | {
      readonly kind: "link";
      readonly href: string;
      readonly children: readonly InlineNode[];
    };

export type ProseBlock =
  | {
      readonly kind: "heading";
      readonly level: 2 | 3;
      readonly children: readonly InlineNode[];
    }
  | { readonly kind: "paragraph"; readonly children: readonly InlineNode[] }
  | {
      readonly kind: "list";
      readonly items: readonly (readonly InlineNode[])[];
    };

export type GalleryImage = {
  readonly src: string;
  readonly alt: string;
};

export type ParsedMissionBody = {
  readonly blocks: readonly ProseBlock[];
  readonly gallery: readonly GalleryImage[];
};

function fail(context: string, message: string): never {
  throw new Error(`${context}: ${message}`);
}

function validateHref(href: string, context: string): string {
  if (href.startsWith("/")) return href;

  try {
    const url = new URL(href);
    if (url.protocol === "https:") return href;
  } catch {
    // Fall through to the contextual error below.
  }

  return fail(context, `link target "${href}" must be a root-relative or HTTPS URL`);
}

export function parseInline(source: string, context: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const token = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;

  for (const match of source.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ kind: "text", value: source.slice(cursor, index) });

    const value = match[0];
    if (value.startsWith("**")) {
      nodes.push({
        kind: "strong",
        children: [{ kind: "text", value: value.slice(2, -2) }],
      });
    } else if (value.startsWith("*")) {
      nodes.push({
        kind: "emphasis",
        children: [{ kind: "text", value: value.slice(1, -1) }],
      });
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(value);
      if (!linkMatch) fail(context, `could not parse inline link "${value}"`);
      nodes.push({
        kind: "link",
        href: validateHref(linkMatch[2], context),
        children: [{ kind: "text", value: linkMatch[1] }],
      });
    }

    cursor = index + value.length;
  }

  if (cursor < source.length) nodes.push({ kind: "text", value: source.slice(cursor) });
  return nodes;
}

function rejectUnsupported(body: string, context: string): void {
  const lines = body.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (/^(import|export)\s/.test(trimmed)) {
      fail(context, `line ${index + 1} uses an unsupported import/export`);
    }
    if (/<\/?[A-Za-z][^>]*>/.test(trimmed)) {
      fail(context, `line ${index + 1} uses unsupported HTML or JSX`);
    }
    if (/^#{1}\s|^#{4,}\s|^\d+\.\s|^>\s|^```/.test(trimmed)) {
      fail(context, `line ${index + 1} uses an unsupported Markdown block`);
    }
  }
}

function isGalleryHeading(value: string): boolean {
  return value.trim().toLocaleLowerCase("en") === "gallery" ||
    value.trim().toLocaleLowerCase("tr") === "galeri";
}

export function parseMissionBody(
  body: string,
  galleryPaths: readonly string[],
  context: string,
): ParsedMissionBody {
  rejectUnsupported(body, context);

  const lines = body.split(/\r?\n/);
  const blocks: ProseBlock[] = [];
  const gallery = new Map<string, GalleryImage>();
  let paragraph: string[] = [];
  let list: string[] = [];
  let inGallery = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const value = paragraph.join(" ").trim();
    if (value) blocks.push({ kind: "paragraph", children: parseInline(value, context) });
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({
      kind: "list",
      items: list.map((item) => parseInline(item, context)),
    });
    list = [];
  };

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    const heading = /^(##|###)\s+(.+)$/.exec(trimmed);

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length as 2 | 3;
      const value = heading[2].trim();
      if (level === 2 && isGalleryHeading(value)) {
        inGallery = true;
        continue;
      }
      inGallery = false;
      blocks.push({ kind: "heading", level, children: parseInline(value, context) });
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (image) {
      flushParagraph();
      flushList();
      if (!inGallery) fail(context, `line ${index + 1} places an image outside Gallery/Galeri`);
      const alt = image[1].trim();
      const src = image[2].trim();
      if (!alt) fail(context, `gallery image "${src}" has empty alternative text`);
      if (gallery.has(src)) fail(context, `gallery image "${src}" is declared more than once`);
      gallery.set(src, { src, alt });
      continue;
    }

    if (inGallery) {
      fail(context, `line ${index + 1} contains non-image content inside Gallery/Galeri`);
    }

    const item = /^-\s+(.+)$/.exec(trimmed);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }

    if (list.length > 0) flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  const expected = new Set(galleryPaths);
  for (const src of gallery.keys()) {
    if (!expected.has(src)) fail(context, `gallery image "${src}" is not listed in index.json`);
  }
  for (const src of expected) {
    if (!gallery.has(src)) fail(context, `index.json gallery image "${src}" has no localized alternative`);
  }

  return {
    blocks,
    gallery: galleryPaths.map((src) => gallery.get(src) as GalleryImage),
  };
}
