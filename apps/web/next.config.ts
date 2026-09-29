import type { NextConfig } from "next";

import { DEVICE_SIZES, IMAGE_SIZES, MEDIA_QUALITY } from "./lib/media/sizes.ts";

const nextConfig: NextConfig = {
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
