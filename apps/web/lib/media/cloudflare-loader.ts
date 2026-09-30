"use client";

import { MEDIA_HOST, MEDIA_ORIGIN } from "./origin.ts";
import { MEDIA_QUALITY, MEDIA_WIDTHS } from "./sizes.ts";

/**
 * `next/image` loader, set for every image via `images.loaderFile` in next.config.ts, so no
 * image can fall back to Vercel's optimiser by someone forgetting a prop. Resizing happens
 * at Cloudflare's edge in front of R2 instead (docs/adr/0002-cms.md decision 5): quota
 * exhaustion on Vercel would be a site-wide visual regression triggered by traffic.
 *
 * - `format=auto` lets the edge pick AVIF/WebP per browser.
 * - `onerror=redirect` sends the visitor to the original when the edge cannot transform —
 *   including past the Free plan's 5,000 unique transformations a month (error 9422). The
 *   image still renders at its declared size; it is just heavier. Same-zone sources only,
 *   which is why the source is a path on the media host rather than a full URL.
 *
 * Only media-host URLs are accepted. `lib/media/image.ts` guarantees that for CMS content
 * at build time; anything else reaching here is a bug, so it fails loudly. Images that are
 * not on the media host (the dev-only pass-through, local `/public` assets) must be rendered
 * with `unoptimized`, which bypasses the loader.
 */
export default function cloudflareLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    throw new Error(
      `[media] next/image got a non-absolute src "${src}". Images must be served from ` +
        `${MEDIA_ORIGIN}; local assets need the \`unoptimized\` prop.`,
    );
  }

  if (url.host !== MEDIA_HOST) {
    throw new Error(
      `[media] next/image got src "${src}" on host "${url.host}". Images must be served from ` +
        `${MEDIA_ORIGIN} — see docs/ops/cms-runbook.md step 5.`,
    );
  }

  return `${MEDIA_ORIGIN}/cdn-cgi/image/width=${snapWidth(width)},quality=${MEDIA_QUALITY},format=auto,onerror=redirect${url.pathname}`;
}

/**
 * `next/image` only asks for configured widths, but never mint a new transformation for an
 * unexpected one: use the smallest set width that covers it, or the largest in the set.
 */
export function snapWidth(width: number): number {
  const covering = MEDIA_WIDTHS.filter((w) => w >= width);
  return covering.length > 0 ? Math.min(...covering) : Math.max(...MEDIA_WIDTHS);
}
