import type { NextConfig } from "next";

import { DEVICE_SIZES, IMAGE_SIZES, MEDIA_QUALITY } from "./lib/media/sizes.ts";

const nextConfig: NextConfig = {
  // Merge the timeline's deferred modules more eagerly so their shared code is
  // compressed together. Other routes retain the default priority.
  experimental: {
    turbopackChunking: {
      priorityRoutes: [/\/timeline$/, /\/zaman-cizelgesi$/],
      priorityBoost: 8,
    },
  },
  // design/i18n.md: "/" issues a fixed redirect to "/en" (no trailing slash — matches
  // the no-trailing-slash convention every other route already uses; a trailing-slash
  // target would take a second, unnecessary 308 hop through Next's own trailingSlash:
  // false normalization). Never Accept-Language sniffing (that needs middleware, which
  // this static-first site avoids), and never permanent: true — permanent: false is the
  // only setting that yields a 307, per
  // node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md
  // (permanent: true yields a 308, which caches indefinitely and cannot be undone).
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
};

export default nextConfig;
