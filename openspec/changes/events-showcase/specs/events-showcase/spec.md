## Purpose

Present KUASAR's Stellar Talk and Nebula Night records as accessible bilingual editorial content that remains readable without motion or JavaScript.

## ADDED Requirements

### Requirement: Independent event collections
Stellar Talk and Nebula Night SHALL remain distinct collections. Each empty block SHALL disappear independently; adding entries SHALL be a data operation, never a component edit.

#### Scenario: Zero entries
- **WHEN** either locale has zero talks, zero nights, or both
- **THEN** only the empty blocks are omitted, without blank grids, filler cards or invented events

#### Scenario: One entry
- **WHEN** either locale has one talk or one night with exactly one photo
- **THEN** its complete content remains legible without a minimum grid count or carousel

#### Scenario: Many entries
- **WHEN** either locale has fifty talks and fifty nights
- **THEN** all supplied records remain reachable in ordinary document flow without clipping or a focus trap

### Requirement: Bilingual event identity
Both locales SHALL keep Stellar Talk, Nebula Night, speaker names and film titles unchanged. Titles, insights, descriptions, link labels and accessible media descriptions SHALL use the selected locale; missing CMS translations SHALL fall back silently to English, labelled with their actual language.

#### Scenario: Stellar Talk content
- **WHEN** a talk is presented in either locale
- **THEN** its speaker, sequential event number, supplied portrait, title and insight are readable; supplied watch/read URLs appear as links, never embeds

#### Scenario: Nebula Night content
- **WHEN** a night is presented in either locale
- **THEN** at least one photo, its title, supplied description and optional untranslated film title appear in a photo-led layout

#### Scenario: Missing optional fields
- **WHEN** a talk lacks a portrait or watch/read link, or a night lacks a film title
- **THEN** the missing optional element leaves no broken media or empty control

### Requirement: Neutral server dates
The server SHALL include supplied ISO dates without computing past/live/upcoming or filtering relative to now. Only the shared browser clock SHALL derive relative date state.

#### Scenario: No JavaScript
- **WHEN** either locale is opened without JavaScript
- **THEN** all event content and neutral semantic dates remain available without a status derived from server time

### Requirement: Static accessible baseline
The unanimated baseline SHALL work on desktop and mobile, with semantic headings, descriptive links, keyboard-visible focus and no animation library.

#### Scenario: Narrow viewport
- **WHEN** either locale is viewed at 320px
- **THEN** text and media fit the viewport and every card remains available through ordinary scrolling

#### Scenario: Reduced motion
- **WHEN** a visitor requests reduced motion in either locale
- **THEN** all content remains visible and no hover video, video request or animated entrance occurs

### Requirement: Published routes and CMS ownership
Events SHALL be available at /en/events and /tr/etkinlikler with localized canonical/alternate metadata and a route-preserving language switcher. Content SHALL remain wholly in Strapi and be statically generated with on-demand publishing updates, never request-time CMS fetching or clock-based revalidation.

#### Scenario: Published content update
- **WHEN** an editor publishes an event through the approved CMS publishing workflow
- **THEN** the matching localized event content updates without a layout edit or scheduled rebuild

### Requirement: Optional performance-gated hover video
Only after the static baseline ships and is reviewed, optional talk hover video SHALL be eligible on a hover-capable fine-pointer desktop, with no preload or animation library. Routes SHALL remain within the 175KB first-load JS budget. An enhancement that cannot meet the budget SHALL be omitted.

#### Scenario: Eligible deliberate hover
- **WHEN** an eligible desktop visitor hovers a talk with an approved video
- **THEN** the optional muted preview may load, and the still portrait remains the permanent fallback when playback ends or fails

#### Scenario: Mobile or reduced motion
- **WHEN** the visitor uses a mobile viewport, coarse pointer, no-hover device or reduced motion
- **THEN** the video is absent and no video bytes are requested, even after interacting with the card

#### Scenario: Video over budget
- **WHEN** the optional enhancement fails the route's weight check
- **THEN** the route ships only its still-image baseline with no budget exception
