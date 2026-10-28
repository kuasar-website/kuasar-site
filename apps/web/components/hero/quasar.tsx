import { useId } from "react";
import styles from "./quasar.module.css";

/** Decorative source artwork; the complete quasar is also the permanent fallback. */
export function Quasar() {
  const id = useId();
  return <div className={styles.art} aria-hidden="true" data-hero-art>
    <svg viewBox="0 0 600 600" focusable="false">
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor="var(--color-nebula-500)" stopOpacity=".3" />
          <stop offset="1" stopColor="var(--color-canvas)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-jet`} x1="0" y1="1" x2="0" y2="0">
          <stop stopColor="var(--color-ink)" />
          <stop offset=".45" stopColor="var(--color-orbit-400)" stopOpacity=".7" />
          <stop offset="1" stopColor="var(--color-orbit-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="300" cy="300" r="280" fill={`url(#${id}-halo)`} />
      <g transform="rotate(24 300 300)">
        <g data-hero-jets className={styles.jets}>
          <path d="M290 282 Q276 176 295 24 Q325 170 310 282Z" fill={`url(#${id}-jet)`} />
          <path d="M290 282 Q276 176 295 24 Q325 170 310 282Z" transform="rotate(180 300 300)" fill={`url(#${id}-jet)`} />
        </g>
        <g data-hero-rings className={styles.rings} fill="none">
          <ellipse cx="300" cy="300" rx="226" ry="72" stroke="var(--color-nebula-400)" strokeWidth="2" opacity=".5" />
          <ellipse cx="300" cy="300" rx="198" ry="58" stroke="var(--color-orbit-400)" strokeWidth="3" strokeDasharray="380 32 70 44" />
          <ellipse cx="300" cy="300" rx="163" ry="44" stroke="var(--color-ink-body)" strokeWidth="2" opacity=".8" />
        </g>
        <circle cx="300" cy="300" r="52" fill="var(--color-canvas)" stroke="var(--color-ink-body)" strokeWidth="2" />
        <path d="M139 310 Q300 391 461 310" fill="none" stroke="var(--color-orbit-400)" strokeWidth="4" />
      </g>
    </svg>
  </div>;
}
