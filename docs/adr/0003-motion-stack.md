# 0003 — Tiered animation-dependency policy

- **Status:** Accepted, amended 2026-09-03
- **Date:** 2026-08-15
- **Related:** [0001-stack.md](0001-stack.md), [0004-verification.md](0004-verification.md),
  [../../design/motion.md](../../design/motion.md)

> **Amended 2026-09-03.** [../../design/motion.md](../../design/motion.md)'s first-load
> numbers were raised after `verification-gates` measured the unmodified Next.js 16.3.1 +
> React 19.2.8 scaffold at 136.0 KB gzipped first-load JS — above the original 110 / 120 KB
> figures, which therefore could not function as a budget. Home is now 160 KB, the
> site-wide default and the Timeline 175 KB. **The policy in this ADR is unchanged:** home
> stays the stricter line, the deferred animation chunk stays 45 KB, three.js still does
> not fit, and the numeric table still lives in motion.md rather than here. This amendment
> records why the numbers moved.

## Context

[0001-stack.md](0001-stack.md) chose Next.js knowing it ships a heavier JavaScript
baseline than a static-first framework. That baseline is the JavaScript budget already
spent. **It is not a licence to add an animation library on top of it.**

This site is animation-forward by intent — a signature hero sequence, scroll storytelling,
a scroll-linked timeline. The temptation is to install one motion library globally and
reach for it everywhere, because that is the path of least resistance and every tutorial
does it. On a site whose primary audiences arrive on phones over Turkish mobile networks,
that decision is invisible during development and decisive in production.

So the policy is tiered by motion level, and the tiering is enforced mechanically rather
than by review discipline.

## Decision

### The three levels

| Tier | Scope | Dependency policy |
| --- | --- | --- |
| **L1 Signature** | The hero sequence; the scroll-linked Timeline | The only tier where a library is justified |
| **L2 Section** | Fade, reveal, light parallax. Never stacked | **No library** |
| **L3 Micro** | Button, card, mission-patch hover, focus, active | **CSS only. No exceptions** |

**L3 — CSS only.** Hover, focus, active, button and card states. No library, no
exceptions. These are the animations most likely to be written by whoever is newest, and
the tier where a library dependency buys the least.

**L2 — no library.** CSS scroll-driven animations where browser support allows,
`IntersectionObserver` as the fallback. Verify current support rather than assuming it,
and treat the animated version as progressive enhancement over a visible, un-animated
baseline. **This tier covers most of the site.**

**L1 — a library is justified.** Default: GSAP with ScrollTrigger, in a client component,
**dynamically imported** so it never enters the shared bundle.

### L1 is capped at two routes site-wide

The two are the **home hero** and **`/[locale]/timeline`**. Any third L1 requires its own
ADR.

This resolves a contradiction in the source brief, which named the Timeline as an L1 while
also placing it only in the home-page scroll with no route of its own. That would have put
both signature sequences on a single route — the heaviest one, and the one where sponsors
land.

The resolution: **the Timeline gets its own route.** The home page keeps a Timeline
*section* built on the native scroll-snap baseline with a "view more" affordance into
`/[locale]/timeline`, where the scroll-linked L1 lives. Timeline stays out of the navbar as
originally specified. The consequence for the information architecture is recorded in
[../../design/motion.md](../../design/motion.md): Timeline moves from "sections with no
detail page" into the view-more list.

Each of the two L1 routes therefore carries exactly one signature sequence.

### The import-graph rule is what enforces the tiering — not the weight budget

This inverts the emphasis of the original brief and is the most important sentence in this
ADR.

Because the L1 library is **dynamically imported**, it never appears in first-load
JavaScript. A weight budget alone would therefore happily pass a route that statically
imported GSAP into the shared chunk — the shared chunk grows, every route pays, and no
per-route number necessarily trips.

So [0004-verification.md](0004-verification.md) enforces two separate things:

1. **A static import-graph assertion**: `gsap`, `@gsap/react` and any GSAP plugin may be
   imported only from the designated L1 route segments, and only through a dynamic import.
   This is the real enforcement, it costs no CI time, and it catches the failure at zero
   bytes rather than after the regression ships.
2. **A first-load JavaScript budget per route**, which catches everything else.

Numeric budgets live in [../../design/motion.md](../../design/motion.md) so that designers
and reviewers have one file to read. In summary: first-load JS is capped on **every** route
including L1 routes — precisely because the animation library is deferred, an L1 route has
no claim to a larger first load — with the home page held to a stricter line than the
site-wide default, and a separate cap on the deferred animation chunk that only L1 routes
may load at all.

### Library choice: GSAP by default, finalised with the signature

GSAP and all its former Club plugins have been free for any use since April 2025,
following Webflow's acquisition of GreenSock. **Licensing is not a constraint** and should
not be raised as one.

The signature's implementation technique — 3D, rendered image sequence, or canvas/shader —
is deliberately **not decided here**. This ADR defines the budget it must fit inside and
requires a static fallback that ships first; the technique gets its own change proposal.

Finalise the library choice **with** that change, not before it:

- If the signature is a **rendered image sequence**, ScrollTrigger alone suffices.
- If it is **3D**, three.js leads and GSAP is secondary — and three.js at roughly 150 KB
  gzipped does not fit the deferred-chunk budget. That change proposal must therefore
  argue explicitly for raising its own route's cap, ship the static fallback first, and
  justify the number. The budget does not silently accommodate it, which is the point.

**One motion library site-wide.** A second animation dependency requires its own ADR.

### React integration rules

In React, use `@gsap/react` and its `useGSAP()` hook rather than raw `useEffect`. It
handles cleanup and StrictMode double-invocation, which are the two ways GSAP-in-React
normally breaks. Per the vendored `gsap-react` skill, which is the authority here:

- `gsap.registerPlugin(useGSAP)` before running any GSAP code.
- **Always pass a `scope`** (a ref or element) so selector strings are limited to the
  component. An unscoped `.box` selector matching an element in another component is a
  bug that only appears once a second component uses the same class name.
- Use **`contextSafe`** to wrap callbacks created after `useGSAP` runs — pointer handlers,
  `onComplete` — otherwise they are outside the context and are never reverted.
- Where `useGSAP` is not an option, `gsap.context()` inside `useEffect` with
  `ctx.revert()` in the cleanup. Never a bare `useEffect` with no revert.
- **Never call GSAP or ScrollTrigger during SSR.** All usage stays inside client-only
  lifecycle.

[0004-verification.md](0004-verification.md) asserts the cleanup and scope rules
statically, because they fail silently — a leaked ScrollTrigger does not throw, it just
makes the site progressively worse as the user navigates.

### Do not add Lenis

ScrollSmoother is free and lives in the same ecosystem as ScrollTrigger. Adding Lenis
means two scroll systems to keep in sync for no gain.

Any smooth-scroll must be **fully disabled** under `prefers-reduced-motion`, and the site
must stay navigable without it. Smooth-scroll libraries that hijack the scroll container
are a common cause of broken keyboard navigation and broken anchor links; if it cannot be
turned off cleanly, it does not ship.

### Reduced motion and mobile are requirements, not fallbacks

- `prefers-reduced-motion` requires a **genuine non-animated path**, not a shortened
  animation. Playing the same sequence faster is not a reduced-motion implementation.
- Mobile gets a simplified version or an image sequence for L1.
- **Mobile always gets the native version of the Timeline.** Scroll-linked pinning fights
  address-bar resize and momentum scrolling on mobile browsers, and loses.
- Every animation declares its reduced-motion path and its mobile fallback. This is
  stated as a per-animation obligation in [../../design/motion.md](../../design/motion.md)
  and checked in [0004-verification.md](0004-verification.md).

### The Timeline's baseline ships first and is permanent

The Timeline is backward-looking — KUASAR's accomplishments and major events, moving
rightward from present to past. It is distinct from Schedule; do not merge them.

- **The native baseline ships first and is the permanent fallback**: a horizontally
  scrollable container with CSS scroll-snap. Keyboard accessible, swipeable, zero
  JavaScript, and a correct `prefers-reduced-motion` path by construction.
- **The scroll-linked enhancement is its own change proposal**, must argue for its budget,
  and is progressive enhancement over that baseline.
- Rightward-from-present inverts reading-order expectation. The baseline must make the
  direction legible **without motion** — an axis label, a visible "now" marker, or an
  initial scroll affordance.

## Consequences

- Most of the site can never use the motion library, which means most contributors will
  write CSS animations. [../../design/motion.md](../../design/motion.md) and
  [../../design/tokens.md](../../design/tokens.md) must make that pleasant, or the policy
  generates pressure to break itself.
- A designer asking "can we animate this?" gets a different answer depending on tier, and
  the tier is not always obvious. The tie-break: if it responds to a pointer it is L3; if
  it responds to the section entering the viewport it is L2; if it is a designed sequence
  someone would describe as "the animation," it is L1 and needs a route budget.
- The two-L1 cap will eventually be tested by a genuinely good idea for a third. That is
  what the "own ADR" requirement is for — it is a speed bump, not a wall.
- Deferring the signature technique means the hero cannot be built until that proposal
  lands. The static fallback shipping first is what keeps the site launchable in the
  meantime.

## Alternatives considered

**One library, globally available.** Far more convenient, and the industry default.
Rejected: it makes every route pay for the two routes that need it, and on this stack the
baseline is already the heavier one.

**No library at all, CSS everywhere including L1.** Attractive, and genuinely achievable
for L2 and L3. Rejected for L1: scroll-linked pinning with a synchronised timeline is
where hand-rolled solutions become large, fragile and worse than the library.

**Framer Motion / Motion One instead of GSAP.** Better React ergonomics for interface
motion. Rejected because interface motion in this project is CSS-only by policy, so a
React-oriented animation library would be paying its cost in exactly the tier where it is
not allowed to be used — and GSAP's ScrollTrigger is the specific tool the two L1
sequences need.

**Lenis for smooth scrolling.** Rejected above: two scroll systems, no gain.
