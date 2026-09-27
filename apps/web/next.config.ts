import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // design/i18n.md: "/" issues a fixed redirect to "/en/". Never Accept-Language
  // sniffing (that needs middleware, which this static-first site avoids), and never
  // permanent: true — permanent: false is the only setting that yields a 307, per
  // node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md
  // (permanent: true yields a 308, which caches indefinitely and cannot be undone).
  async redirects() {
    return [
      {
        source: "/",
        destination: "/en/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
