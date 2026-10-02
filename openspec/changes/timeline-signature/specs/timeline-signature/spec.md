## ADDED Requirements

### Requirement: Route-local desktop narrative
Only the English and Turkish dedicated timeline routes SHALL progressively enhance vertical scrolling into present-to-past horizontal movement using deferred GSAP and ScrollTrigger. Server rendering SHALL never run GSAP or compute now.

#### Scenario: Eligible desktop
- **WHEN** either localized route has multiple overflowing entries on a viewport at least 48rem wide with no reduced-motion preference
- **THEN** scrolling down advances toward older records and scrolling back reverses the same mapping

#### Scenario: Home section
- **WHEN** the native timeline section appears on home or another route
- **THEN** no timeline signature or animation library is loaded there

### Requirement: Permanent native fallback
The server-rendered timeline SHALL remain readable and navigable without the enhancement.

#### Scenario: Mobile or reduced motion
- **WHEN** either locale is below 48rem or requests reduced motion, initially or after activation
- **THEN** the result is the native baseline without pinning, transformed cards or animated scrolling

#### Scenario: Missing JavaScript or failed import
- **WHEN** JavaScript is disabled or the deferred engine fails to load
- **THEN** all supplied entries remain available through native scrolling

#### Scenario: Zero, one or many entries
- **WHEN** either locale has zero, one or fifty entries
- **THEN** zero preserves the baseline empty-route behavior, one stays native, and fifty remain reachable without a focus trap

### Requirement: Accessible lifecycle
The signature SHALL scope all animation state and clean it up when eligibility changes or the route unmounts.

#### Scenario: Keyboard use
- **WHEN** a visitor tabs into a card, uses native scrolling keys or presses Escape
- **THEN** the native scroller is restored and the focused content remains reachable

#### Scenario: Navigation and preference changes
- **WHEN** the route unmounts or reduced motion/mobile mode activates
- **THEN** signature-owned triggers, spacers, listeners and inline transforms are removed

### Requirement: Measured delivery and human review
The signature SHALL keep the 175KB first-load and 45KB deferred caps and report its first-load change relative to main. It SHALL not claim unchanged first-load unless measurement confirms it.

#### Scenario: Review evidence
- **WHEN** the PR is submitted for motion review
- **THEN** both-locale automated checks, the first-load comparison, deferred measurement and a screen recording are available; positive first-load delta remains an explicit acceptance issue
