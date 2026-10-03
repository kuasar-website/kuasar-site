## Purpose

Typed consumption of Strapi's `Announcement` content type: mapping Strapi's
REST response into validated domain data, ordering it for display, and
selecting which locale variant to show when a translation is missing —
without depending on a live Strapi instance, a revalidation contract, or a
page shell that don't exist yet.

## ADDED Requirements

### Requirement: Strapi response mapping fails closed
The system SHALL validate a Strapi REST response for one `Announcement`
against its known schema (`title`, `slug`, `excerpt?`, `body?`, `pinned`,
`announcementDate`, `coverImage?`) and SHALL throw, naming the offending field,
when a required field is missing or has an unexpected type — rather than
producing a record with `undefined` fields. `announcementDate` SHALL be a full,
offset-qualified ISO 8601 date-time. Strapi's system `publishedAt` SHALL NOT be
part of the mapped record.

#### Scenario: A well-formed response maps successfully
- **WHEN** a Strapi response for one announcement contains all required
  fields with their expected types
- **THEN** the mapper returns a domain record with those fields

#### Scenario: A malformed response throws
- **WHEN** a Strapi response is missing a required field (for example
  `title`), or a field has an unexpected type (for example `pinned` as a
  string)
- **THEN** the mapper throws, naming the field

### Requirement: Pinned entries sort first, then by announcement date
The system SHALL order a list of announcements with every `pinned` entry
before every non-pinned entry, SHALL order entries within each group by the
editor-set `announcementDate` descending (newest first), and SHALL break any
remaining tie by `documentId` ascending, so the order is total and the same in
both locales. The system SHALL NOT order by, or display, Strapi's
`publishedAt` or `updatedAt`: Strapi 5 resets both whenever an entry is edited
and republished (verified on 5.52.3), which would move an old announcement to
the top.

#### Scenario: Pinned entries lead regardless of date
- **WHEN** a list contains a pinned entry dated before an unpinned, more
  recent entry
- **THEN** the pinned entry sorts first

#### Scenario: Entries within the same group sort newest first
- **WHEN** two entries share the same `pinned` value
- **THEN** the one with the later `announcementDate` sorts first

#### Scenario: Same calendar day, different times
- **WHEN** two entries share a calendar day with different `announcementDate` times
- **THEN** the later time sorts first, and the page shows each entry's date and time, so the order is visible

#### Scenario: Republishing does not reorder
- **WHEN** an older announcement is edited and republished, so Strapi gives it a newer `publishedAt` than a newer announcement, and its `announcementDate` is unchanged
- **THEN** the newer announcement still sorts first

#### Scenario: Equal dates
- **WHEN** two entries in the same group have the same `announcementDate`
- **THEN** the one with the smaller `documentId` sorts first, whatever the input order

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

### Requirement: The News page lists published announcements in both locales
The site SHALL serve `/en/news` and `/tr/duyurular` as statically generated pages inside
the shared shell, each server-rendered with `<html lang>` equal to its locale and with
canonical and hreflang alternates. The pages SHALL show only published announcements,
pinned first and then newest `announcementDate` first, each with its title, its
`announcementDate` as a localized date and 24-hour time in Europe/Istanbul (for example
"Monday, October 5, 2026 · 14:30" / "5 Ekim 2026 Pazartesi · 14:30"), its excerpt and its
body. On `/tr`, an announcement without a Turkish variant SHALL be shown in English with
`lang="en"` on that announcement. `/en` SHALL NOT show a Turkish-only announcement.

#### Scenario: Zero published announcements
- **WHEN** no announcement is published, in either locale
- **THEN** both `/en/news` and `/tr/duyurular` return 200 with a localized empty message, not a 404 and not an error, and neither appears in the sitemap

#### Scenario: One published announcement
- **WHEN** exactly one announcement is published, in English only
- **THEN** `/en/news` shows it, and `/tr/duyurular` shows it in English with `lang="en"`, and both pages appear in the sitemap

#### Scenario: Many published announcements
- **WHEN** more announcements are published than fit in one Strapi page
- **THEN** every one is shown, pinned first, then newest first, in both locales

#### Scenario: A draft is never public
- **WHEN** an announcement exists only as a draft
- **THEN** neither page shows it, whether or not the visitor has a Draft Mode cookie from another section's preview

#### Scenario: Editor formatting cannot break the page
- **WHEN** an announcement body contains Markdown outside the supported subset, raw HTML, an image or an unsafe link
- **THEN** the page still builds and renders, showing that content as escaped text and never as active HTML or a link to a non-HTTPS target

#### Scenario: Publishing reaches the page without a deploy
- **WHEN** an announcement is published or unpublished in Strapi and the webhook calls `/api/revalidate`
- **THEN** both pages change without a deploy, with no 404 (the first view may still be stale, per publish-integration's known gap)
