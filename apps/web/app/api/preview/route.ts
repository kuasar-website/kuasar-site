import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { previewHeaders, strapiOrigin } from "@/lib/strapi/preview-headers";
import { resolvePreview } from "@/lib/strapi/preview-entry";

/** Strapi admin preview → Next.js Draft Mode. See lib/strapi/preview-entry.ts and the runbook, step 7. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const draft = await draftMode();
  const headers = previewHeaders(strapiOrigin(process.env.STRAPI_URL));
  const result = await resolvePreview(new URL(request.url), {
    secret: process.env.PREVIEW_SECRET,
    enable: () => draft.enable(),
    disable: () => draft.disable(),
  });
  if (result.status === 307) {
    // A relative Location: the browser resolves it against the URL it actually requested,
    // so the redirect is same-origin by construction. The path is derived, never input.
    return new Response(null, { status: 307, headers: { ...headers, Location: result.location, "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: result.error }, { status: result.status, headers: { ...headers, "Cache-Control": "no-store" } });
}
