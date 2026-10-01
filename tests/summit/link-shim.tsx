import type { AnchorHTMLAttributes } from "react";
// Test-only stand-in for next/link: the fixture has no Next router. Production uses next/link.
export default function Link({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: unknown }) {
  delete (rest as { prefetch?: unknown }).prefetch;
  return <a href={href} {...rest}>{children}</a>;
}
