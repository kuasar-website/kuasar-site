## Purpose

Defines the bilingual KUASAR home page as a static composition of the section owners'
existing handoffs.

## ADDED Requirements

### Requirement: Both locale homes are statically published
The site SHALL publish the home page at `/en` and `/tr` inside the matching localized
shell. Each route MUST emit a self-referential canonical, English and Turkish `hreflang`
alternates, and English `x-default`. No request-time API SHALL be used.

#### Scenario: English home is opened
- **WHEN** a visitor opens `/en`
- **THEN** the English shell and home composition render with `/en` as canonical

#### Scenario: Turkish home is opened
- **WHEN** a visitor opens `/tr`
- **THEN** the Turkish shell and home composition render with `/tr` as canonical

### Requirement: Home composes owner-supplied sections without rewriting them
The home SHALL render `HomeHero`, the native baseline `TimelineSection` with its localized
view-more link, `MissionArchiveSection`, and `EventsSection` in that order. The home MUST
NOT copy their data access, presentation, or content into the route file. It MUST NOT add
Schedule or Galactic Summit sections until their owners provide explicit home handoffs.

#### Scenario: Every collection is populated
- **WHEN** timeline, mission and event records exist
- **THEN** the matching owner components appear after the hero and every record remains
  data-driven

#### Scenario: Timeline is populated
- **WHEN** timeline entries exist in either locale
- **THEN** the home shows the native non-scroll-linked baseline with the matching
  `/en/timeline` or `/tr/zaman-cizelgesi` view-more link

### Requirement: Collection cardinality never breaks the home
Each composed collection SHALL remain usable with zero, one and many records. An empty
collection MUST omit its complete home section without an empty heading, frame or spacing
block. The all-zero launch state SHALL remain a complete hero-only page in both locales.

#### Scenario: Every collection is empty
- **WHEN** no timeline, mission or event record is published
- **THEN** `/en` and `/tr` render the hero and no empty collection shell

#### Scenario: A collection has one record
- **WHEN** any composed collection contains one valid record
- **THEN** its owner component renders that record without requiring a layout edit

#### Scenario: A collection has many records
- **WHEN** any composed collection contains fifty valid records
- **THEN** every record remains available through its owner component and the home still
  passes its route budget

### Requirement: Section rhythm uses the shared spacing tokens
The composition SHALL use `--space-section` for mobile section rhythm and
`--space-section-lg` at the desktop breakpoint. It MAY use
`--space-section-tight` only inside an owner component where two passages form one
thought. Empty sections MUST NOT reserve this spacing.

#### Scenario: Timeline appears at mobile and desktop widths
- **WHEN** the native timeline section is present
- **THEN** its composition wrapper uses the mobile section token below the large
  breakpoint and the desktop section token at and above it

#### Scenario: Timeline is absent
- **WHEN** no timeline entries exist
- **THEN** its empty wrapper creates no visible vertical gap

### Requirement: Hero actions serve both audiences without competing primaries
The hero SHALL use the verified club Connect Us Google Form for sponsors and the
localized Join route for prospective members. The Join action SHALL be the only primary
CTA in the default viewport; Connect SHALL remain secondary. No form SHALL be embedded.

#### Scenario: Sponsor opens either locale home
- **WHEN** the sponsor reads the hero
- **THEN** the localized secondary Connect action targets the verified HTTPS club form

#### Scenario: Prospective member opens either locale home
- **WHEN** the prospective member reads the hero
- **THEN** the localized primary Join action targets that locale's Join page

### Requirement: The static baseline stays within the strict home budget
The `/[locale]` home SHALL remain at or below 160 KB of gzipped first-load JavaScript.
This baseline MUST add no client boundary or animation-library import, and MUST remain
fully readable with JavaScript disabled and reduced motion requested.

#### Scenario: Production bundles are measured
- **WHEN** Tier A measures the built `/en` and `/tr` routes with all sections present
- **THEN** each route passes the 160 KB home budget and the baseline adds no deferred
  animation chunk

#### Scenario: JavaScript or motion is unavailable
- **WHEN** JavaScript is disabled or reduced motion is requested
- **THEN** the server-rendered hero and available collection content remain readable and
  navigable without an enhancement
