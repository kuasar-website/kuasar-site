import type { MetadataRoute } from "next";

/**
 * See CLAUDE.md, "Unresolved, on purpose" — `<DOMAIN>` is a placeholder until
 * the domain is registered (docs/ops/cms-runbook.md, step 1).
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://<DOMAIN>";

/**
 * Neither locale prefix is disallowed, per design/i18n.md. The preview
 * route's `noindex` requirement (design/i18n.md; docs/adr/0002-cms.md) is
 * explicitly deferred to `publish-integration` — the preview route does not
 * exist yet — rather than silently omitted. Add a `disallow` entry for it
 * once that capability ships.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
