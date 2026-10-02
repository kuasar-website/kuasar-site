## Context

See `proposal.md`, `docs/task-assignments.html`, ADR 0001, ADR 0003,
`design/i18n.md`, `design/motion.md` and `design/tokens.md`. The owner handoffs are
documented in the component READMEs and integration notes for hero, timeline, missions
and events.

## Goals / Non-Goals

**Goals:** publish `/en` and `/tr` from one small Server Component; preserve every owner
component and its data contract; make the all-zero launch state a complete hero-only
page; keep collection states and the strict home budget measurable.

**Non-goals:** changing section markup or CSS; adding home variants for Schedule or
Galactic Summit; adding content, a CMS schema, a sitemap policy, an animation, or the
later `hero-signature` enhancement.

## Decisions

### D1. The route is an assembly-only Server Component

`app/[locale]/page.tsx` awaits the Next.js 16 promise-valued `params`, validates the
locale defensively, and renders the four existing handoffs in this order:

1. `HomeHero`
2. `TimelineSection`
3. `MissionArchiveSection`
4. `EventsSection`

The order moves from identity and action, through a horizontally dense history passage,
to the quieter vertical mission archive and then current community events. No handoff is
copied or adapted in the page. The installed Next.js 16.3.1 `page` and Server Component
documentation confirms that the page and its async children remain server-rendered and
do not add a client module graph.

### D2. Existing section boundaries own their internal layout

Mission and event handoffs already own token-based section padding. The Timeline handoff
deliberately exposes an unpadded section, so the composition gives only that handoff a
centred wrapper with `--space-section` on mobile and `--space-section-lg` at the desktop
breakpoint. `empty:hidden` prevents an empty timeline wrapper from creating launch-state
space. This keeps spacing policy in the owned page without editing another developer's
CSS.

### D3. The hero consumes the approved action contracts

`HomeHero` receives `FORM_LINKS.connect`; the URL is not copied. Its existing secondary
Connect action and localized primary Join action remain unchanged, so there is one
primary CTA in the default viewport. Collection links are text navigation, not competing
primary actions.

### D4. Static discovery metadata belongs to the home page

The page emits a self-canonical path for its locale plus `en`, `tr`, and English
`x-default` alternates. The root layout supplies the site identity metadata. The route
does not read search parameters or any request-time API.

### D5. Verification composes existing evidence

The change adds a focused source-contract test and builds the real home routes. Existing
owner suites already cover their collections at zero, one and many (including fifty)
and their production-route fixtures now exercise those handoffs through the new home
route as well. Tier A provides typecheck, lint, CSS checks, locale parity and the
authoritative 160 KB first-load budget. Browser accessibility and Lighthouse remain the
separate `verification-browser-gates` task; a human bilingual phone/desktop review is
still recorded for this route.

## Motion and bundle impact

No motion tier is introduced. The page is the permanent unanimated baseline for the
future L1 home hero, and it adds no `use client` boundary or animation import. The four
handoffs are Server Components apart from their already-reviewed small shared islands.
The actual `/[locale]` build must pass 160 KB first-load JS and the existing 45 KB
deferred-animation allowance must remain unused by this baseline.

## CMS impact

No Strapi field is added or changed. `EventsSection` consumes the existing published
event contract and hides itself when unconfigured or empty. Production still requires
the already-documented `STRAPI_URL`; this change introduces no request-path fetch.
