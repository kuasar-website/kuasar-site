# Design tokens

Colour, spacing, type scale, breakpoints, motion primitives.

- **Last updated:** 2026-08-15
- **Related:** [brand.md](brand.md), [motion.md](motion.md),
  [../docs/adr/0001-stack.md](../docs/adr/0001-stack.md)

`ASSUMPTION:` no brand palette existed when this was written. Every value below is
derived from the brief's description — dark navy to near-black base, graphite and fume
surfaces, purple and orbital blue as accents, orange reserved as semantic. **Correct the
hex/oklch values against the wordmark before any UI is built**; the structure is the part
meant to survive, not the specific numbers.

## How tokens work here

[ADR 0001](../docs/adr/0001-stack.md) chose Tailwind v4, where `@theme` emits real CSS
custom properties **and** generates utility classes from them. That dual nature is why
this file can be enforced:

- Components use utilities: `bg-surface-raised`, `text-ink-muted`.
- Hand-written CSS — keyframes, transitions, the L2 and L3 tiers, which are CSS-only by
  policy — uses the same names: `var(--duration-base)`.

One definition, two consumers. This is what makes
[ADR 0004](../docs/adr/0004-verification.md)'s "durations reference tokens rather than
literals" check possible rather than aspirational.

**Two hard rules:**

1. **No raw colour values in components.** No hex, no `rgb()`, no `oklch()` outside this
   token layer.
2. **No raw time values in animations.** No `200ms`, no `0.3s`. Use `var(--duration-*)`
   and `var(--ease-*)`. CI enforces this.

## Colour

Values are in `oklch()` for perceptually even steps and better interpolation than hex —
this matters for gradients and for hover states derived by lightness shift.

### Base and surfaces

Dark navy through near-black, with graphite and fume for raised surfaces.

```css
@theme {
  --color-space-950: oklch(0.13 0.025 265); /* page background, deepest */
  --color-space-900: oklch(0.17 0.028 265); /* default section background */
  --color-space-800: oklch(0.22 0.024 264); /* raised surface: cards, panels */
  --color-space-700: oklch(0.28 0.020 262); /* graphite: elevated surface, inputs */
  --color-space-600: oklch(0.36 0.016 262); /* fume: borders, dividers */
  --color-space-500: oklch(0.48 0.012 260); /* disabled, faint rules */
}
```

Semantic aliases — **prefer these in components**, because they say what a colour is for
rather than how dark it is:

```css
@theme {
  --color-canvas:         var(--color-space-950);
  --color-surface:        var(--color-space-900);
  --color-surface-raised: var(--color-space-800);
  --color-surface-inset:  var(--color-space-700);
  --color-border:         var(--color-space-600);
  --color-border-strong:  var(--color-space-500);
}
```

### Ink

```css
@theme {
  --color-ink:          oklch(0.97 0.004 260); /* headings */
  --color-ink-body:     oklch(0.90 0.006 260); /* body copy */
  --color-ink-muted:    oklch(0.70 0.010 260); /* captions, metadata */
  --color-ink-faint:    oklch(0.55 0.012 260); /* disabled */
  --color-ink-inverted: oklch(0.15 0.020 265); /* on light or on CTA fills */
}
```

`--color-ink-body` on `--color-canvas` clears WCAG AA comfortably.
`--color-ink-muted` is the floor for body-sized text — do not go below it, and do not use
`--color-ink-faint` for anything a user must read. The axe-core gate in
[ADR 0004](../docs/adr/0004-verification.md) will catch violations, but catching them at
design time is cheaper.

### Accents — emphasis and depth only

Purple and orbital blue. **For emphasis and depth, never for decoration**, and never as a
glow. See the anti-gaming rule in [brand.md](brand.md).

```css
@theme {
  --color-nebula-400: oklch(0.68 0.16 296); /* purple, light */
  --color-nebula-500: oklch(0.55 0.19 295); /* purple, core */
  --color-nebula-600: oklch(0.43 0.17 296); /* purple, deep */

  --color-orbit-400:  oklch(0.72 0.13 238); /* orbital blue, light */
  --color-orbit-500:  oklch(0.62 0.15 240); /* orbital blue, core */
  --color-orbit-600:  oklch(0.50 0.14 242); /* orbital blue, deep */
}
```

### Fire is semantic, not a palette entry

**Orange is reserved.** Launch, ignition, live, upcoming, and the primary call to action.
Nothing else.

It is therefore defined **only** under state names. There is deliberately no
`--color-orange-500`, because a palette entry would be reached for decoratively within a
season and the semantics would be gone.

```css
@theme {
  --color-state-live:     oklch(0.70 0.19 45); /* happening now */
  --color-state-upcoming: oklch(0.75 0.15 58); /* scheduled, not yet */
  --color-state-past:     var(--color-ink-muted); /* deliberately not orange */

  --color-cta:            oklch(0.70 0.19 45);
  --color-cta-hover:      oklch(0.75 0.19 45);
  --color-cta-ink:        var(--color-ink-inverted);
}
```

`--color-state-live`, `--color-state-upcoming` and `--color-cta` share one hue by design.
They are separate tokens because they are separate meanings, and one of them will
eventually need to change without the others.

**Reviewer's test:** if a proposed use of orange is not a launch, a live/upcoming state,
or the primary CTA, it is wrong — regardless of how good it looks.

Note that live/upcoming states are computed **client-side after mount**
([ADR 0001](../docs/adr/0001-stack.md), rule 3). The server renders the neutral form, so
`--color-state-past` and the neutral treatment must look deliberate on their own — they
are what the page ships with and what a no-JS visitor keeps.

### Galactic Summit accent set

[ADR 0002](../docs/adr/0002-cms.md) permits per-year Summit theming through a **constrained
enum** on the Strapi entity. This is the fixed set those enum values map to. Editors
choose among them; adding a new one is a code change.

```css
@theme {
  --color-summit-aurora: oklch(0.68 0.15 175); /* teal-green */
  --color-summit-ion:    oklch(0.70 0.14 225); /* cold blue */
  --color-summit-violet: oklch(0.62 0.18 305); /* violet */
  --color-summit-ember:  oklch(0.66 0.16 30);  /* warm red — NOT the CTA orange */
}
```

`--color-summit-ember` is close to the fire hue and is the one to watch: it must never be
used where it could be mistaken for a live state or a primary CTA. If that proves
confusing in practice, delete it rather than adding a rule about it.

## Typography

Two tiers. Full usage rules — including the Turkish glyph restriction, which is a
correctness rule and not a stylistic one — are in [brand.md](brand.md).

```css
@theme {
  --font-display: "Orbitron", var(--font-sans);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

### Scale

A ~1.25 ratio at body sizes, opening up at display sizes where the display face lives.

```css
@theme {
  --text-xs:   0.75rem;  --text-xs--line-height:   1.5;
  --text-sm:   0.875rem; --text-sm--line-height:   1.5;
  --text-base: 1rem;     --text-base--line-height: 1.65; /* body: generous */
  --text-lg:   1.125rem; --text-lg--line-height:   1.6;
  --text-xl:   1.375rem; --text-xl--line-height:   1.4;
  --text-2xl:  1.75rem;  --text-2xl--line-height:  1.3;
  --text-3xl:  2.25rem;  --text-3xl--line-height:  1.2;
  --text-4xl:  3rem;     --text-4xl--line-height:  1.1;
  --text-5xl:  4rem;     --text-5xl--line-height:  1.05;
  --text-6xl:  5.5rem;   --text-6xl--line-height:  1.0;  /* hero wordmark */
}
```

Body copy sits at `--text-base` with a 1.65 line height. The brief calls for generous
whitespace and clean typography; loose leading on body text is most of that, and it is the
first thing lost when someone is fitting a section to a viewport.

`--text-4xl` and above are display sizes and are where the Orbitron glyph restriction
bites hardest — a fallback glyph mid-word at 64px is unmissable.

### Measure

```css
@theme {
  --container-prose: 68ch; /* maximum line length for body copy */
}
```

## Spacing

Tailwind v4 derives the whole spacing scale from one base:

```css
@theme {
  --spacing: 0.25rem; /* so p-4 = 1rem, p-8 = 2rem, and so on */
}
```

Section rhythm is separate, because vertical section spacing on a scroll-led page is a
design decision rather than a multiple of a base unit:

```css
@theme {
  --space-section:       6rem;  /* between sections, mobile */
  --space-section-lg:    10rem; /* between sections, desktop */
  --space-section-tight: 4rem;  /* where two sections are one thought */
}
```

## Breakpoints

```css
@theme {
  --breakpoint-sm: 40rem;  /* 640px  large phone */
  --breakpoint-md: 48rem;  /* 768px  tablet */
  --breakpoint-lg: 64rem;  /* 1024px laptop */
  --breakpoint-xl: 80rem;  /* 1280px desktop */
  --breakpoint-2xl: 96rem; /* 1536px large desktop */
}
```

`md` (48rem) is the significant one for motion, not for layout: it is the boundary
[motion.md](motion.md) uses to decide whether a route gets the L1 sequence or its mobile
fallback.

## Motion primitives

Durations and easings live here rather than in [motion.md](motion.md) because they are
tokens that CI checks. `motion.md` decides *when* to animate; this decides *what values
are legal*.

The curves below are taken from the `emilkowalski/skill` tables, which
[motion.md](motion.md) makes the authority for interface motion. They are **not
approximations** — do not round them, and do not add a parallel curve because one "looks
about right." Built-in CSS easings are too weak for anything deliberate.

```css
@theme {
  /* Interface tier. UI motion stays under 300ms — see motion.md. */
  --duration-instant: 100ms; /* button press feedback */
  --duration-fast:    150ms; /* hover, focus — L3 default */
  --duration-base:    200ms; /* the default for anything visible */
  --duration-slow:    300ms; /* ceiling for interface motion. Justify reaching it */

  /* Narrative tier. L1 and L2 only — never on a component. */
  --duration-reveal:    450ms; /* section reveal — L2 default */
  --duration-narrative: 800ms; /* signature sequence beats */

  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);   /* entering AND exiting. The default */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* moving between two on-screen states */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like drawer curve */
}
```

**`--ease-out` is the default and covers almost everything**, including exits. There is
deliberately **no `--ease-in` token**: `ease-in` starts slow, delaying the exact moment
the user is watching, and `ease-out` at 200ms feels faster than `ease-in` at 200ms. If you
find yourself wanting one, you want `--ease-out`.

For plain hover colour changes, the built-in `ease` is acceptable — the curve is
imperceptible over 150ms on a colour transition.

Anything longer than `--duration-slow` is narrative motion. It belongs to an L1 or L2
sequence with a route budget, never to a button or a card.

## What is deliberately not here

- **No shadow scale.** On a near-black canvas, elevation reads through surface lightness
  (`--color-surface-raised`, `--color-surface-inset`) rather than through shadow. Adding
  shadows on top produces muddy edges.
- **No glow, no neon, no global gradient.** Ruled out in [brand.md](brand.md) — the site
  must not read as "gaming."
- **No per-component tokens.** If a component needs a value that is not here, either it
  belongs here or the component is wrong. Component-local tokens are how design systems
  quietly stop being systems.
