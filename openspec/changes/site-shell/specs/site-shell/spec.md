## Purpose

Defines the bilingual, accessible page frame shared by every locale-prefixed route,
including its navigation, wordmark, language switcher, footer, and keyboard order.

## ADDED Requirements

### Requirement: The shell is generated only for supported locales
The locale layout SHALL statically enumerate exactly `en` and `tr` from the shared
locale-routing source and SHALL reject any other locale parameter. Content rendered by
the shell MUST inherit the matching language.

#### Scenario: Supported locales are generated
- **WHEN** the locale layout generates its static parameters
- **THEN** it returns exactly `{ locale: "en" }` and `{ locale: "tr" }`, sourced from
  the shared `LOCALES` export

#### Scenario: An unsupported locale is requested
- **WHEN** a request reaches the locale layout with a locale other than `en` or `tr`
- **THEN** the dynamic segment does not render a locale shell for that value

### Requirement: Every locale page has an accessible landmark frame
The shell SHALL render one skip link followed by a semantic header, primary navigation,
main landmark, and footer. Keyboard focus MUST be visible and MUST follow the same order
as the visible reading order in both locales.

#### Scenario: A keyboard visitor enters a page
- **WHEN** a visitor presses Tab from the start of a locale page
- **THEN** the first focusable control is a visible skip link that moves focus to the
  page's main content

#### Scenario: Assistive technology reads the page frame
- **WHEN** a generated English or Turkish page is inspected
- **THEN** it exposes a banner, a labelled primary navigation, exactly one main landmark,
  and a content-information footer in reading order

### Requirement: Navigation is bilingual, legible, and route-safe
The shell SHALL render navigation labels in Inter at 14–16 px in both locales. Each
label MUST remain whole without wrapping or truncation at every supported width. Every
navigation target MUST be locale-prefixed and derived from the shared segment map.
Timeline and unresolved Projects MUST NOT appear in the primary navigation.

#### Scenario: English navigation is rendered
- **WHEN** the shell renders for `en`
- **THEN** every label uses Inter, every href begins with `/en/`, and neither Timeline
  nor Projects is present

#### Scenario: Turkish navigation is rendered at a narrow width
- **WHEN** the shell renders for `tr` at a narrow viewport
- **THEN** each Turkish label remains fully visible on one line, every href begins with
  `/tr/`, and the typeface remains Inter

### Requirement: The wordmark preserves its artwork and clear space
The shell SHALL provide a reusable KUASAR wordmark component whose path geometry matches
the committed artwork and whose every path colour is `currentColor`. The rendered mark
MUST be at least 120 px wide, MUST receive clear space on all four sides equal to
approximately 0.28 times that width, and MUST remain visible on `--color-canvas` without
a literal black fill, accent colour, distortion, outline, or shadow.

#### Scenario: Wordmark renders on the site canvas
- **WHEN** the header or footer renders the wordmark on `--color-canvas`
- **THEN** the mark inherits `--color-ink`, remains at least 120 px wide, and no path
  contains a hard-coded colour

#### Scenario: Wordmark clear space is inspected
- **WHEN** the wordmark is rendered at its 120 px minimum width
- **THEN** layout reserves approximately 34 px of uninterrupted space above, below,
  left, and right

### Requirement: The language switcher is visible and preserves equivalents
The shell SHALL display the text `TR / EN` on every locale page and SHALL NOT use flags.
The inactive locale MUST be a link to the equivalent target-locale route. Home and
section routes MUST resolve through the locale-routing contract; entity detail routes
MUST use the target locale's discovery metadata rather than guessing a slug.

#### Scenario: Switch language from a section index
- **WHEN** a visitor on `/en/missions` selects `TR`
- **THEN** the switcher navigates to `/tr/gorevler`, not `/tr/`

#### Scenario: Switch language from an entity detail page
- **WHEN** a detail page exposes a Turkish `hreflang` alternate and the visitor selects
  `TR`
- **THEN** the switcher navigates to that exact alternate URL

#### Scenario: No equivalent detail page exists
- **WHEN** no target-locale alternate exists for the current detail page
- **THEN** the switcher links to the target locale's home with an unavailable-content
  notice contract, never to a guessed path or a 404

### Requirement: The footer is shared and content-neutral
The shell SHALL render a localized footer without inventing CMS entities, contact
details, form destinations, or route-specific content. Any internal footer link MUST be
locale-prefixed.

#### Scenario: Footer renders before downstream content exists
- **WHEN** the shell is used by a newly generated locale route
- **THEN** the page receives localized KUASAR identity and home navigation without a CMS
  request or fabricated organization data

### Requirement: The shell adds no animation or animation dependency
The shell SHALL remain static: it MUST NOT animate entrance, navigation, wordmark, focus,
or locale-switching states, and it MUST NOT make an animation library reachable from a
route bundle.

#### Scenario: Reduced-motion verification runs
- **WHEN** the shell styles are checked by the reduced-motion gate
- **THEN** the check passes without a reduced-motion exception because the shell defines
  no animation or transition
