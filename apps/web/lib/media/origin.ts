/**
 * The only host the site may serve images from: the custom domain bound to the R2 bucket
 * (docs/adr/0002-cms.md decision 5). Never `*.r2.dev` (rate-limited, not for production),
 * never the `*.r2.cloudflarestorage.com` S3 endpoint, never the CMS host.
 *
 * A constant, deliberately not an environment variable: a per-environment media origin is
 * how a preview build ends up quietly serving images from `r2.dev`.
 */
export const MEDIA_ORIGIN = "https://media.kuasar.org";

export const MEDIA_HOST = new URL(MEDIA_ORIGIN).host;
