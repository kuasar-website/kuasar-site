## Context

See `proposal.md` — Why. `site-shell` now supplies the locale layout and navigation, and
`locale-routing` supplies the canonical localized segment map and section metadata helper.
The page task is static copy, but its two terminal actions depend on real Google Forms and
the site-wide interaction primitive. The relevant constraints live in ADR 0001, ADR 0002,
ADR 0004, `design/brand.md`, `design/i18n.md`, and `design/motion.md`.

## Goals / Non-Goals

**Goals:**
- Add the four assigned localized routes without taking ownership of any other section.
- Keep bilingual copy, route pairing, metadata, and form destinations explicit and easy
  for a future maintainer to audit.
- Reuse the shell, locale-routing helpers, tokens, and shared primary action rather than
  creating page-local substitutes.
- Keep both pages server-rendered and statically generated, with no new client boundary.

**Non-Goals:**
- Adding a Contact route, application form, CMS model, submission handler, email address,
  sponsorship PDF, team-member data, or third-party embed.
- Claiming project results, awards, member counts, application dates, or other facts that
  the repository does not establish.
- Changing the shell navigation, locale map, root layout, global tokens, or interaction
  primitive implementation.

## Decisions

### Four literal route folders keep ownership local

The capability will use four thin route entries below
`app/[locale]/(about-and-join)/`: `about`, `hakkimizda`, `join`, and `bize-katil`. Each
entry validates that its literal segment is paired with the expected locale and otherwise
returns not-found behavior. Shared page components prevent copy/layout duplication.

A single `[section]` dispatcher was rejected. Although it would reduce the number of route
files, it would claim the same dynamic URL position needed by every later section and turn
this capability into a routing owner for pages it does not own. Rewrites were also
rejected because localized segments already have a canonical source and `next.config.ts`
belongs to another file zone.

### Static copy lives in one typed bilingual module

Headings, short body copy, sub-team descriptions, accessible link labels, and external-link
notices will live together under `components/about-and-join/**`. The four route files pass
only a validated locale and page kind. This is static editorial/interface copy, not a
repeatable content entity, so introducing Strapi or a git content schema would create an
unnecessary editing path and conflict with the assignment.

The sub-team text will describe responsibilities only. It will not invent historical
achievements or individual ownership. Turkish and English are authored separately and
reviewed as first-class copy per `design/i18n.md`.

### Verified form URLs are committed as non-secret configuration

The Join Us and Connect Us URLs supplied by the team are kept in a small named constants
module. They are public navigation targets, not secrets, and do not belong in environment
variables. Construction validates HTTPS and a Google Forms host so a placeholder or
unrelated destination fails before review.

### Pages reuse the shared primary action

Both form links use the `ActionLink` primary variant merged through PR #15. Creating a
local orange link would be a forbidden fourth interaction style.
External links open in a new tab with `rel="noopener"` and include visible plus accessible
external-destination wording.

Motion tier: this change introduces no animation. The shared action's existing L3 CSS
interaction and reduced-motion path are consumed unchanged on all four routes. No import
from an animation library is reachable.

### Metadata is static and derives alternates from the locale map

Each thin route exports localized title and description metadata while deriving canonical,
English, Turkish, and `x-default` alternates through the existing `sectionAlternates()`
helper for `about` or `join`. This keeps discovery URLs aligned with the switcher's route
contract without duplicating an alternate map.

### The change adds no route JavaScript

All new components remain Server Components. The pages add HTML and CSS only; their
per-route first-load JavaScript impact is expected to be 0 KB beyond the inherited shell
bundle and will be measured in the production build. No new runtime dependency is added.

### CMS fields and locale specificity

No Strapi field is added or read. The copy is static and locale-specific in the web
workspace; form submissions remain entirely in the club-owned Google Workspace.

## Risks / Trade-offs

- **Public form destinations can be replaced outside the repository** → keep the two
  supplied URLs centralized and verify both resolve before requesting review.
- **Literal route folders repeat the localized segment strings in the filesystem** → keep
  page metadata and navigation derived from the canonical map, validate locale/segment
  pairing, and add route tests so a future map change cannot silently leave stale pages.
- **Static responsibility copy can become organizationally stale** → keep it short,
  role-based, and require a club-owner copy review before requesting PR review.

## Migration Plan

Add the shared copy/components first, then the four thin routes, metadata, and styles.
Verify all four generated routes and the four wrong-locale combinations before pushing.
Reverting the change removes only its route group, components, and OpenSpec artifacts; it
does not migrate data or alter shared routing.

## Open Questions

None. The team supplied both final Google Form destinations before implementation.
