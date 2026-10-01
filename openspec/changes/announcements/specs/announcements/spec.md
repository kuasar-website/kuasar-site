## Purpose

Typed consumption of Strapi's `Announcement` content type: mapping Strapi's
REST response into validated domain data, ordering it for display, and
selecting which locale variant to show when a translation is missing —
without depending on a live Strapi instance, a revalidation contract, or a
page shell that don't exist yet.

## ADDED Requirements

### Requirement: Strapi response mapping fails closed
The system SHALL validate a Strapi REST response for one `Announcement`
against its known schema (`title`, `slug`, `excerpt`, `body`, `pinned`,
`publishedAt`, `coverImage?`) and SHALL throw, naming the offending field,
when a required field is missing or has an unexpected type — rather than
producing a record with `undefined` fields.

#### Scenario: A well-formed response maps successfully
- **WHEN** a Strapi response for one announcement contains all required
  fields with their expected types
- **THEN** the mapper returns a domain record with those fields

#### Scenario: A malformed response throws
- **WHEN** a Strapi response is missing a required field (for example
  `title`), or a field has an unexpected type (for example `pinned` as a
  string)
- **THEN** the mapper throws, naming the field

### Requirement: Pinned entries sort first, then by publication date
The system SHALL order a list of announcements with every `pinned` entry
before every non-pinned entry, and SHALL order entries within each group by
`publishedAt` descending (newest first) — an explicit choice for the
secondary order, since `docs/task-assignments.html` specifies the primary
grouping only.

#### Scenario: Pinned entries lead regardless of publish date
- **WHEN** a list contains a pinned entry published before an unpinned,
  more recent entry
- **THEN** the pinned entry sorts first

#### Scenario: Entries within the same group sort newest first
- **WHEN** two entries share the same `pinned` value
- **THEN** the one with the later `publishedAt` sorts first

#### Scenario: Zero, one, and many entries all order without error
- **WHEN** the input list has zero, one, or many entries
- **THEN** ordering succeeds in every case, returning a list of the same
  length

### Requirement: Locale selection falls back silently, never 404s
Given an announcement's available locale variants (matched across locales
by Strapi's shared `documentId`) and a requested locale, the system SHALL
select the requested locale's variant when it exists, and SHALL otherwise
select the default locale's (`en`) variant silently — with no visible
notice and no error — rather than 404ing. This SHALL NOT rely on Strapi
performing this fallback itself; verified against Strapi 5's actual
behavior, it does not (see `design.md`).

#### Scenario: The requested locale exists
- **WHEN** an announcement has both an `en` and a `tr` variant, and `tr` is
  requested
- **THEN** the `tr` variant is selected

#### Scenario: The requested locale is missing — silent fallback
- **WHEN** an announcement has only an `en` variant, and `tr` is requested
- **THEN** the `en` variant is selected, with nothing in the result
  indicating a fallback occurred that would prompt rendering a notice

#### Scenario: Neither the requested nor the default locale exists
- **WHEN** an announcement has no `en` variant either (a state Strapi's
  content-type schema does not prevent, since only `en` is not enforced as
  required at the schema level)
- **THEN** the system throws rather than returning a record with no
  content — a silent fallback to nothing is indistinguishable from a bug
