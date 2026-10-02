/**
 * Headers for preview responses only (design D5): framing limited to this site and the
 * Strapi admin origin, and never indexed. Public responses get none of this.
 */
export const DRAFT_MODE_COOKIE = "__prerender_bypass";

export function strapiOrigin(strapiUrl: string | undefined): string | null {
  if (!strapiUrl) return null;
  try { return new URL(strapiUrl).origin; } catch { return null; }
}

export function previewHeaders(origin: string | null): Record<string, string> {
  return {
    "Content-Security-Policy": `frame-ancestors 'self'${origin ? ` ${origin}` : ""}`,
    "X-Robots-Tag": "noindex",
  };
}
