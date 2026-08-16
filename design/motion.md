# Motion

This site has **two motion budgets, and they are kept separate on purpose.** Interface
motion and narrative motion answer to different authorities, different durations and
different limits. Merging them is how a marketing site ends up with a 600ms dropdown, or a
hero sequence built out of button transitions.

- **Last updated:** 2026-08-15
- **Related:** [../docs/adr/0003-motion-stack.md](../docs/adr/0003-motion-stack.md),
  [../docs/adr/0004-verification.md](../docs/adr/0004-verification.md),
  [tokens.md](tokens.md)

| | Interface motion | Narrative motion |
| --- | --- | --- |
| **Covers** | Nav, buttons, cards, forms, hovers, focus | The signature hero, scroll storytelling, the Timeline |
| **Authority** | `emilkowalski/skill` | This document + [ADR 0003](../docs/adr/0003-motion-stack.md) |
| **Tiers** | L3, L2 | L1 |
| **Library** | Never | GSAP, dynamically imported, L1 routes only |
| **Duration ceiling** | 300ms | No fixed ceiling; a weight budget instead |
| **Where it lives** | Everywhere | Two routes, total |

---

# Budget 1 — Interface motion

Governed by `emilkowalski/skill`. Consult it before building; this section records only
the project-specific decisions and the one place where our policy overrides it.

## The gate: should this animate at all?

Run this first. It is supposed to produce zero lines of code sometimes.

| Frequency | Decision |
| --- | --- |
| 100+ times/day | **No animation. Ever.** |
| Tens of times/day (hover, list navigation) | Near-imperceptible only — fast and subtle, or nothing |
| Occasional (dialogs, disclosure, menus) | Standard animation |
| Rare / first-time | Where any delight budget lives |

Then name the purpose in one word — feedback, spatial consistency, state indication,
preventing a jarring change, explanation, or delight. **If you cannot name it, do not
build it.** "It looks cool" is a reason to stop, not a purpose.

## The override: CSS only, no exceptions

`emilkowalski/skill`'s tool table ends with a motion library for springs, gesture-driven
values and layout animations. **On this project that row is unavailable.**
[ADR 0003](../docs/adr/0003-motion-stack.md) permits a library at L1 only, and interface
motion is never L1.

So when the skill's decision procedure arrives at "reach for a spring," the correct
response here is **to choose a simpler interaction**, not to import a library. A gesture
that genuinely requires spring physics is a signal that the interaction is too ambitious
for a promotional site, not a signal that the policy should bend.

This is the single most likely place for the policy to be argued with. It is written down
so the argument has to be made against a decision rather than into a gap.

Practically, the tools available are: CSS transitions (most things), `@starting-style`
(entry without JS), CSS animations (predetermined motion — these run off the main thread
and beat JS while the page is loading), and WAAPI where programmatic control is genuinely
needed.

## Properties

**`transform` and `opacity` only.** They skip layout and paint. `width`, `height`,
`margin`, `padding`, `top`, `left` trigger all three, and
[ADR 0004](../docs/adr/0004-verification.md) fails the build on them.

- **Never `scale(0)`.** Start from `scale(0.95)` with `opacity: 0`. Nothing in the real
  world appears out of nothing.
- **Percentages in `translate()`** are relative to the element's own size — prefer
  `translateY(100%)` over a hardcoded pixel value.
- **Never `transition: all`.** Name the properties.

## Easing and duration

From [tokens.md](tokens.md); never a literal.

| Situation | Token |
| --- | --- |
| Entering or exiting | `--ease-out` |
| Moving or morphing on screen | `--ease-in-out` |
| Hover / colour change | built-in `ease` is fine |
| Default | `--ease-out` |

**There is no `ease-in` on this site.** It starts slow, delaying the moment the user is
watching.

| Element | Duration |
| --- | --- |
| Button press feedback | `--duration-instant` (100ms) |
| Hover, focus | `--duration-fast` (150ms) |
| Disclosure, menus, cards | `--duration-base` (200ms) |
| Anything larger | `--duration-slow` (300ms) — the ceiling. Justify it |

**Interface motion stays under 300ms.** A 180ms transition feels more responsive than a
400ms one; slowness reads as lag, not as elegance.

## The three interaction types

Exactly three site-wide. **No component-local button styles** — a fourth style is a design
defect, not a variation.

| Type | Used for | Hover |
| --- | --- | --- |
| **Primary CTA** | Explore Missions, Join KUASAR, Register | Fill lightens to `--color-cta-hover` |
| **Secondary, outline** | Discover Galactic Summit | Border brightens |
| **Text link with arrow** | Learn more → | Arrow shifts ~2px |

Hover stays minimal: arrow shift, slight scale, or border change. Nothing else.

**Default to one Primary CTA visible per viewport.** Guidance, not a hard rule — a second
one is allowed where the case is made, and the case goes in the pull request.

The reasoning: [ADR 0001](../docs/adr/0001-stack.md) says the two audiences are **unranked**
— sponsors heading for the sponsorship PDF, prospective members heading for Join Us. Two
filled orange buttons side by side get ranked anyway, by position and reading order, and
that visual precedence contradicts a decision made at ADR level. Orange is also reserved
and semantic ([brand.md](brand.md)); the more of it is on screen, the less any of it means.

The usual resolution is Primary plus Secondary outline rather than two Primaries.

**Why this is guidance and not a rule.** Primary-plus-Secondary *also* ranks the two
audiences — it just does it more quietly, so the rule does not actually deliver what its
reasoning promises. And no CI gate can see this; [ADR 0004](../docs/adr/0004-verification.md)
checks weight and imports, not visual hierarchy. Writing it as absolute would be pretending
to an enforcement that does not exist. Treat it as the default a reviewer may ask you to
justify departing from.

## Hover and reduced motion ship with the animation

Not as a follow-up. Both are required at review.

```css
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: scale(1.02); } /* touch fires false hovers on tap */
}

@media (prefers-reduced-motion: reduce) {
  .card { transition-duration: var(--duration-instant); }
  .card:hover { transform: none; } /* keep opacity/colour, drop movement */
}
```

For interface motion, reduced motion means **fewer and gentler**, not zero — keep
transitions that aid comprehension, remove movement and position change.

---

# Budget 2 — Narrative motion

The signature hero, scroll storytelling, and the Timeline. This is the site's reason for
being animation-forward, and it is confined to two routes.

## Where it may exist

**Exactly two L1 routes, site-wide:**

1. `/[locale]` — the home hero: a dark navy-black space atmosphere, a black hole rotating
   and resolving into a quasar. The KUASAR wordmark sits left, large and bold, with "Koç
   University Association of Space & Rocketry" beneath it.
2. `/[locale]/timeline` — the scroll-linked Timeline.

**A third L1 requires its own ADR.** So does a second animation library.

Note the IA consequence recorded in [ADR 0003](../docs/adr/0003-motion-stack.md): the
Timeline has its own route, so it moves from "sections with no detail page" into the
view-more list. The home page keeps a Timeline *section* on the native baseline with a
"view more" affordance; the scroll-linked version lives only on the route. Timeline
remains absent from the navbar, as originally specified.

## Weight budgets

The machine-readable source of truth is `apps/web/budgets.json`, and **CI is
authoritative** — this table is the human-readable statement of the same numbers. If they
disagree, the JSON is right and this file needs updating.

| Route | First-load JS (gzipped) | Deferred animation chunk |
| --- | --- | --- |
| `/[locale]` (home) | **≤ 110 KB** | ≤ 45 KB |
| `/[locale]/timeline` | ≤ 120 KB | ≤ 45 KB |
| Every other route | ≤ 120 KB | **0 KB** |

**The home page gets the stricter line.** It carries every section plus the signature, and
it is where sponsors land. It has the least room to spare, not the most.

Two things make these numbers work:

- **First-load JS is capped even on L1 routes.** Because the animation library is
  dynamically imported, it is not part of first load — so an L1 route has no claim to a
  larger first load than any other. If an L1 route's first-load number rises, something
  was imported statically that should not have been.
- **The 45 KB deferred chunk** fits GSAP core (~23 KB gz) plus ScrollTrigger (~7 KB gz)
  plus `@gsap/react`, leaving roughly 14 KB for the sequence's own code.

If the signature turns out to be 3D, three.js is roughly 150 KB gzipped and **does not
fit**. That change proposal must argue explicitly for raising its own route's cap and ship
the static fallback first. The budget does not quietly accommodate it — that is the point
of writing the number down before the technique is chosen.

## Field performance targets

Weight is a proxy. These are the outcomes, measured by Vercel Speed Insights on real
devices — the only thing that can falsify the whole policy.

| Metric | Target |
| --- | --- |
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Lighthouse performance (home, one detail page) | ≥ 90 |

## The baseline ships first, always

**Non-negotiable, and it applies to both L1 sequences.**

The un-animated version is built, reviewed and shipped before any enhancement. It is not a
fallback added afterwards; it is the product, and the animation is progressive enhancement
over it. A visitor with JavaScript disabled, a slow connection, reduced motion enabled, or
a phone gets a complete page.

For the hero, that is a static composition with the wordmark and the subtitle. For the
Timeline, it is a horizontally scrollable container with CSS scroll-snap — keyboard
accessible, swipeable, zero JavaScript, and a correct reduced-motion path by construction.

## Reduced motion means a genuine non-animated path

**Not a shortened animation.** Playing the same sequence at 2× speed is not a
reduced-motion implementation, and this is where narrative motion differs sharply from
interface motion: at L1 the correct reduced-motion result is usually the static baseline
itself.

Any smooth-scroll must be **fully disabled** under `prefers-reduced-motion`, and the site
must stay navigable without it.

## Mobile

- L1 gets a simplified version or a rendered image sequence.
- **The Timeline always gets the native version on mobile.** Scroll-linked pinning fights
  address-bar resize and momentum scrolling on mobile browsers, and loses.
- The breakpoint for this decision is `md` (48rem) from [tokens.md](tokens.md).

## The Timeline's direction problem

The Timeline runs **rightward from present to past**, which inverts reading-order
expectation. The baseline must make the direction legible **without motion** — an axis
label, a visible "now" marker, or an initial scroll affordance.

If a first-time visitor cannot tell which way is older within a second, the baseline is
wrong, and no amount of scroll-linked polish will fix it.

The Timeline is backward-looking and **distinct from Schedule**, which is
forward-looking. Do not merge them.

---

# Every animation declares three things

Required in the pull request, per
[../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md):

```
Tier:            L1 / L2 / L3, and the route
Reduced motion:  what a reduced-motion user sees instead
Mobile:          what a phone gets
```

An animation that cannot answer all three is not finished.

# What CI checks, and what it cannot

[ADR 0004](../docs/adr/0004-verification.md) enforces: the import-graph rule (no animation
library outside L1 routes), per-route first-load JS, reduced-motion paths exist, GSAP
cleanup on unmount, no layout-property animation, durations reference tokens, and motion
determinism as computed-value assertions at fixed timeline progress.

**It cannot tell you whether an animation feels right.** Timing, easing and whether a
sequence reads as intentional are human judgements. A pull request touching motion
attaches a short screen recording and the reviewer watches it. Do not build an agent
screenshot loop to substitute for this — it produces confident output about a question it
cannot answer.

When you cannot judge feel from code, play it at 2–5× duration, step it in the DevTools
animation inspector, test gestures on a real device, and look again the next day.
