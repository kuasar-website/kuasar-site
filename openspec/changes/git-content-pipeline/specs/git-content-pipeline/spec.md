## Purpose

Typed loading and schema validation for the two git-resident entities,
Mission and Timeline Entry: one directory per entry, locale-independent
facts read once from `index.json`, and locale-specific prose plus a slug
read from `en.mdx`/`tr.mdx` — so adding an entry is a data operation, never
a code edit.

## ADDED Requirements

### Requirement: One directory per entry, facts and prose kept separate
For each entity type, the system SHALL load one directory per entry
containing `index.json` (locale-independent facts) and one `en.mdx` plus one
`tr.mdx` (locale-specific prose and that locale's slug). A fact SHALL be
read only from `index.json` — the loaded type for locale content SHALL NOT
carry a duplicate of any fact field, so a launch date or an apogee cannot
diverge between locales by construction.

#### Scenario: A valid Mission loads
- **WHEN** a `content/missions/<id>/` directory contains a well-formed
  `index.json`, `en.mdx`, and `tr.mdx`
- **THEN** the loader returns one Mission record combining the facts from
  `index.json` with each locale's prose and slug

#### Scenario: A valid Timeline Entry loads
- **WHEN** a `content/timeline/<id>/` directory contains a well-formed
  `index.json`, `en.mdx`, and `tr.mdx`
- **THEN** the loader returns one Timeline Entry record combining the facts
  from `index.json` with each locale's prose and slug

### Requirement: Schema validation fails closed
The system SHALL throw when a fact in `index.json` does not match its
declared type, or when a required frontmatter field is missing or malformed,
rather than coercing the value or silently omitting the field.

#### Scenario: A malformed fact throws
- **WHEN** `index.json` declares `apogeeMetres` as a non-numeric value
- **THEN** loading that entry throws, rather than rendering `NaN` or a
  coerced value

#### Scenario: A missing required fact throws
- **WHEN** `index.json` omits a fact the schema requires (for example a
  Mission's `year`)
- **THEN** loading that entry throws, rather than substituting a default

### Requirement: A locale file requires a non-empty slug
The system SHALL throw when a locale file (`en.mdx` or `tr.mdx`) is missing
entirely, or is present but declares no non-empty `slug` in its frontmatter —
independently of the `verification-gates` CI check that also asserts this,
as defense in depth for a loader whose stated job is to fail the build, not
the page.

#### Scenario: A missing locale file throws
- **WHEN** an entry's directory contains `en.mdx` but no `tr.mdx`
- **THEN** loading that entry throws, rather than silently loading only the
  English side

#### Scenario: A missing slug throws
- **WHEN** a locale file's frontmatter declares no `slug`, or an empty one
- **THEN** loading that entry throws

### Requirement: An incomplete-translation marker is exposed as data, not rendered
The system SHALL expose a locale file's `status: incomplete` frontmatter
marker as typed data on that locale's content. The system SHALL NOT render
the visible bilingual notice `design/i18n.md` requires for this marker —
that is the responsibility of whichever page renders the entry.

#### Scenario: An incomplete Turkish translation is distinguishable from the complete English one
- **WHEN** a Mission's `tr.mdx` declares `status: incomplete` and its
  `en.mdx` declares no status
- **THEN** the loaded record's Turkish content reports the incomplete
  marker and its English content does not

### Requirement: Loading a collection covers zero, one, and many entries
The system SHALL return an empty list when an entity type's content
directory does not exist or contains no entries, a single-element list when
it contains one, and every entry when it contains many — with no assumption
elsewhere in the loader about the collection's size.

#### Scenario: No entries
- **WHEN** `content/missions/` does not exist, or exists and is empty
- **THEN** the loader returns an empty list, not an error

#### Scenario: One entry
- **WHEN** `content/missions/` contains exactly one valid entry
- **THEN** the loader returns a one-element list

#### Scenario: Many entries
- **WHEN** `content/missions/` contains multiple valid entries
- **THEN** the loader returns every one of them
