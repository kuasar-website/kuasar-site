"use client";

import type { RefObject } from "react";

/** Only called after desktop/no-reduced-motion eligibility and visibility checks. */
export async function loadEngine() {
  const [gsap, useGSAP] = await Promise.all([
    import('gsap').then(module => module.gsap),
    import('@gsap/react').then(module => module.useGSAP),
  ]);
  gsap.registerPlugin(useGSAP);
  return function HeroEngine({ scope }: { scope: RefObject<HTMLDivElement | null> }) {
    useGSAP((_, contextSafe) => {
      const root = scope.current;
      const rings = root?.querySelector('[data-hero-rings]');
      const jets = root?.querySelector('[data-hero-jets]');
      if (!root || !rings || !jets) return;
      const mm = gsap.matchMedia();
      let ended = false;
      mm.add({ desktop: '(min-width: 48rem)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
        if (ended || !context.conditions?.desktop || context.conditions.reduced) return;
        const sequence = gsap.timeline({ paused: true });
        sequence.fromTo(rings, { rotation: -24 }, { rotation: 0, duration: 4, ease: 'power2.out', svgOrigin: '300 300' }, 0)
          .fromTo(jets, { opacity: 0, scaleY: 0.15 }, { opacity: 1, scaleY: 1, duration: 2.5, ease: 'power2.out', svgOrigin: '300 300' }, 1.5);
        root.dataset.heroMotion = 'active';
        let visible = false;
        const sync = contextSafe!(() => { if (visible && !document.hidden) sequence.resume(); else sequence.pause(); });
        const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
        observer.observe(root);
        document.addEventListener('visibilitychange', sync);
        const stop = contextSafe!((event: KeyboardEvent) => { if (event.key === 'Escape') { ended = true; mm.revert(); } });
        window.addEventListener('keydown', stop);
        // The fixture supplies a callback; no global test controls are shipped in production.
        const testRoot = root as HTMLDivElement & { heroTest?: (timeline: typeof sequence | null) => void };
        testRoot.heroTest?.(sequence);
        return () => {
          ended = true;
          observer.disconnect();
          document.removeEventListener('visibilitychange', sync);
          window.removeEventListener('keydown', stop);
          testRoot.heroTest?.(null);
          delete root.dataset.heroMotion;
        };
      }, scope);
      return () => { mm.revert(); };
    }, { scope, dependencies: [scope], revertOnUpdate: true });
    return null;
  };
}
