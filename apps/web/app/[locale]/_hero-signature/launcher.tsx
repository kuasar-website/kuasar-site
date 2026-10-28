"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react";

type Engine = ComponentType<{ scope: RefObject<HTMLDivElement | null> }>;

/** The server-rendered children remain visible even when enhancement cannot load. */
export function HeroSignature({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const [Engine, setEngine] = useState<Engine | null>(null);
  useEffect(() => {
    if (!scope.current || !window.IntersectionObserver) return;
    const eligible = matchMedia('(min-width: 48rem) and (prefers-reduced-motion: no-preference)');
    let alive = true;
    let requested = false;
    let visible = false;
    const load = () => {
      if (!eligible.matches || !visible || requested || document.hidden) return;
      requested = true;
      void import('./engine').then(module => module.loadEngine()).then(engine => {
        if (alive && eligible.matches) setEngine(() => engine);
      }).catch(() => { /* The static hero is the complete product. */ });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; load(); });
    observer.observe(scope.current);
    eligible.addEventListener('change', load);
    document.addEventListener('visibilitychange', load);
    return () => {
      alive = false;
      observer.disconnect();
      eligible.removeEventListener('change', load);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);
  return <div ref={scope} data-hero-signature>{children}{Engine && <Engine scope={scope} />}</div>;
}
