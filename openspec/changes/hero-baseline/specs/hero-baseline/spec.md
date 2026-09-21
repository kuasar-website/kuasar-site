## Purpose

Give sponsors and prospective members a complete, accessible bilingual introduction to KUASAR before any home signature animation loads or exists.

## ADDED Requirements

### Requirement: Permanent static identity
The hero SHALL show the existing KUASAR wordmark large and left-aligned on navy-black, with “Koç University Association of Space & Rocketry” beneath it. Artwork SHALL preserve its geometry, monochrome ink colour, minimum 120px width and clear space of approximately 0.28 times rendered width on all sides.

#### Scenario: JavaScript disabled or slow connection
- **WHEN** either locale is opened without JavaScript or before fonts and secondary resources load
- **THEN** the identity, team name and both audience entry points are present in initial HTML with no loading or animation requirement

#### Scenario: Narrow screen
- **WHEN** either locale is viewed at 320px width
- **THEN** the wordmark remains at least 120px wide, its clear space is preserved and the content wraps without horizontal page overflow

### Requirement: Two audiences and two languages
The hero SHALL expose sponsor and prospective-member entry points in both locales, without hiding either in a menu or a secondary screen. It SHALL use the site's shared interaction styles, readable Turkish glyphs and keyboard-visible focus. Neither audience SHALL be presented as less important in the copy.

#### Scenario: Turkish and English navigation
- **WHEN** a keyboard visitor opens either locale
- **THEN** both audience actions can be reached and activated, with labels and destinations appropriate to the selected locale

### Requirement: Non-animated accessible baseline
The baseline SHALL use no animation library, scrolling library, video, canvas or client-only rendering. It SHALL remain the permanent fallback for later hero-signature work.

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested in either locale
- **THEN** the same complete static hero is visible without a shortened animation, movement or waiting

#### Scenario: Mobile
- **WHEN** a phone visitor opens either locale
- **THEN** both entry points remain visible and usable with native scrolling, without hover or pointer assumptions

### Requirement: Home performance
The integrated `/en` and `/tr` home pages SHALL remain within the 160KB first-load JavaScript budget, and the hero SHALL meet LCP below 2.5 seconds on a real phone.

#### Scenario: Release verification
- **WHEN** the hero is integrated with the production site shell
- **THEN** route budgets are checked against the real home build and a real-phone LCP result is recorded before marking the baseline complete
