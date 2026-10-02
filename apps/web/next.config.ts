import type { NextConfig } from "next";

import { DEVICE_SIZES, IMAGE_SIZES, MEDIA_QUALITY } from "./lib/media/sizes.ts";
import { DRAFT_MODE_COOKIE, previewHeaders, strapiOrigin } from "./lib/strapi/preview-headers.ts";

const nextConfig: NextConfig = {
  // design/i18n.md: "/" issues a fixed redirect to "/en" (no trailing slash — matches
  // the no-trailing-slash convention every other route already uses; a trailing-slash
  // target would take a second, unnecessary 308 hop through Next's own trailingSlash:
  // false normalization). Never Accept-Language sniffing (that needs middleware, which
  // this static-first site avoids), and never permanent: true — permanent: false is the
  // only setting that yields a 307, per
  // node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md
  // (permanent: true yields a 308, which caches indefinitely and cannot be undone).
  // Preview only (publish-integration, design D5): responses served under Draft Mode may be
  // framed by the Strapi admin and are never indexed. Requests without the Draft Mode
  // cookie match nothing here, so public responses keep exactly their existing headers.
  async headers() {
    const origin = strapiOrigin(process.env.STRAPI_URL);
    if (!origin) return [];
    return [{
      source: "/:path*",
      has: [{ type: "cookie", key: DRAFT_MODE_COOKIE }],
      headers: Object.entries(previewHeaders(origin)).map(([key, value]) => ({ key, value })),
    }];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/en",
        permanent: false,
      },
    ];
  },
  // Every next/image goes through the Cloudflare edge loader, never Vercel's optimiser
  // (docs/adr/0002-cms.md decision 5). Widths and quality are a fixed set because each
  // distinct one is a billable transformation — see lib/media/sizes.ts.
  images: {
    loader: "custom",
    loaderFile: "./lib/media/cloudflare-loader.ts",
    deviceSizes: [...DEVICE_SIZES],
    imageSizes: [...IMAGE_SIZES],
    qualities: [MEDIA_QUALITY],
  },
  // The root layout is app/[locale]/layout.tsx, so a URL that matches no locale route has
  // no layout to render a 404 inside. app/global-not-found.tsx is that 404's own document
  // (openspec/changes/root-document-lang). Experimental since v15.4, per
  // node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md.
  experimental: {
    globalNotFound: true,
  },
};

export default nextConfig;
