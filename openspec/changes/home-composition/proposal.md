## Why

The localized shell and every home-ready section are now merged, but `/en` and `/tr`
still have no page. The public deployment therefore sends both audiences to a 404 even
though the sponsor, prospective-member, timeline, mission and event journeys already
exist.

## What Changes

- Add the bilingual localized home route at `app/[locale]/page.tsx`.
- Compose the existing `HomeHero`, native `TimelineSection`,
  `MissionArchiveSection`, and `EventsSection` handoffs without rewriting their
  presentation or data access.
- Supply the hero's sponsor action from the verified `FORM_LINKS.connect` contract and
  keep its localized Join action as the only primary CTA in the default viewport.
- Add localized canonical and `hreflang` metadata for `/en` and `/tr`.
- Keep the home static, server-rendered and within its 160 KB first-load JavaScript
  budget, including zero, one and many collection states.

## Capabilities

### New Capabilities

- `home-composition`: The bilingual landing page that assembles the permanent static
  hero and every owner-supplied home section with the required section rhythm, empty
  states and route budget.

### Modified Capabilities

None. The hero, timeline, missions, events, locale routing, site shell and interaction
contracts are consumed unchanged.

## Impact

- Serves sponsors and prospective members equally: the hero gives each audience its
  established route, while the remaining sections provide credibility.
- Writes production code only in Dev 2's assigned `apps/web/app/[locale]/page.tsx`, plus
  this change's OpenSpec artifacts and focused verification.
- Adds no content entity. Missions and timeline remain entirely in git; events remain
  entirely in Strapi. No entity is split across storage systems.
- Adds no CMS field, request-time fetch, runtime dependency, client boundary, animation,
  analytics, embed, sitemap change or change to another owner's component.
- `Schedule` and `Galactic Summit` remain dedicated routes: both owner proposals
  explicitly exclude home sections, so this change does not invent them.
