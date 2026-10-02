"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import styles from "./signature.module.css";

type Engine = ComponentType<{ scope: RefObject<HTMLDivElement | null> }>;

export function TimelineSignature({ children, locale }: { children: ReactNode; locale: "en" | "tr" }) {
  const scope = useRef<HTMLDivElement>(null);
  const [Engine, setEngine] = useState<Engine | null>(null);
  useEffect(() => {
    const eligible = window.matchMedia("(min-width: 48rem) and (prefers-reduced-motion: no-preference)");
    let disposed = false;
    let requested = false;
    const load = () => {
      const root = scope.current;
      if (!eligible.matches || !root || requested || window.location.hash) return;
      const scroller = root.querySelector<HTMLElement>('[role="region"]');
      if (!scroller || scroller.querySelectorAll('li').length < 2 || scroller.scrollWidth <= scroller.clientWidth || root.offsetHeight > innerHeight - 96) return;
      requested = true;
      import('./engine').then(module => module.loadEngine()).then(component => {
        if (!disposed) setEngine(() => component);
      }).catch(() => { /* The visible native baseline is the complete failure path. */ });
    };
    load();
    eligible.addEventListener('change', load);
    window.addEventListener('resize', load);
    return () => { disposed = true; eligible.removeEventListener('change', load); window.removeEventListener('resize', load); };
  }, []);
  return <div ref={scope} className={styles.signature}>
    {children}
    <p className={styles.hint}>{locale === 'tr'
      ? 'Geçmişe ilerlemek için aşağı kaydırın. Normal kaydırmaya dönmek için Escape tuşuna basın.'
      : 'Scroll down to travel into the past. Press Escape to return to native scrolling.'}</p>
    {Engine && <Engine scope={scope} />}
  </div>;
}
