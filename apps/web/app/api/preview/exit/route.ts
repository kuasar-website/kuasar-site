import { draftMode } from "next/headers";
import { previewHeaders, strapiOrigin } from "@/lib/strapi/preview-headers";
import { exitLocale } from "@/lib/strapi/preview-entry";

/** Leave Draft Mode and return to the locale's home. POST only (it changes future requests). */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const draft = await draftMode();
  draft.disable();
  // Relative Location: same-origin by construction.
  return new Response(null, { status: 303, headers: {
    ...previewHeaders(strapiOrigin(process.env.STRAPI_URL)), Location: `/${exitLocale(new URL(request.url))}`, "Cache-Control": "no-store",
  } });
}
