## Purpose

Defines the bilingual About, Join Us, and Connect Us journeys that let sponsors and
prospective members understand KUASAR and continue to the correct club-owned form.

## ADDED Requirements

### Requirement: About and Join have canonical localized routes
The site SHALL publish the About and Join pages only at `/en/about`,
`/tr/hakkimizda`, `/en/join`, and `/tr/bize-katil`. Each page MUST render inside the
shared shell in the language declared by its locale prefix, and a cross-locale segment
combination MUST NOT render the other language's page.

#### Scenario: English routes render English pages
- **WHEN** a visitor opens `/en/about` or `/en/join`
- **THEN** the matching English page renders inside the English shell

#### Scenario: Turkish routes render Turkish pages
- **WHEN** a visitor opens `/tr/hakkimizda` or `/tr/bize-katil`
- **THEN** the matching Turkish page renders inside the Turkish shell

#### Scenario: A segment is paired with the wrong locale
- **WHEN** a visitor requests an English segment below `tr` or a Turkish segment below
  `en`
- **THEN** the site returns its not-found behavior instead of rendering mismatched copy

### Requirement: About leads sponsors to a factual contact path
The About page SHALL describe KUASAR in concise, factual copy and SHALL expose one primary
Connect Us action to the verified Google Form owned by the club account. The Turkish copy
MUST be written as Turkish rather than published as a machine translation of the English
copy.

#### Scenario: A sponsor reads the English About page
- **WHEN** a sponsor visits `/en/about`
- **THEN** they receive factual English information about the team and a primary Connect
  Us action

#### Scenario: A sponsor reads the Turkish About page
- **WHEN** a sponsor visits `/tr/hakkimizda`
- **THEN** they receive natural Turkish information about the team and a primary
  İletişime Geç action

### Requirement: Join explains all four sub-teams
The Join page SHALL name Propulsion, Avionics, Structures, and Software in both locales
and SHALL state the concrete work a prospective member would do in each sub-team. It MUST
expose one primary Join Us action to the verified Google Form owned by the club account.

#### Scenario: A prospective member compares the sub-teams in English
- **WHEN** a visitor opens `/en/join`
- **THEN** all four sub-teams and their responsibilities are visible before the Join Us
  action

#### Scenario: A prospective member compares the sub-teams in Turkish
- **WHEN** a visitor opens `/tr/bize-katil`
- **THEN** all four sub-teams and naturally written Turkish responsibility descriptions
  are visible before the Bize Katıl action

### Requirement: Form navigation stays external and privacy-minimal
Join Us and Connect Us SHALL be ordinary external links to verified club-owned Google
Forms. Each link MUST be visibly external, MUST use `rel="noopener"`, and MUST NOT embed
the form, load a third-party script, or collect or store a submission in this site.

#### Scenario: A visitor follows a form action
- **WHEN** a visitor activates Join Us or Connect Us
- **THEN** the browser navigates to the matching club-owned Google Form and the page makes
  the external destination clear before activation

#### Scenario: The page is inspected for embedded collection
- **WHEN** either localized About or Join page is inspected
- **THEN** it contains no iframe, form submission control, analytics, pixel, or third-party
  form script

### Requirement: Actions are accessible and do not compete
Each page SHALL show no more than one primary action in the default viewport. The action
MUST retain visible keyboard focus, remain fully readable without horizontal overflow at
narrow mobile widths, and preserve its non-moving reduced-motion behavior through the
shared interaction primitive.

#### Scenario: A keyboard visitor reaches the action
- **WHEN** a visitor tabs through an English or Turkish About or Join page
- **THEN** focus reaches the primary action in reading order and its focus indicator is
  visible

#### Scenario: A visitor uses reduced motion on a narrow screen
- **WHEN** either locale renders at 320 px with reduced motion enabled
- **THEN** the primary action remains fully readable and usable without movement or
  document-level horizontal overflow

### Requirement: Discovery metadata connects locale equivalents
Every About and Join page SHALL expose a self-referential canonical URL, English and
Turkish `hreflang` alternates, and an English `x-default` URL using the canonical localized
segment map.

#### Scenario: About metadata is inspected
- **WHEN** discovery metadata is read on either About locale
- **THEN** its canonical points to that locale's About URL and its alternates point to
  `/en/about` and `/tr/hakkimizda`

#### Scenario: Join metadata is inspected
- **WHEN** discovery metadata is read on either Join locale
- **THEN** its canonical points to that locale's Join URL and its alternates point to
  `/en/join` and `/tr/bize-katil`
