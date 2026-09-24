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
