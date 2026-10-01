## Purpose

Gives the site Vercel Web Analytics and Speed Insights, real KUASAR fallback metadata in
place of the `create-next-app` placeholder, and the one authorized custom analytics event
as a reusable, honestly-tracked contract.

## ADDED Requirements

### Requirement: Web Analytics and Speed Insights are both present exactly once
The root layout SHALL render both the Vercel Web Analytics and Speed Insights wrapper
components exactly once, on every route, in both locales. Neither SHALL be exempted from
the route's first-load JavaScript budget.

#### Scenario: Both wrappers render on any route
- **WHEN** any route in either locale is rendered
- **THEN** the Web Analytics wrapper and the Speed Insights wrapper are both present in
  the rendered output exactly once each

#### Scenario: The budget check is not bypassed
- **WHEN** the production build's per-route first-load JavaScript is measured
- **THEN** the two analytics wrapper components' JavaScript counts toward that route's
  measured total, with no exemption

### Requirement: No third-party analytics, embed, pixel, or tag manager is introduced
The system SHALL NOT add Google Analytics, a tag manager, a third-party pixel, or any
embedded third-party script, per the KVKK debt recorded in `docs/adr/0002-cms.md`.

#### Scenario: Only first-party Vercel analytics is present
- **WHEN** the rendered page's script sources are inspected
- **THEN** the only analytics-related scripts present are Vercel Web Analytics and Speed
  Insights, and no third-party analytics, pixel, or tag-manager script is present

### Requirement: Root layout metadata is real and does not corrupt route-specific metadata
The root layout SHALL define a fallback `title.default` and a factual site description,
using an identity `title.template` (`"%s"`) rather than a branding prefix/suffix template,
and SHALL set `metadataBase` so relative canonical and hreflang URLs resolve against the
site's real origin rather than a development default. It SHALL NOT override a route's own
title, description, or discovery metadata. An identity template is required here because
Next's `Metadata` type requires a `template` alongside `title.default`; a real prefix/suffix
template (for example `"%s | KUASAR"`) would apply to every child route's own string title
and double-suffix routes — such as `about-and-join`'s — that already end in `" | KUASAR"`
themselves.

#### Scenario: A route with no metadata of its own falls back correctly
- **WHEN** a route defines no `title` or `description` of its own
- **THEN** it renders the root layout's fallback title and description

#### Scenario: A route with its own metadata is unaffected
- **WHEN** a route defines its own `title` as a complete string (for example, an
  `about-and-join` page's `"<Page> | KUASAR"`)
- **THEN** the rendered title is exactly that string, with no additional prefix or suffix
  applied by the root layout

#### Scenario: Relative discovery URLs resolve to the real origin
- **WHEN** a route's `alternates.canonical` or `alternates.languages` is a root-relative
  path, as `sectionAlternates()` produces
- **THEN** the rendered `<link>` tags resolve that path against the root layout's
  `metadataBase`, not against a development-only default

### Requirement: robots.txt and sitemap.xml remain correct without modification
`robots.txt` SHALL continue to reference the sitemap and SHALL NOT disallow either locale
prefix. The preview route's `noindex` rule SHALL remain deferred to `publish-integration`,
not implemented prematurely. The sitemap SHALL list only routes that are actually published
on `main`, using the existing locale-routing alternates mechanism, and MAY be empty when no
such route exists.

#### Scenario: robots.txt is unchanged and still correct
- **WHEN** `robots.txt` is requested
- **THEN** it references `sitemap.xml`, disallows neither `/en` nor `/tr`, and contains no
  premature preview-route rule

#### Scenario: The sitemap advertises no unpublished route
- **WHEN** the sitemap is generated against `main`
- **THEN** it contains no entry for a route that exists only in an open, unmerged pull
  request

#### Scenario: An empty sitemap remains valid
- **WHEN** no section route has been published on `main` yet
- **THEN** the sitemap contains zero entries, which is a valid, expected state rather than
  an error

### Requirement: The sponsorship-PDF event is defined once and instrumented only where the real interaction exists
The system SHALL define exactly one named function for the Galactic Summit sponsorship-PDF
open event, the sole custom event `docs/adr/0001-stack.md` §6 authorizes. This capability
SHALL NOT fabricate a page, button, or route to call it from. The event SHALL be
instrumented against the real "Become a Partner" interaction only once that interaction
exists, and this capability's own task list SHALL record that wiring as blocked, not
complete, until it does.

#### Scenario: The event helper exists and is named once
- **WHEN** `apps/web/lib/analytics/events.ts` is inspected
- **THEN** it exports exactly one function that tracks the sponsorship-PDF-open event under
  one fixed event name, and nothing in this change calls it

#### Scenario: No fabricated Galactic Summit interaction is introduced
- **WHEN** the diff for this change is inspected
- **THEN** it contains no Galactic Summit route, page, or "Become a Partner" component

#### Scenario: The acceptance record reflects the true state
- **WHEN** this change's `tasks.md` is inspected
- **THEN** the sponsorship-PDF wiring task is marked incomplete/blocked, not complete,
  because no real interaction exists yet to wire it to
