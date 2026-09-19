## Purpose

Defines the stable visual contract that every bilingual KUASAR web component consumes, so colour, typography, spacing, breakpoints, and motion values remain consistent and independently verifiable.

## ADDED Requirements

### Requirement: Complete theme token contract
The web application SHALL expose every colour, font, type-scale, measure, spacing, breakpoint, duration, and easing token documented in `design/tokens.md` as a CSS custom property in the production stylesheet, including tokens not yet consumed by a rendered component. Tokens in supported theme namespaces SHALL also provide the corresponding Tailwind utility or variant API; other tokens SHALL remain consumable through their CSS custom property.

#### Scenario: Downstream component consumes a token
- **WHEN** a component uses a documented semantic colour, font, text size, container measure, spacing value, breakpoint, duration, or easing
- **THEN** the value resolves from the shared theme contract rather than a component-local literal in both Turkish and English routes

#### Scenario: Unused token remains available
- **WHEN** a production build does not contain a class that references a documented token
- **THEN** the token still exists as a CSS custom property for later components and hand-written CSS

### Requirement: Semantic colour use
KUASAR application styles SHALL use semantic colour tokens instead of raw colour literals outside the token layer. The public theme SHALL NOT expose a generic orange token, a shadow scale, a glow token, or a global gradient token; orange values SHALL be available only for launch, live, upcoming, and primary CTA meanings.

#### Scenario: Component requests a semantic surface
- **WHEN** a component needs a raised background or readable body text
- **THEN** it uses the corresponding semantic surface or ink token instead of a raw colour or a primitive palette token

#### Scenario: Raw colour is introduced outside the token layer
- **WHEN** a KUASAR component or non-token stylesheet declares a hex, `rgb()`, `hsl()`, or `oklch()` colour literal
- **THEN** the change violates the design-system contract and MUST be rejected during review

#### Scenario: Orange is requested decoratively
- **WHEN** a component needs a colour for a purpose other than launch, live, upcoming, or the primary CTA
- **THEN** no generic orange theme token is available for that use

### Requirement: Schedule Event type colours
The theme SHALL expose one semantic colour token for each Schedule Event `type`: `talk`, `screening`, `summit`, `workshop`, and `other`. These tokens SHALL resolve only to approved palette or ink tokens and SHALL NOT reuse the reserved live, upcoming, or CTA tokens.

#### Scenario: Calendar renders a known event type
- **WHEN** a Schedule Event has type `talk`, `screening`, `summit`, `workshop`, or `other`
- **THEN** its colour can be selected through the matching semantic event token without adding a raw colour to the calendar component in either locale

### Requirement: Bilingual typography safety
The application SHALL use Inter for body text and navigation in both locales. It SHALL use Orbitron only for display text and short labels whose rendered string does not contain `ğ`, `Ğ`, `ş`, `Ş`, or `İ`; any heading or label containing one of those characters SHALL render entirely in Inter. The character `ı` SHALL remain eligible for Orbitron.

#### Scenario: Turkish display text contains a missing Orbitron glyph
- **WHEN** a heading or label contains `ğ`, `Ğ`, `ş`, `Ş`, or `İ`
- **THEN** the complete string renders in Inter without a per-glyph fallback, including at the `--text-5xl` display size

#### Scenario: Turkish display text contains dotless i only
- **WHEN** an eligible display heading contains `ı` but none of `ğ`, `Ğ`, `ş`, `Ş`, or `İ`
- **THEN** the complete string may render in Orbitron

#### Scenario: Navigation changes locale
- **WHEN** navigation is rendered on either a Turkish or an English route
- **THEN** every navigation label renders in Inter

#### Scenario: Body text changes locale
- **WHEN** body copy is rendered on either a Turkish or an English route
- **THEN** it renders in Inter with the shared body size and line-height tokens

### Requirement: Tokenized motion values
Every transition or animation duration and every custom easing used by KUASAR styles SHALL resolve from the documented duration and easing tokens. The design-system capability itself SHALL introduce no animation behavior.

#### Scenario: Desktop component declares motion
- **WHEN** a later component adds a transition or animation on a desktop layout
- **THEN** its duration and custom easing reference the shared tokens and its motion tier is defined by `design/motion.md`

#### Scenario: Mobile fallback retains motion
- **WHEN** a later component's mobile fallback retains any transition or animation
- **THEN** every retained duration and custom easing still references the shared tokens

#### Scenario: Reduced-motion path disables motion
- **WHEN** a later component provides its required reduced-motion path
- **THEN** the non-animated result remains functional without introducing raw duration or easing values

#### Scenario: Raw time value is introduced
- **WHEN** a stylesheet uses a raw time literal in a transition or animation declaration
- **THEN** the Tier A static motion check rejects the change

### Requirement: Default readable canvas
The application baseline SHALL render the document on the semantic dark canvas with semantic body ink and Inter, independently of the operating system colour-scheme preference.

#### Scenario: Document renders before page-specific styling
- **WHEN** either locale renders without page-specific surface or typography classes
- **THEN** the document uses the dark canvas, readable body ink, and Inter defaults from the shared theme
