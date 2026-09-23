"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./reveal.module.css";

type RevealProps = {
  children: ReactNode;
};

function isInitiallyVisible(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();

  return bounds.top < window.innerHeight && bounds.bottom > 0;
}

function supportsViewTimeline() {
  return (
    CSS.supports("animation-timeline: view()") &&
    CSS.supports("animation-range: entry 0% cover 35%")
  );
}

export function Reveal({ children }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotion.matches || isInitiallyVisible(element)) return;

    if (supportsViewTimeline()) {
      element.dataset.revealMode = "view-timeline";

      return () => {
        delete element.dataset.revealMode;
      };
    }

    if (!("IntersectionObserver" in window)) return;

    element.dataset.revealMode = "observer";
    element.dataset.revealState = "pending";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        element.dataset.revealState = "visible";
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.1,
      },
    );

    const handleReducedMotion = (event: MediaQueryListEvent) => {
      if (!event.matches) return;

      observer.disconnect();
      delete element.dataset.revealMode;
      delete element.dataset.revealState;
    };

    observer.observe(element);
    reducedMotion.addEventListener("change", handleReducedMotion);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleReducedMotion);
      delete element.dataset.revealMode;
      delete element.dataset.revealState;
    };
  }, []);

  return (
    <div className={styles.reveal} ref={elementRef}>
      {children}
    </div>
  );
}
