import "server-only";
import { draftMode } from "next/headers";

/**
 * Whether this request is an editor preview (Next.js Draft Mode). Static generation and
 * public visitors get false; only the /api/preview cookie turns it on. Any failure to
 * read Draft Mode falls back to the published path.
 */
export async function isPreview(): Promise<boolean> {
  try {
    const draft = await draftMode();
    return draft.isEnabled;
  } catch {
    return false;
  }
}

export const previewToken = () => process.env.STRAPI_PREVIEW_TOKEN || undefined;
