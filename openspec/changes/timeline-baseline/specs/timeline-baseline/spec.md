## Purpose

Present KUASAR's git-backed history as an accessible bilingual timeline that remains complete without JavaScript or animation.

## ADDED Requirements

### Requirement: Native accessible history
The timeline SHALL show entries in descending date order, moving rightward from present to past, with a visible localized now marker and direction label. Scrolling SHALL work without JavaScript, with keyboard access and native touch gestures.

#### Scenario: Many entries without JavaScript
- **WHEN** either locale has fifty entries and JavaScript is disabled
- **THEN** all entries remain readable in newest-to-oldest order, the horizontal region is keyboard focusable, and links can be reached without trapping focus

#### Scenario: Single entry
- **WHEN** either locale has one entry
- **THEN** the entry, now marker and direction label remain visible without a grid or minimum entry count

#### Scenario: Mobile
- **WHEN** the viewport is narrower than 48rem in either locale
- **THEN** native horizontal swiping is available, text wraps inside each entry and the page itself does not overflow horizontally

#### Scenario: Reduced motion
- **WHEN** reduced motion is enabled in either locale
- **THEN** all content is visible with no animation, smooth scrolling, pinning or mandatory scroll snapping

### Requirement: Neutral dates and optional imagery
The baseline SHALL ship raw ISO dates in semantic time elements, without computing now, filtering relative to today or applying past/live/upcoming status on the server. Images SHALL be optional. No time-dependent JavaScript SHALL be required to read or navigate history.

#### Scenario: Server output
- **WHEN** either locale is rendered at any wall-clock time
- **THEN** the same supplied entries and raw ISO dates appear without time-relative state or colours

#### Scenario: No image
- **WHEN** an entry has no image in either locale
- **THEN** its title, date and caption remain complete without a broken image or reserved blank frame

### Requirement: Bilingual git content
Timeline entries SHALL remain git-backed data; adding a record SHALL require no component or layout edit. Both locales SHALL use localized controls and readable Turkish glyphs. Incomplete translations SHALL expose a visible notice linking to the available version.

#### Scenario: Incomplete translation
- **WHEN** the git content adapter supplies an incomplete translation in either locale
- **THEN** the timeline displays the appropriate translation notice and a link to the available version

### Requirement: Section and route integration
The home timeline section SHALL offer a localized link to `/en/timeline` or `/tr/zaman-cizelgesi` only when entries exist. The timeline SHALL remain absent from the navbar. Empty collections SHALL hide the section and its link and make the timeline route unavailable.

#### Scenario: Empty collection
- **WHEN** there are zero entries in either locale
- **THEN** no timeline section or view-more link appears and the timeline route returns the localized not-found response

#### Scenario: Nonempty collection
- **WHEN** either locale has one or more entries
- **THEN** the home section links to its matching timeline route, which presents the full history with correct localized canonical and alternate links
