# 0004 — CI gates that make the budgets enforceable

- **Status:** Accepted
- **Date:** 2026-08-15
- **Related:** [0001-stack.md](0001-stack.md), [0003-motion-stack.md](0003-motion-stack.md),
  [../../design/motion.md](../../design/motion.md),
  [../../.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)

## Context

Every budget in [0003-motion-stack.md](0003-motion-stack.md) is a wish until something
measures it. A tiered animation policy that depends on five rotating contributors
remembering a rule will be violated within two semesters, and the violation will be
invisible — nothing breaks, the site just gets slower.

The binding constraint is CI minutes. This repository is **private**, so GitHub Actions
provides 2,000 free minutes per month rather than the unlimited allowance public
repositories get. A full browser matrix on every push does not fit that during an active
build period, and the failure mode is the worst available: CI stops for everyone, mid-month,
with no warning that scales with usage.

So the gates are tiered by cost, and the tiering is deliberate rather than incidental.

## Decision

### Tier A — every push. Fast, no browser.

Target: **under two minutes**. These run on every push to every branch and are required
for merge.

| Gate | What it asserts |
| --- | --- |
| Typecheck | `tsc --noEmit` across the workspace |
| Lint | ESLint, including the import-graph rule below |
| **Import-graph rule** | `gsap`, `@gsap/react` and GSAP plugins are imported **only** from designated L1 route segments, and only via dynamic import |
| **First-load JS budget** | Per-route first-load JS against `apps/web/budgets.json` |
| **Static motion checks** | The four rules below |
| **Locale parity** | Every git content directory has both locale files **and** a slug in each |

**The import-graph rule is the load-bearing one.** As
[0003-motion-stack.md](0003-motion-stack.md) explains, the animation library is
dynamically imported and therefore never appears in first-load JavaScript — so a weight
budget alone would pass a route that statically imported GSAP into the shared chunk. The
import rule catches that at zero bytes and zero CI seconds. Implement it as ESLint
`no-restricted-imports` with path zones rather than as a bespoke script, so it reports in
the editor as well as in CI.

**Static motion checks**, all four of which fail silently in production if violated:

1. **Every animation has a reduced-motion path.** A stylesheet declaring `animation:` or
   `transition:` must contain a `@media (prefers-reduced-motion: reduce)` block; GSAP code
   must go through `gsap.matchMedia()` with a reduced-motion branch.
2. **GSAP contexts and ScrollTriggers are cleaned up on unmount.** Any file importing GSAP
   must use `useGSAP`, or pair `gsap.context(` with `.revert()`. A leaked ScrollTrigger
   does not throw — it just degrades the site as the user navigates.
3. **No animation of layout properties where transform or opacity would do.** Stylelint
   with a property allowlist for `transition-property` and `@keyframes`.
4. **Durations reference tokens rather than literals.** No raw time values in
   `transition` / `animation-duration`; they must resolve to `var(--duration-*)` from
   [../../design/tokens.md](../../design/tokens.md). This one is only checkable because
   [0001-stack.md](0001-stack.md) chose Tailwind v4, where `@theme` emits real CSS custom
   properties that hand-written CSS can reference.

**Locale parity** asserts both `en.mdx` and `tr.mdx` exist in every git content directory
**and** that each declares a slug in frontmatter. Because
[../../design/i18n.md](../../design/i18n.md) uses fully localized URL segments, a missing
Turkish slug is a broken route, not a missing translation — a weaker check would pass it.

### Tier B — pull requests to `main`. Browser-based, path-filtered.

Target: **under ten minutes**. These run only on PRs targeting `main`, and only when paths
that could affect them changed. A documentation-only PR skips the entire browser matrix.

| Gate | Scope |
| --- | --- |
| **Lighthouse** | Performance, SEO, best practices, on the home page and one detail page |
| **axe-core** | Accessibility, across all statically generated routes |
| **Motion determinism** | Where an L1 animation exists |

**Lighthouse** runs against a local production build served with `next start`, not against
a Vercel preview URL. This keeps CI hermetic, removes the need for a Vercel token in
Actions, and avoids measuring cold-start noise from a preview deployment.

**axe-core** runs via Playwright across the routes the build actually generated. Accessibility
is non-negotiable given the motion ambitions of this site — a scroll-linked timeline and a
signature hero are exactly the features that break keyboard and screen-reader users when
nobody checks. For dynamic route patterns, one representative instance per pattern is
sufficient; the template is what varies, not the record.

**Motion determinism** is described below, because dropping visual regression changed how
it works.

### Visual regression is dropped

Playwright screenshots per breakpoint were specified in the project brief and are **not
adopted**.

The reason is consistency with a decision already made elsewhere:
[0002-cms.md](0002-cms.md) keeps media out of git because binary assets that churn make a
repository unusable within two seasons. Per-breakpoint screenshot baselines are binaries
that churn on **every intentional design change** — the same failure mode, adopted
deliberately, on a repository whose whole design phase is ahead of it. Git LFS moves the
problem to a 1 GB monthly bandwidth allowance; a hosted service solves it but adds a third
account to the handover for a five-person club.

What is lost: automated detection of unintended layout drift. That is a real loss and is
recorded as such rather than argued away. It is covered partially by Lighthouse and axe
catching structural regressions, and otherwise by human review — which is where the
screen-recording requirement below does most of its work.

### Motion determinism, rewritten as computed-value assertions

The original formulation — pause the global timeline, seek to fixed progress values,
snapshot each — **is** visual regression, so dropping visual regression would have taken it
with it. Instead it asserts computed values rather than pixels:

1. In test builds, the L1 timeline is reachable on `window` behind a test-only flag.
2. Playwright pauses it and seeks to fixed progress values — `0, 0.25, 0.5, 0.75, 1`.
3. At each stop it records **computed values** for the participating elements: transform
   matrix, opacity, and bounding box.
4. The result serialises to JSON and is compared against a committed fixture.

This is strictly better than the pixel version for this repository. The fixture is small
text, it diffs legibly in a pull request, an intentional change produces a readable diff
rather than an opaque image swap, and it does not care about font rendering or GPU
differences between a laptop and a CI runner — the three things that make screenshot
suites flaky enough to be ignored.

It converts motion into a deterministic assertion rather than a judgement call, which was
the original intent.

### Motion *feel* is not automatable, and nothing here pretends otherwise

No gate above tells you whether an animation feels good. Timing, easing, and whether a
sequence reads as intentional or as jitter are human judgements.

**A pull request touching motion attaches a short screen recording. The reviewer watches
it.** This is a required item in
[../../.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md).

**Do not build an agent screenshot loop to substitute for this.** It produces confident
output about a question it cannot answer, and the confidence is worse than the silence.

### What CI cannot see

Stated explicitly so that nobody later mistakes a passing build for full coverage:

- **Part of the analytics weight.** The `@vercel/analytics` and `@vercel/speed-insights`
  wrapper components are in the route bundle and *are* measured. The runtime scripts they
  fetch from `/_vercel/insights/` are not. The "no exemption" rule in
  [0001-stack.md](0001-stack.md) is enforced for most of the weight, not all of it.
- **Real-device performance.** Lighthouse in CI runs on a runner, not a phone on a Turkish
  mobile network. Vercel Speed Insights is the only thing that reports back from reality,
  which is why [0001-stack.md](0001-stack.md) treats it as the falsifier for the whole
  motion policy — and why its 10,000-event Hobby ceiling matters more than it looks.
- **Layout drift**, per the dropped visual-regression gate.
- **Whether the CMS content is correct.** No gate checks that a stated apogee is true.

### Merge control

`ASSUMPTION:` `main` is protected with a required review from the merge checker and
required status checks for Tier A and Tier B. Confirm this is available on the
organisation's current GitHub plan for a private repository before relying on it; if it is
not, the same rules hold by convention and
[../../.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md) becomes
the only enforcement, which should be stated rather than assumed.

## Consequences

**The minute budget works out, with room.** A Tier A run is roughly 2 minutes and a Tier B
run roughly 10. At 30 pull requests a month with a few pushes each, that is on the order of
500–600 minutes against 2,000 — comfortable at normal volume, and tight only during an
intensive build sprint. Path filtering is what preserves that headroom, so removing a path
filter is a budget decision, not a convenience decision.

**Tier B runs only against `main`.** A regression can land on a feature branch and survive
until the PR opens. That is the intended trade; the alternative spends the browser matrix
on every intermediate push.

**The static checks are approximations.** "Every animation has a reduced-motion path"
checks that a reduced-motion block *exists*, not that it is *correct* — a block that
re-declares the same animation passes. This is worth having anyway: it catches the common
case, which is forgetting entirely.

**Dropping visual regression puts more weight on the reviewer.** The screen recording is
not a nice-to-have under this decision; it is the compensating control.

## Alternatives considered

**Full matrix on every push.** Simplest to explain, no gaps, no path-filter configuration
to maintain. Rejected on the minute budget, and because the failure mode is CI stopping for
everyone rather than degrading gracefully.

**Fast gates per PR, heavy gates nightly.** Cheapest and most predictable. Rejected because
a regression would land on `main` and be reported hours later, which makes the budgets
advisory again — the exact condition this ADR exists to end.

**Hosted visual regression (Argos, Chromatic, or similar).** Solves the baseline-storage
problem properly and reviews well in a UI. Rejected for now: a third-party account added to
the handover for a five-person club with annual turnover, in exchange for a gate whose
absence is survivable. Reconsider if layout drift actually becomes a recurring problem —
that is the trigger, and it should be an observed one rather than an anticipated one.

**Git LFS for baselines.** Keeps baselines versioned with the code that produced them.
Rejected on GitHub's 1 GB monthly LFS bandwidth allowance for private repositories, which
per-breakpoint screenshots would consume during an active design phase.
