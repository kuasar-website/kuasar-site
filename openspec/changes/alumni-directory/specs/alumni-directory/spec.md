## Purpose

Typed, consent-safe consumption of Strapi's `Alumnus` content type: a
public type that cannot carry consent-audit fields even by accident, a
photo gate that gracefully hides an ineligible portrait without hiding the
person, and grouping/ordering that keeps every departure year equally
findable — without depending on a live Strapi instance, a revalidation
contract, or a page shell that don't exist yet.

## ADDED Requirements

### Requirement: The public type excludes consent-audit fields structurally
The public Alumni type SHALL have no field corresponding to
`consentRecordedAt` or `consentSource`. This SHALL be enforced by the
type definition itself, not by the mapper choosing not to copy them —
a future edit that tries to add them back is a type change, not a
one-line oversight.

#### Scenario: The mapped record has no consent-audit fields
- **WHEN** any Strapi Alumni response is mapped
- **THEN** the resulting object has no `consentRecordedAt` or
  `consentSource` property, and the type it is declared to return has none
  either

### Requirement: A photo is exposed only with valid consent evidence
The system SHALL include a photo in the public output only when the raw
record's `consentRecordedAt` is a valid date and `consentSource` is a
non-empty string. A photo that is absent, or present but lacking valid
consent evidence, SHALL resolve to `photo: null` — this SHALL NOT prevent
the rest of the record from being returned.

#### Scenario: A photo with valid consent evidence is exposed
- **WHEN** a record has a well-formed `photo`, a valid
  `consentRecordedAt`, and a non-empty `consentSource`
- **THEN** the mapped record's `photo` is populated

#### Scenario: A photo with missing consent evidence is suppressed, not the record
- **WHEN** a record has a well-formed `photo` but no `consentRecordedAt`
  (or no `consentSource`)
- **THEN** the mapped record's `photo` is `null`, and every other field
  maps normally

#### Scenario: A photo with invalid consent evidence is suppressed, not the record
- **WHEN** a record has a well-formed `photo` and a `consentSource`, but
  `consentRecordedAt` is not a valid date
- **THEN** the mapped record's `photo` is `null`, and every other field
  maps normally

#### Scenario: No photo at all maps without needing consent evidence
- **WHEN** a record has no `photo`
- **THEN** the mapped record's `photo` is `null` regardless of whether
  consent evidence is present

### Requirement: Structurally malformed data throws; a consent gap does not
The system SHALL throw, naming the field, when a required field
(`name`) is missing, or when any present field does not match its
declared type — including a `photo` that is present but not a
`{ url: string }` shape. This is distinct from missing consent evidence,
which never throws (see above).

#### Scenario: A missing name throws
- **WHEN** a record has no `name`
- **THEN** mapping it throws, naming `"name"`

#### Scenario: A wrong-typed field throws
- **WHEN** a record's `yearJoined` is present but not a number
- **THEN** mapping it throws, naming `"yearJoined"`

#### Scenario: A structurally broken photo throws
- **WHEN** a record's `photo` is present but is not an object with a
  string `url`
- **THEN** mapping it throws — this is corrupted data, not a consent gap

### Requirement: Alumni are grouped and ordered so every departure year is equally findable
The system SHALL group mapped alumni by `yearLeft`, order groups from the
most recent year to the least recent, order entries within a group
alphabetically by `name`, and place entries with no `yearLeft` in their own
group after every dated group. This SHALL succeed, returning groups of the
correct shape, for zero, one, and many entries.

#### Scenario: Groups are ordered newest year first
- **WHEN** mapped alumni include entries with `yearLeft` 2023 and 2026
- **THEN** the 2026 group appears before the 2023 group

#### Scenario: Entries within a group are alphabetical
- **WHEN** two entries share the same `yearLeft`
- **THEN** they appear in alphabetical order by `name`

#### Scenario: Entries with no yearLeft form their own trailing group
- **WHEN** some mapped alumni have no `yearLeft`
- **THEN** they appear in one group placed after every dated group, rather
  than being dropped or mixed into a dated one

#### Scenario: Zero, one, and many entries all group without error
- **WHEN** the input list has zero, one, or many entries
- **THEN** grouping succeeds in every case

### Requirement: Consent-audit fields are never retrievable through the Content API
The CMS SHALL never return an alumnus's `consentRecordedAt` or `consentSource` through the
Content API, to the Public role or to an API token, and SHALL refuse any request that
selects, filters or sorts on them, while still requiring both before an alumnus can be
published.

#### Scenario: Public list and single reads
- **WHEN** an unauthenticated caller requests `/api/alumni` or `/api/alumni/<documentId>` for a published alumnus
- **THEN** the response contains the public fields and neither consent field nor its value

#### Scenario: Selecting, filtering or sorting on a consent field
- **WHEN** a caller (unauthenticated or with an API token) uses `fields`, `filters` or `sort` on `consentSource` or `consentRecordedAt`
- **THEN** the request is refused with 400, and a correct guess is indistinguishable from a wrong one

#### Scenario: Publishing still requires consent
- **WHEN** an editor tries to publish an alumnus with no consent evidence
- **THEN** publishing fails

#### Scenario: A regression is caught at build time
- **WHEN** the Content API returns either consent field in any alumni response
- **THEN** the site build fails, naming the field and not printing its value

### Requirement: The Alumni page lists published alumni in both locales
The site SHALL serve `/en/alumni` and `/tr/mezunlar` as statically generated pages inside
the shared shell, each server-rendered with `<html lang>` equal to its locale, with canonical
and hreflang alternates, showing only published alumni grouped by `yearLeft`. On `/tr`, a
person's Turkish `roleHeld` SHALL be used when present, and otherwise the English one with
`lang="en"`. A LinkedIn link SHALL render only for an HTTPS `linkedin.com` URL. A photo SHALL
render only when the consent gate allows it. The pages SHALL NOT be listed in the sitemap,
SHALL be served with page-level robots metadata `noindex` (and `nofollow`), and SHALL NOT
be disallowed in `robots.txt`, so crawlers can read the directive. No other public page
SHALL gain `noindex` from this.

#### Scenario: The directory is reachable but not indexable
- **WHEN** a crawler or visitor fetches `/en/alumni` or `/tr/mezunlar`
- **THEN** the page returns 200, is linked from the navigation in its locale, contains `<meta name="robots" content="noindex, nofollow"/>`, is absent from `sitemap.xml`, and `robots.txt` does not block it

#### Scenario: Zero published alumni
- **WHEN** no alumnus is published
- **THEN** both pages return 200 with a localized empty message, not a 404 and not an error

#### Scenario: One published alumnus
- **WHEN** exactly one alumnus is published, with an English record only
- **THEN** both pages show one card, the Turkish page with the English role marked `lang="en"`

#### Scenario: Many published alumni
- **WHEN** more alumni are published than fit in one Strapi page, across several leaving years
- **THEN** every one is shown, in groups ordered newest year first, alphabetical within a group, unknown year last

#### Scenario: A draft is never public
- **WHEN** an alumnus exists only as a draft
- **THEN** neither page shows them, whether or not the visitor has a Draft Mode cookie from another section's preview

#### Scenario: An invalid LinkedIn URL
- **WHEN** an alumnus's `linkedinUrl` is `http:`, on another host, or malformed
- **THEN** no LinkedIn link is rendered and the card is otherwise unchanged
