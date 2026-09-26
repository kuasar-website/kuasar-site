## Purpose

Defines the closed, accessible interaction vocabulary and progressive section-reveal behavior that every bilingual KUASAR surface can reuse without inventing local variants or motion rules.

## ADDED Requirements

### Requirement: Closed three-type action vocabulary
The web application SHALL expose exactly three shared action types: `primary`, `secondary`, and `text`. The primary type SHALL represent the principal CTA, the secondary type SHALL represent an outline CTA, and the text type SHALL render a text link with an arrow. Consumers MUST NOT create or request a component-local fourth visual type.

#### Scenario: Turkish action set renders
- **WHEN** a Turkish surface renders principal, supporting, and inline navigation actions
- **THEN** it can render the actions using only the primary, secondary, and text types without changing their shared visual contract

#### Scenario: English action set renders
- **WHEN** an English surface renders principal, supporting, and inline navigation actions
- **THEN** it can render the actions using only the primary, secondary, and text types without changing their shared visual contract

#### Scenario: Labels have different lengths
- **WHEN** equivalent Turkish and English action labels occupy different amounts of inline space
- **THEN** all three action types preserve readable labels without a fixed-width or truncation assumption

### Requirement: Semantic and keyboard-accessible actions
Every shared action SHALL preserve native link semantics for navigation and SHALL expose a clearly visible `:focus-visible` indicator independent of hover state. The text action's decorative arrow SHALL not add a second accessible name.

#### Scenario: Keyboard focus in Turkish
- **WHEN** a keyboard user tabs through all three action types on a Turkish route
- **THEN** each action exposes a visible focus indicator and its Turkish label remains the accessible name

#### Scenario: Keyboard focus in English
- **WHEN** a keyboard user tabs through all three action types on an English route
- **THEN** each action exposes a visible focus indicator and its English label remains the accessible name

#### Scenario: Screen reader encounters the text action
- **WHEN** assistive technology reads a text action with its arrow
- **THEN** the action is announced once from its label and the decorative arrow is ignored

### Requirement: L3 action feedback
The three action types SHALL implement L3 feedback with CSS only. On a fine pointer that supports hover, primary hover SHALL lighten its fill, secondary hover SHALL brighten its border, and text hover SHALL shift only its arrow by approximately two pixels. Press feedback MAY use transform, but every transitioned property SHALL be transform or opacity and every L3 duration SHALL resolve from an interface duration token no longer than `--duration-slow`.

#### Scenario: Fine pointer hovers each action
- **WHEN** a mouse or trackpad user hovers primary, secondary, and text actions
- **THEN** the primary fill lightens, the secondary border brightens, and only the text arrow shifts inline by approximately two pixels

#### Scenario: Touch input activates an action
- **WHEN** a touch device activates any action type
- **THEN** no hover-only transform is applied and the native activation remains immediate

#### Scenario: Reduced-motion user interacts with an action
- **WHEN** `prefers-reduced-motion: reduce` is active and the user focuses, hovers, or presses an action
- **THEN** colour and focus feedback remain available while arrow, scale, and position movement are removed

#### Scenario: Mobile action fallback renders
- **WHEN** an action renders below the `md` breakpoint
- **THEN** it remains fully operable with focus and press feedback and does not require hover movement to communicate its type

### Requirement: Visible section-reveal baseline
Content wrapped by the shared L2 reveal SHALL be visible and usable in the server-rendered baseline before hydration, when JavaScript is unavailable, and when neither enhancement mechanism is supported. Enhancement MUST NOT be required to discover or operate the content.

#### Scenario: JavaScript is unavailable
- **WHEN** a route renders reveal content without client-side JavaScript
- **THEN** the complete content is visible, readable, and interactive in both locales

#### Scenario: Enhancement APIs are unavailable
- **WHEN** the browser supports neither CSS view timelines nor `IntersectionObserver`
- **THEN** reveal content remains in its visible baseline state

### Requirement: Progressive L2 reveal enhancement
The shared L2 reveal SHALL use a CSS view-progress timeline when supported and SHALL otherwise use a one-shot `IntersectionObserver` fallback. Both paths SHALL animate only transform and opacity, SHALL use shared motion tokens, and SHALL add no animation or scroll library.

#### Scenario: CSS view timelines are supported
- **WHEN** reveal content starts below the initial viewport in a browser that supports the required CSS view-timeline features
- **THEN** its entry progress is driven by the CSS view timeline without creating an `IntersectionObserver`

#### Scenario: CSS view timelines are not supported
- **WHEN** reveal content starts below the initial viewport in a browser with `IntersectionObserver` but without the required CSS view-timeline features
- **THEN** the observer reveals it once as it enters the viewport and then disconnects from that element

#### Scenario: Reveal content is initially visible
- **WHEN** reveal content is already inside the initial viewport
- **THEN** it remains visible rather than being hidden after hydration to manufacture an entrance animation

#### Scenario: Multiple reveal instances render
- **WHEN** a route renders multiple reveal instances
- **THEN** each instance determines and completes its own enhancement without one instance hiding or advancing another

#### Scenario: No reveal instance renders
- **WHEN** a route does not use the reveal primitive
- **THEN** it creates no observer and loads no reveal client code

#### Scenario: Reduced-motion reveal renders
- **WHEN** `prefers-reduced-motion: reduce` is active
- **THEN** reveal content stays visible with no transform, view-timeline animation, or observer-driven entrance

#### Scenario: Mobile reveal renders
- **WHEN** reveal content enters the viewport below the `md` breakpoint and reduced motion is not requested
- **THEN** the enhancement may change opacity but SHALL NOT translate or scale the content

### Requirement: Existing motion gates remain authoritative
The interaction primitives SHALL pass the repository's Tier A motion gates: no animation-library import, no layout-property animation, no raw time literal, and a reduced-motion block beside every stylesheet that declares motion. L3 interface durations SHALL stay at or below 300ms; the L2 reveal SHALL use the documented `--duration-reveal` token rather than being misclassified as component-level L3 motion.

#### Scenario: A raw duration or layout transition is introduced
- **WHEN** a primitive declares a raw time value or transitions a property other than transform or opacity
- **THEN** Tier A rejects the change

#### Scenario: An animation library is imported
- **WHEN** an interaction primitive imports an animation or smooth-scroll library
- **THEN** Tier A rejects the change under the non-L1 import policy
