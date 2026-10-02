import { revalidateTag } from "next/cache";
import { handleRevalidate } from "@/lib/strapi/revalidate";

/** Strapi webhook → on-demand revalidation. See lib/strapi/revalidate.ts and the runbook, step 6. */
export const dynamic = "force-dynamic";

// revalidateTag(tag, 'max') only — never revalidatePath on these routes (design D2).
const deps = () => ({ secret: process.env.REVALIDATE_SECRET, revalidateTag });

export function POST(request: Request) {
  return handleRevalidate(request, deps());
}
export function GET(request: Request) {
  return handleRevalidate(request, deps());
}
