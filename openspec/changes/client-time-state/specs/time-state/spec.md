## Purpose

Keep shared event and archive dates truthful as browser time passes, without rebuilding static pages, in Turkish and English.

## ADDED Requirements

### Requirement: Neutral server and hydration baseline
The system SHALL ship raw ISO dates and the full dataset without reading the server clock. Server HTML and initial hydration SHALL contain no time-relative text, state attributes or state styling in either locale.

#### Scenario: JavaScript disabled
- **WHEN** a visitor opens either locale without JavaScript
- **THEN** every date and collection entry remains visible in neutral form, without past/live/upcoming markers, including hidden attributes

#### Scenario: Old build hydrated
- **WHEN** HTML generated in August is opened in December in either locale
- **THEN** hydration matches the neutral HTML and subsequent state reflects the December browser clock without rebuilding or revalidation

### Requirement: Browser state boundaries
After mount the system SHALL classify valid intervals as upcoming before start, live from start inclusive to end exclusive, and past at end. Datetimes SHALL include an explicit offset; date-only values SHALL represent UTC calendar days. A missing end on a datetime SHALL mean an instant, becoming past at start; a date-only record SHALL remain live through its UTC day. Invalid, missing or reversed dates SHALL stay neutral.

#### Scenario: Boundaries pass while open
- **WHEN** the browser clock passes start and end in either locale
- **THEN** status updates within one second while active and refreshes on focus or visibility restoration

#### Scenario: Malformed or missing input
- **WHEN** a date is absent, invalid, has an ambiguous timezone or its end precedes start
- **THEN** it makes no temporal claim and does not crash rendering in either locale

### Requirement: Localized dates with semantic styling
The system SHALL format the same raw date for tr and en using an explicit timezone, defaulting to UTC. Status styling SHALL apply only after mount using existing design state tokens. There SHALL be no animation.

#### Scenario: Locale and timezone differ
- **WHEN** the same instant appears in Turkish and English on devices in different timezones
- **THEN** labels use the requested language and explicit display timezone while the raw datetime remains unchanged

### Requirement: Client-derived collection views
The system SHALL preserve every entry and source order until hydration, then allow filtering by status and sorting by start date without mutating source data. Invalid dates SHALL sort last; equal dates SHALL preserve source order.

#### Scenario: Empty and single collections
- **WHEN** either locale receives zero or one entries
- **THEN** the neutral collection retains that count and client filters return zero or one matching entries without errors

#### Scenario: Many entries and changing time
- **WHEN** either locale receives fifty entries and time advances
- **THEN** filtering and chronological ordering reflect the current browser clock over all shipped entries, without a new server request

### Requirement: Browser verification
Controlled-clock browser tests SHALL exercise both locales, neutral no-JavaScript HTML, hydration and time passage. A focused Tier B PR check SHALL run them on relevant code and tooling changes.

#### Scenario: Temporal regression
- **WHEN** a change freezes status at build time or fails to update at a time boundary
- **THEN** the browser check fails
