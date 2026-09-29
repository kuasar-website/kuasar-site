import type { Locale } from "../i18n/segments.ts";
import { MEDIA_HOST, MEDIA_ORIGIN } from "./origin.ts";

/**
 * The CMS `shared.image` component as the Strapi REST API returns it: one image plus its
 * alt text in both locales (design/content-model.md, "Images and alt text"). Strapi's own
 * file-level `alternativeText` is deliberately not read.
 */
export type StrapiImage = {
  image?: {
    url?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  altEn?: string | null;
  altTr?: string | null;
};

/** What `<MediaImage>` renders. Only ever built by `toMediaImage`. */
export type MediaImageData = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** True only for the `next dev` pass-through of a non-media host. Never in a build. */
  unoptimized: boolean;
};

/** Where an image came from, so a failure names what to fix. */
export type ImageSource = {
  collection: string;
  entry: string;
  field: string;
};

export type ToMediaImageOptions = {
  /** Defaults to `process.env.NODE_ENV`. Only "development" (`next dev`) relaxes the host rule. */
  mode?: string;
  /** Strapi's base URL, used in development only to resolve local-provider `/uploads/...` paths. */
  cmsOrigin?: string;
};

export class MediaImageError extends Error {
  constructor(source: ImageSource, problem: string) {
    super(`[media] ${source.collection} "${source.entry}", field ${source.field}: ${problem}`);
    this.name = "MediaImageError";
  }
}

/**
 * Turns a CMS image into render-ready data for one locale, or refuses it.
 *
 * Runs at build time (static generation), so a refusal fails the build instead of
 * shipping. It refuses:
 * - an image URL on any host other than media.kuasar.org — `*.r2.dev`, the raw
 *   `*.r2.cloudflarestorage.com` endpoint (stored when `R2_PUBLIC_URL` was unset at upload),
 *   the CMS host, or a relative `/uploads/...` path;
 * - an image without width and height, which would render unsized and shift the layout;
 * - an empty alt text for the requested locale.
 *
 * Under `next dev` only, a non-media host is passed through unoptimised with a warning, so
 * local work against Strapi's local upload provider still renders. `next build` never takes
 * that path.
 *
 * Returns `null` when no image is attached; optional images are allowed to be absent.
 */
export function toMediaImage(
  value: StrapiImage | null | undefined,
  locale: Locale,
  source: ImageSource,
  options: ToMediaImageOptions = {},
): MediaImageData | null {
  if (!value || !value.image) {
    return null;
  }

  const mode = options.mode ?? process.env.NODE_ENV;
  const { url, width, height } = value.image;

  if (!url) {
    throw new MediaImageError(source, "the image has no URL.");
  }

  if (!isPositive(width) || !isPositive(height)) {
    throw new MediaImageError(
      source,
      "the image has no width/height, so its space cannot be reserved and the page would shift " +
        "when it loads. Re-upload it through the Media Library.",
    );
  }

  const altRaw = locale === "tr" ? value.altTr : value.altEn;
  const alt = altRaw?.trim() ?? "";
  if (alt === "") {
    throw new MediaImageError(
      source,
      `the ${locale === "tr" ? "Turkish (altTr)" : "English (altEn)"} alt text is empty. ` +
        "Both are required before publishing.",
    );
  }

  const host = hostOf(url);
  if (host === MEDIA_HOST) {
    return { src: url, width, height, alt, unoptimized: false };
  }

  if (mode === "development") {
    const devSrc = host === null && options.cmsOrigin ? new URL(url, options.cmsOrigin).toString() : url;
    console.warn(
      `[media] ${source.collection} "${source.entry}", field ${source.field}: "${url}" is not on ` +
        `${MEDIA_ORIGIN}. Showing it unoptimised in development only — \`next build\` will refuse it.`,
    );
    return { src: devSrc, width, height, alt, unoptimized: true };
  }

  throw new MediaImageError(
    source,
    `image URL "${url}" is not on ${MEDIA_ORIGIN}. Images must never be served from r2.dev, ` +
      "the R2 S3 endpoint or the CMS. Set R2_PUBLIC_URL and re-upload the image " +
      "(docs/ops/cms-runbook.md step 5).",
  );
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** The URL's host, or null for a relative path. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
