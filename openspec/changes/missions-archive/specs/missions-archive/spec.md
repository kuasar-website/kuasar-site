## Purpose

Defines the bilingual mission archive and detail experience that turns KUASAR's
git-resident flight history into credible, accessible evidence without layout edits.

## ADDED Requirements

### Requirement: Mission routes are static and fully localized
The system SHALL statically generate one archive route at `/en/missions` and
`/tr/gorevler`, plus one detail route per mission using that mission's locale-specific
slug. Unknown section segments and unknown mission slugs MUST NOT generate a page.

#### Scenario: English and Turkish archive routes build
- **WHEN** the site builds with any valid mission collection, including zero entries
- **THEN** both `/en/missions` and `/tr/gorevler` are generated from the same git-backed
  collection

#### Scenario: Localized detail slugs differ
- **WHEN** one mission declares different English and Turkish slugs
- **THEN** its English and Turkish detail pages generate at their respective localized
  paths and render the same locale-independent mission facts

### Requirement: Adding a mission is only a data operation
The archive and detail routes SHALL discover every valid mission from the git-content
loader. Adding or removing a mission MUST NOT require editing a component, layout, route
table, or manually maintained mission registry.

#### Scenario: A valid mission directory is added
- **WHEN** one valid mission directory containing `index.json`, `en.mdx`, and `tr.mdx`
  is added to `content/missions/`
- **THEN** its archive entry and both localized detail routes appear on the next build
  without any code edit

### Requirement: The archive is chronological evidence, not a card grid
The archive SHALL present missions in newest-to-oldest year order and SHALL use each
mission patch as the primary affordance linking to that mission's localized detail page.
The layout MUST remain legible without depending on a fixed-column card grid.

#### Scenario: One mission exists
- **WHEN** the collection contains exactly one mission
- **THEN** that mission is centred as a valid archive state and its patch opens the
  matching localized detail route

#### Scenario: Fifty missions exist
- **WHEN** the collection contains fifty missions
- **THEN** every mission remains reachable in chronological order with readable labels
  and no overlap or horizontal document overflow

#### Scenario: No mission exists in a composed section
- **WHEN** a page asks the archive component to render a section from an empty collection
- **THEN** the section renders nothing, rather than an empty frame or invented placeholder

#### Scenario: No mission exists on the dedicated archive route
- **WHEN** a visitor opens a localized missions archive while the collection is empty
- **THEN** the route remains available inside the site shell and states in that locale
  that no missions have been published yet

### Requirement: Mission facts are rendered honestly
Every archive entry and detail page SHALL render the mission's recorded year, lifecycle
status, type, optional competition, launch date, and apogee consistently in both locales.
A null apogee MUST be shown as not yet confirmed; it MUST NOT be guessed, converted to
zero, or hidden.

#### Scenario: Apogee is confirmed
- **WHEN** `apogeeMetres` contains a number
- **THEN** both locales display that same value in metres with locale-appropriate number
  formatting

#### Scenario: Apogee is unknown
- **WHEN** `apogeeMetres` is null
- **THEN** both locales show an explicit localized “not yet confirmed” value in the
  apogee field

### Requirement: Launch dates are neutral on the server
The system SHALL ship the raw launch date and render a locale-formatted neutral date on
the server. It MUST NOT emit server-side upcoming, live, or past text, attributes, or
styling; any time-relative state SHALL be applied only by the existing browser time-state
contract after hydration. No mission date state SHALL animate.

#### Scenario: JavaScript is unavailable
- **WHEN** a visitor opens a mission route without JavaScript
- **THEN** every launch date remains visible and neutrally styled in the requested locale

#### Scenario: A planned date becomes current after build
- **WHEN** browser time crosses a mission's launch-date boundary after hydration
- **THEN** the existing client-time-state behavior updates the semantic state without a
  rebuild, request-path fetch, cron, or time-based revalidation

### Requirement: Detail pages expose the complete mission record
Each mission detail page SHALL render localized name, summary, objective, technical
summary, and results, together with the shared facts, gallery, external links, and team
names and roles. Empty optional collections MUST be omitted without leaving empty headings
or broken spacing.

#### Scenario: All optional collections are populated
- **WHEN** a mission has gallery images, links, and team roles
- **THEN** the detail page exposes every item in labelled, keyboard-readable sections

#### Scenario: Optional collections are empty
- **WHEN** a mission has no gallery images, links, or team roles
- **THEN** those sections are absent while the remaining mission record stays complete
  and legible

### Requirement: Mission imagery is accessible in both locales
Every meaningful mission patch and gallery image SHALL have a non-empty, human-authored
alternative in both English and Turkish that identifies the specific image content. The
system MUST NOT generate generic alternatives such as “Rocket” or infer descriptions from
file names.

#### Scenario: A mission image renders in English
- **WHEN** an English archive or detail page renders a patch or gallery image
- **THEN** its accessible alternative is the English description authored for that image

#### Scenario: A mission image renders in Turkish
- **WHEN** the equivalent Turkish page renders the same image
- **THEN** its accessible alternative is the independently authored Turkish description
  for that image

### Requirement: Incomplete git translations remain visible and honest
When the selected locale declares `status: incomplete`, the mission page SHALL remain
available at its localized route, SHALL display a localized visible notice, and SHALL link
to the complete equivalent locale. It MUST NOT silently present the incomplete prose as a
complete translation or redirect the visitor away.

#### Scenario: Turkish translation is incomplete
- **WHEN** a mission's `tr.mdx` declares `status: incomplete`
- **THEN** its Turkish detail page renders the available Turkish content with a visible
  Turkish notice and a link to that mission's English detail route

### Requirement: Discovery metadata matches entity equivalents
Every archive and detail page SHALL emit a self-referential canonical, English and Turkish
`hreflang` alternates, and `x-default` pointing at the English equivalent. A detail
alternate MUST use the matching entity's locale-specific slug.

#### Scenario: Turkish mission detail metadata is generated
- **WHEN** a Turkish mission detail page is built
- **THEN** its canonical points to that Turkish route, its English alternate points to the
  same mission's English slug, and `x-default` points to that English route

### Requirement: Mission surfaces stay within non-L1 budgets
Mission routes SHALL introduce no narrative animation and SHALL make no animation library
reachable. Any patch feedback MUST be L3 CSS-only behavior with a non-moving reduced-motion
path and a touch-safe mobile baseline. Every mission route MUST remain within the default
first-load JavaScript budget.

#### Scenario: Reduced motion or touch input is active
- **WHEN** a visitor requests reduced motion or uses a device without fine hover
- **THEN** every patch and archive link remains fully usable without transform movement

#### Scenario: Route bundles are measured
- **WHEN** the production budget checker inspects mission archive and detail routes
- **THEN** each route passes the default first-load budget with zero deferred-animation
  bytes
