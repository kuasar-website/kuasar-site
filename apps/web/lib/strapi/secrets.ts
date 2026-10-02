import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a presented secret against the configured one. Both are
 * hashed first so the comparison never depends on, or leaks, the secret's length.
 * An unset/empty configured secret never matches (fail closed). Never logs either value.
 */
export function secretMatches(presented: string | null | undefined, configured: string | null | undefined): boolean {
  if (!configured || !presented) return false;
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(configured).digest();
  return timingSafeEqual(a, b);
}
