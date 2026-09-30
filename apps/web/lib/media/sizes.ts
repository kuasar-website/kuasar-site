/**
 * The fixed set of image widths the site ever requests from Cloudflare's edge.
 *
 * Every distinct width is a distinct billable "unique transformation", and the Free plan
 * allows 5,000 a month. Six widths × one quality keeps the worst case (every image at every
 * width in one month) inside that allowance for the archive sizes this site expects. The
 * estimate, and what to do if AVIF and WebP turn out to count separately, is in
 * openspec media-pipeline design.md decisions 2–3. Adding a width here raises that ceiling.
 *
 * next.config.ts feeds these to `next/image`, which only ever asks the loader for widths
 * from `deviceSizes` ∪ `imageSizes`.
 */
export const DEVICE_SIZES = [640, 1080, 1600, 2048] as const;

/** Portraits, logos and other images narrower than the smallest device size. */
export const IMAGE_SIZES = [256, 480] as const;

export const MEDIA_WIDTHS: readonly number[] = [...IMAGE_SIZES, ...DEVICE_SIZES];

/** One quality only, so quality never multiplies the transformation count. */
export const MEDIA_QUALITY = 75;
