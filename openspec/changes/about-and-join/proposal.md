## Why

The bilingual shell now exists, but its About and Join navigation targets still have no
pages, so sponsors cannot reach Connect Us and prospective members cannot reach Join Us.
With `site-shell` merged, these two terminal journeys can now be added without taking on
another capability's route or content ownership.

## What Changes

- Add statically generated English and Turkish About pages at `/en/about` and
  `/tr/hakkimizda`, with concise factual copy about KUASAR and a visibly external Connect
  Us link for sponsors.
- Add statically generated English and Turkish Join pages at `/en/join` and
  `/tr/bize-katil`, naming Propulsion, Avionics, Structures, and Software and explaining
  what prospective members would do in each sub-team.
- Link Join Us and Connect Us to the real Google Forms owned by the club account, with
  `rel="noopener"`; never embed the forms or store submissions in this site.
- Add localized titles, descriptions, canonical URLs, and `hreflang` alternates for all
  four routes through the existing locale-routing helpers.
- Verify keyboard access, focus visibility, mobile/long-copy behavior, bilingual wording,
  static generation, and the rule that one primary CTA is visible per viewport by
  default.

## Capabilities

### New Capabilities

- `about-and-join`: The observable bilingual About, Join Us, and Connect Us page
  journeys, including factual sub-team copy, external-form behavior, accessibility, and
  localized discovery metadata.

### Modified Capabilities

None. This change consumes the existing `site-shell`, `localization`, and shared
interaction contracts without changing their requirements.

## Impact

- Serves both audiences without ranking them: sponsors receive the Connect Us path and
  prospective members receive the Join Us path.
- Writes the owned page routes under `apps/web/app/[locale]/(about-and-join)/**`, reusable
  presentation under `apps/web/components/about-and-join/**`, and this OpenSpec change.
- The bilingual page text is static interface/editorial copy committed with the page; it
  is not a content entity in git or Strapi. Form submissions remain wholly inside the
  club-owned Google Workspace, so no entity is split across systems and the website
  stores no submission data.
- Requires the two real club-owned Google Form URLs from Dev 4 before implementation can
  be considered complete. Placeholder, guessed, or member-owned URLs will not be
  committed.
- Adds no CMS field, Strapi request, embed, analytics, animation, runtime dependency, or
  new route outside the four assigned localized paths.
