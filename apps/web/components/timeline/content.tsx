import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";
import { loadTimelineEntries, type TimelineEntry as ContentEntry } from "../../lib/content/timeline";
import { sectionPath, type Locale } from "../../lib/i18n/segments";
import { timelineEntryFragment, type TimelineEntry } from "./timeline";

type Node = { type: string; url?: string; alt?: string; children?: Node[] };

function safeHref(href: string, context: string): string {
  if (/^\/(?!\/)/.test(href) && !/[\\\s]/.test(href)) return href;
  try {
    if (new URL(href).protocol === "https:") return href;
  } catch { /* Report the content path below. */ }
  throw new Error(`${context}: links must be root-relative paths or HTTPS URLs`);
}

/** Data-only MDX: no executable expressions, imports, custom widgets or embeds. */
async function caption(body: string, image: string | null, context: string) {
  let imageAlt: string | undefined;
  const validate = () => (tree: Node) => {
    const visit = (node: Node) => {
      if (node.type.startsWith("mdx") || node.type === "html") {
        throw new Error(`${context}: timeline captions cannot contain executable MDX or HTML`);
      }
      if (node.type === "link" || node.type === "definition") safeHref(node.url ?? "", context);
      if (node.type === "imageReference") throw new Error(`${context}: use ![localized alt](image path) for timeline images`);
      if (node.type === "image") {
        if (!image || node.url !== image || imageAlt !== undefined || !node.alt?.trim()) {
          throw new Error(`${context}: declare the index.json image exactly once with localized alternative text`);
        }
        imageAlt = node.alt.trim();
      }
      node.children?.forEach(visit);
      // The presentation places the fact image once, with its real dimensions.
      if (node.children) node.children = node.children.filter((child) => child.type !== "image" && !(child.type === "paragraph" && !child.children?.length));
    };
    visit(tree);
  };
  const { default: Body } = await evaluate({ value: body, path: context }, { ...runtime, remarkPlugins: [validate] });
  if (image && imageAlt === undefined) throw new Error(`${context}: add ![localized alt](${image}) to describe the image`);
  return {
    // Captions never introduce a second page h1 or break entry heading hierarchy.
    body: <Body components={{ h1: "p", h2: "p", h3: "p", h4: "p", h5: "p", h6: "p" }} />,
    imageAlt,
  };
}

async function imageMetadata(src: string, alt: string, publicRoot: string, context: string) {
  if (!src.startsWith("/") || src.startsWith("//") || /[?#\\]/.test(src)) {
    throw new Error(`${context}: image must be a local public asset path`);
  }
  const root = await realpath(publicRoot);
  const file = await realpath(/* turbopackIgnore: true */ resolve(root, `.${decodeURIComponent(src)}`));
  if (!file.startsWith(root + sep)) throw new Error(`${context}: image escapes the public directory`);
  const { width, height } = await sharp(await readFile(/* turbopackIgnore: true */ file)).metadata();
  if (!width || !height) throw new Error(`${context}: image has no intrinsic dimensions`);
  return { src, alt, width, height };
}

/** Uses the merged loader's types, never a second storage schema or loader. */
export async function timelineViews(entries: readonly ContentEntry[], locale: Locale, publicRoot = resolve(process.cwd(), "public")): Promise<TimelineEntry[]> {
  return Promise.all(entries.map(async (entry) => {
    const requested = entry.locales[locale];
    const other: Locale = locale === "en" ? "tr" : "en";
    const incomplete = requested.translationStatus === "incomplete";
    const available = entry.locales[other].translationStatus !== "incomplete";
    const contentLocale = incomplete && available ? other : locale;
    const localized = entry.locales[contentLocale];
    const context = `content/timeline/${entry.id}/${contentLocale}.mdx`;
    const title = localized.fields.title?.trim();
    if (!title) throw new Error(`${context}: a nonempty title is required`);
    const rendered = await caption(localized.body, entry.facts.image, context);
    return {
      id: entry.id, date: entry.facts.date, kind: entry.facts.kind,
      title, body: rendered.body, contentLocale,
      translationIncomplete: incomplete,
      availableTranslationHref: incomplete && available
        ? sectionPath("timeline", other) + timelineEntryFragment("timeline", entry.id) : undefined,
      link: entry.facts.link ? safeHref(entry.facts.link, context) : undefined,
      image: entry.facts.image ? await imageMetadata(entry.facts.image, rendered.imageAlt!, publicRoot, context) : undefined,
    };
  }));
}

export function loadTimelineViews(locale: Locale) {
  return timelineViews(loadTimelineEntries(), locale);
}
