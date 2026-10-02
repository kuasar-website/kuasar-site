"use client";

import type { RefObject } from "react";

/** Invoked by the eligibility effect, never during server rendering. */
export async function loadEngine() {
  const [gsap, ScrollTrigger, useGSAP] = await Promise.all([
    import('gsap').then(module => module.gsap),
    import('gsap/ScrollTrigger').then(module => module.ScrollTrigger),
    import('@gsap/react').then(module => module.useGSAP),
  ]);
  gsap.registerPlugin(ScrollTrigger, useGSAP);

  return function SignatureEngine({ scope }: { scope: RefObject<HTMLDivElement | null> }) {
    useGSAP((_, contextSafe) => {
      const root = scope.current;
      const stage = root?.firstElementChild as HTMLElement | null;
      const section = root?.querySelector<HTMLElement>('section');
      const viewport = section?.querySelector<HTMLElement>('[role="region"]');
      const track = viewport?.querySelector<HTMLOListElement>('ol');
      if (!root || !stage || !section || !viewport || !track) return;
      const originalStyle = track.getAttribute('style');
      const restoreTrack = () => { if (originalStyle === null) track.removeAttribute('style'); else track.setAttribute('style', originalStyle); };
      let alive = true;
      let active = false;
      const mm = gsap.matchMedia();
      const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      const fits = () => section.offsetHeight <= innerHeight - 96 && track.children.length > 1 && distance() > 0;
      mm.add({ desktop: '(min-width: 48rem)', mobile: '(max-width: 47.999rem)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
        if (!context.conditions?.desktop || context.conditions.reduced || !fits()) return;
        viewport.scrollLeft = 0;
        root.dataset.signature = 'active';
        active = true;
        gsap.to(track, {
          x: () => -distance(), ease: 'none',
          scrollTrigger: { id: 'kuasar-timeline-signature', trigger: stage, pin: stage,
            start: 'top 80px', end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true },
        });
        return () => { active = false; delete root.dataset.signature; restoreTrack(); };
      }, scope);

      const native = contextSafe!(() => {
        if (!alive || !active) return;
        const left = Math.abs(Number(gsap.getProperty(track, 'x')) || 0);
        mm.revert();
        restoreTrack();
        viewport.scrollLeft = left;
      });
      const focus = contextSafe!((event: FocusEvent) => {
        native();
        const target = event.target;
        if (target instanceof HTMLElement && viewport.contains(target)) target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      });
      const keyboard = contextSafe!((event: KeyboardEvent) => {
        if (['Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) native();
      });
      const refresh = contextSafe!(() => {
        if (!alive || !active) return;
        if (!fits()) native(); else ScrollTrigger.refresh();
      });
      const hash = contextSafe!(() => { if (window.location.hash) native(); });
      viewport.addEventListener('focusin', focus);
      window.addEventListener('keydown', keyboard);
      window.addEventListener('hashchange', hash);
      window.addEventListener('resize', refresh);
      track.addEventListener('load', refresh, true);
      void document.fonts.ready.then(() => { if (alive) refresh(); });
      return () => {
        alive = false; mm.revert(); delete root.dataset.signature; restoreTrack();
        viewport.removeEventListener('focusin', focus);
        window.removeEventListener('keydown', keyboard);
        window.removeEventListener('hashchange', hash);
        window.removeEventListener('resize', refresh);
        track.removeEventListener('load', refresh, true);
      };
    }, { scope, dependencies: [scope], revertOnUpdate: true });
    return null;
  };
}
