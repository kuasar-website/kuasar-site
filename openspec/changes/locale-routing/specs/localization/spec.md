## Purpose

Establishes path-prefixed, fully localized bilingual routing for the site: the
locale segment map, the fixed redirect from `/`, and the language switcher that
lets a visitor move between locales without losing their place or hitting a 404.

## ADDED Requirements

### Requirement: Locale prefix and default locale
The system SHALL serve every page under a locale prefix of exactly `en` or `tr`,
matching the codes in `design/i18n.md` character for character, with `en` as the
default locale.

#### Scenario: Request under the English prefix
- **WHEN** a visitor requests `/en/missions`
- **THEN** the system serves the English page at that path

#### Scenario: Request under the Turkish prefix
- **WHEN** a visitor requests `/tr/gorevler`
- **THEN** the system serves the Turkish page at that path

### Requirement: Fixed temporary redirect from the bare root
The system SHALL issue a `307 Temporary Redirect` from `/` to `/en/`. It SHALL
NOT issue a `301` or `308` redirect, and SHALL NOT inspect the
`Accept-Language` header to choose a locale.

#### Scenario: Visiting the bare domain
- **WHEN** a visitor requests `/`
- **THEN** the system responds with a `307` status and a `Location` header of
  `/en/`

#### Scenario: The redirect never hardens into a permanent one
- **WHEN** the same visitor requests `/` again on a later visit
- **THEN** the system still issues a fresh `307`, never a cached permanent
  redirect

#### Scenario: No internal navigation targets the bare root
- **WHEN** any in-app link or navigation element is rendered
- **THEN** its target is a locale-prefixed path (for example `/en/` or
  `/tr/gorevler`), never the bare `/` — the redirect exists only for traffic
  arriving at the bare root from outside the site

### Requirement: Segment map is the single source of truth
The system SHALL derive every localized URL segment, for both the language
switcher and the sitemap, from one segment-map data source matching the table
in `design/i18n.md`, and SHALL express Turkish segments as ASCII
transliterations rather than percent-encoded Unicode. An entry with no backing
entity SHALL be marked unresolved in the segment-map data and SHALL be
excluded from both the language switcher and the sitemap until it is
resolved. A section being resolved (a real entity and real localized
segments exist) is a different condition from that section having a
*published route* — see "Sitemap and robots cover both locales" below.

#### Scenario: One definition serves both consumers
- **WHEN** a section's localized segment is defined once in the segment map
- **THEN** both the language switcher and `sitemap.ts` resolve that section to
  the same localized path, with no second hard-coded copy of the mapping
  anywhere in the codebase

#### Scenario: Turkish segments stay ASCII
- **WHEN** a Turkish route segment is generated from the segment map
- **THEN** it contains no non-ASCII characters (for example `gorevler`, never
  `görevler`)

#### Scenario: An unresolved entry is excluded from generated output
- **WHEN** a segment-map entry is marked unresolved (for example
  `projects`/`projeler`, which has no backing entity in
  `design/content-model.md`)
- **THEN** neither the language switcher nor `sitemap.ts` produces a link or
  sitemap entry for that section, and the entry remains present in the
  segment-map data as a recorded open question rather than being deleted

### Requirement: Language switcher preserves the current route
The system SHALL show a language switcher labeled "TR / EN" — never flags — on
every page in both locales. Selecting it SHALL navigate to the equivalent page
in the other locale, in either direction, rather than to that locale's home
page, except where one of the documented failure-mode requirements below
applies. This capability defines and supplies the route-resolution behavior
the switcher relies on — the segment map, per-locale path resolution, and the
per-entity slug-or-absence contract; the switcher's visible markup and
component implementation belong to Dev 2 / INCO's shared shell, not to this
capability.

#### Scenario: Switching from English to Turkish on a section page
- **WHEN** a visitor on `/en/missions` selects the Turkish switcher
- **THEN** they land on `/tr/gorevler`, not on `/tr/`

#### Scenario: Switching from Turkish to English on a section page
- **WHEN** a visitor on `/tr/gorevler` selects the English switcher
- **THEN** they land on `/en/missions`, not on `/en/`

#### Scenario: Switching from English to Turkish on an entity detail page
- **WHEN** a visitor on a mission's English detail page selects the Turkish
  switcher
- **THEN** they land on that same mission's Turkish detail page, resolved
  through the entity's per-locale slug, not on the Turkish home page

#### Scenario: Switching from Turkish to English on an entity detail page
- **WHEN** a visitor on a mission's Turkish detail page selects the English
  switcher
- **THEN** they land on that same mission's English detail page, resolved
  through the entity's per-locale slug, not on the English home page

### Requirement: A missing equivalent page never 404s
When no equivalent content exists for the current page in the target locale at
all — the entity or page was never created there — the system SHALL navigate
to that locale's home page and visibly state that the equivalent page is not
available, rather than returning a 404.

#### Scenario: No equivalent page exists in the target locale
- **WHEN** a visitor selects the language switcher on a page whose equivalent
  does not exist in the target locale
- **THEN** the system navigates to the target locale's home page and displays a
  notice that the equivalent page is not available in that locale, instead of
  returning a 404

### Requirement: A missing target-locale slug falls back to the default locale
For CMS-backed content where the entity has content in the target locale but no
slug has been recorded for it there, the system SHALL link to that same
entity's page addressed by the default locale's slug, rather than treating it
as a missing equivalent page. This SHALL NOT apply to git-resident content,
where CI guarantees both locales always declare a slug.

#### Scenario: CMS entity missing a target-locale slug
- **WHEN** a visitor on an announcement's English page selects the Turkish
  switcher, and that announcement has Turkish content but no Turkish slug
  recorded
- **THEN** the system links to that same announcement's page under `/tr/`,
  addressed by the announcement's default-locale (English) slug, rather than
  navigating to the Turkish home page

#### Scenario: Git content never exercises this path
- **WHEN** a visitor switches locale on a mission or timeline entry page
- **THEN** a missing slug never occurs, because CI blocks any git content
  directory that lacks a slug in either locale

### Requirement: Discovery metadata for both locales
The system SHALL emit, on every page in both locales, `hreflang` alternate
links for both locales plus an `x-default` alternate pointing at the `/en/`
version, and a self-referential `canonical` link pointing at that page's own
locale — never at the other locale's URL.

#### Scenario: hreflang and canonical on the English page
- **WHEN** the page at `/en/missions` is rendered
- **THEN** its markup includes `hreflang` alternates for `/en/missions` and
  `/tr/gorevler`, an `x-default` alternate pointing at `/en/missions`, and a
  canonical link pointing at `/en/missions` itself

#### Scenario: hreflang and canonical on the Turkish page
- **WHEN** the page at `/tr/gorevler` is rendered
- **THEN** its markup includes `hreflang` alternates for `/en/missions` and
  `/tr/gorevler`, an `x-default` alternate still pointing at `/en/missions`
  (not at the Turkish URL), and a canonical link pointing at `/tr/gorevler`
  itself (not at the English URL)

### Requirement: Sitemap and robots cover both locales
The system SHALL emit a sitemap listing every **published** route in both
locales with `alternates.languages`, and a `robots.txt` that references the
sitemap and does not disallow either locale prefix. A segment-map entry
being resolved is necessary but not sufficient for sitemap inclusion — a
resolved section with no built, reachable page SHALL NOT appear in the
sitemap, even though it may already be resolved in the segment map. The
preview route's `noindex` requirement (`design/i18n.md`; `docs/adr/0002-cms.md`)
is out of scope for this capability — the preview route does not exist until
a later capability ships — and is deferred rather than omitted silently.

#### Scenario: Sitemap entry for a published route
- **WHEN** a resolved section also has a published route in both locales
- **THEN** the sitemap includes an entry for it with both its `/en/…` and
  `/tr/…` URLs under `alternates.languages`

#### Scenario: A resolved section with no published route produces no sitemap entry
- **WHEN** a segment-map entry is resolved but no route has been published
  for it yet
- **THEN** the sitemap contains no entry for it — being resolved in the
  segment map is not the same as being live

#### Scenario: The sitemap may legitimately be empty
- **WHEN** no section anywhere has a published route yet
- **THEN** the sitemap contains zero entries rather than listing sections
  that would 404 — an empty sitemap is a valid, expected state during
  incremental rollout, not a defect

#### Scenario: robots.txt permits both locale prefixes
- **WHEN** `robots.txt` is requested
- **THEN** it does not disallow crawling of `/en/` or `/tr/`
