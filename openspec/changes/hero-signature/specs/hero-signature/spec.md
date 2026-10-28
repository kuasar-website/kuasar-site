## Purpose

Provide a home-page black-hole-to-quasar signature that enriches the KUASAR identity while preserving accessible, bilingual static content and actions.

## ADDED Requirements

### Requirement: Permanent bilingual hero content
The home hero SHALL preserve the wordmark, subtitle and localized sponsor/member actions throughout enhancement, with one page heading and no decorative screen-reader announcements.

#### Scenario: Both locale homes
- **WHEN** a visitor opens `/en` or `/tr`
- **THEN** the existing heading and localized actions are visible and keyboard accessible before, during and after motion

#### Scenario: JavaScript or enhancement unavailable
- **WHEN** JavaScript is disabled or the enhancement cannot load on either locale
- **THEN** the complete static hero remains visible with functional actions and no required recovery interaction

### Requirement: Bounded home signature
Eligible desktop visitors SHALL see one non-looping rotating black-hole-to-quasar sequence of no more than four seconds on each home mount, without scroll interception or content displacement.

#### Scenario: Desktop narrative
- **WHEN** an eligible desktop visitor sees the home hero in either locale
- **THEN** the dark core and rotating rings resolve into a quasar with opposing jets and settle without replaying on subsequent scrolling

#### Scenario: Other routes
- **WHEN** the visitor opens a non-home route
- **THEN** no hero signature animation or hero animation library is loaded by that route

### Requirement: Static reduced-motion and mobile paths
The hero SHALL provide a genuine non-animated composition below 48rem and whenever reduced motion is requested.

#### Scenario: Reduced motion on entry
- **WHEN** either locale opens with reduced motion enabled
- **THEN** the hero remains static and does not load its animation library

#### Scenario: Mobile entry
- **WHEN** either locale opens below 48rem
- **THEN** the static composition fits the viewport and both actions remain usable without animation downloads

#### Scenario: Preference or viewport changes
- **WHEN** reduced motion is enabled or the viewport becomes mobile during playback
- **THEN** motion stops immediately and the static hero remains usable without a focus or scroll jump

### Requirement: Motion lifecycle and interruption
The enhancement SHALL release its resources when unmounted and SHALL respect visibility and keyboard interruption in both locales.

#### Scenario: Hidden or offscreen hero
- **WHEN** an active sequence leaves the viewport or its document becomes hidden
- **THEN** playback pauses rather than continuing unseen

#### Scenario: Escape
- **WHEN** the visitor presses Escape during the sequence
- **THEN** motion ends at the static baseline without moving focus or altering scrolling

#### Scenario: Remount or failed asynchronous load
- **WHEN** a home is unmounted during loading or playback and then mounted again
- **THEN** the new hero works without duplicate animations or listeners affecting the old hero

### Requirement: Verifiable performance and motion
The change SHALL preserve the existing 160 KB first-load and 45 KB deferred home caps and provide deterministic progress evidence plus a recording for human review.

#### Scenario: Production verification
- **WHEN** the production home is built in both locales
- **THEN** the authoritative budget gate passes and the first-load delta from the same-base baseline is reported

#### Scenario: Review evidence
- **WHEN** review is requested
- **THEN** fixed-progress computed values are verified at 0, 0.25, 0.5, 0.75 and 1, and a recording is available without treating automated checks as proof of visual quality
