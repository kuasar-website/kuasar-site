## Purpose

Gives editors a Strapi 5 admin on Render, backed by Neon Postgres, in which they can create and translate the seven Strapi-resident collections in English and Turkish without touching git, and without a schema that ranks sponsors or lets an alumnus portrait publish without consent.

## ADDED Requirements

### Requirement: Exactly seven locale-enabled collections
The CMS SHALL expose exactly these seven collection types, each with i18n enabled: Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Alumni, and Sponsor. It SHALL NOT expose any other collection type. Mission and Timeline Entry SHALL NOT appear in the CMS. Each collection SHALL accept zero entries, a single entry, and many entries.

#### Scenario: Admin lists only the seven collections
- **WHEN** an Editor opens the Content Manager
- **THEN** the collection list contains Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Alumni, and Sponsor, and contains no eighth collection and no Mission or Timeline Entry

#### Scenario: Empty collections are valid
- **WHEN** a collection has zero published entries
- **THEN** the admin list for that collection is empty rather than erroring, and the CMS remains usable

#### Scenario: First entry in a collection
- **WHEN** an Editor saves the first entry in a previously empty collection, with required fields filled in both the default locale and as applicable
- **THEN** the collection lists exactly that one entry

#### Scenario: Many entries in a collection
- **WHEN** an Editor saves additional entries in a collection that already has one
- **THEN** all saved entries appear in that collection's list

### Requirement: Locales are exactly en and tr
The CMS SHALL be configured with locale codes `en` and `tr` only — the same short ISO 639-1 strings the App Router uses. `en` SHALL be the default locale. The CMS SHALL NOT register `en-US`, `tr-TR`, or any third locale.

#### Scenario: Locale switcher shows only en and tr
- **WHEN** an Editor opens any of the seven collections in the Content Manager
- **THEN** the locale control offers `en` and `tr` and no other codes

#### Scenario: Default locale is English
- **WHEN** an Editor creates a new entry without choosing a locale
- **THEN** the entry is created in `en`

#### Scenario: Turkish and English are both editable
- **WHEN** an Editor fills localized fields on an entry in `en` and then in `tr`
- **THEN** each locale stores its own titles, slugs, and other localized fields, and locale-independent facts are not duplicated as a second translation

#### Scenario: Missing translation does not block the other locale
- **WHEN** an entry has content in `en` and no `tr` translation
- **THEN** the English entry remains available and the CMS does not require the Turkish translation before saving the English one

### Requirement: Collection fields match the content model, including date storage
Each collection's fields SHALL match `design/content-model.md` (localized vs locale-independent, types, and optionality). Date and datetime fields SHALL store raw ISO timestamps. The CMS SHALL NOT compute or persist past, live, or upcoming state on any field.

#### Scenario: Schedule Event stores raw times
- **WHEN** an Editor sets `startsAt` (and optionally `endsAt`) on a Schedule Event
- **THEN** the values persist as datetime values with no status field derived from "now"

#### Scenario: Localized announcement slug exists per locale
- **WHEN** an Editor sets an Announcement `slug` in `en` and a different `slug` in `tr`
- **THEN** both slugs persist independently

#### Scenario: Galactic Summit programme is a repeatable localized component
- **WHEN** an Editor adds one programme item and then a second, with `time`, `title`, and `description`, in `en` and in `tr`
- **THEN** both items persist, and `title` and `description` can differ by locale

### Requirement: Alumni consent fields are required
Alumni `consentRecordedAt` and `consentSource` SHALL be required. An Editor SHALL NOT be able to publish an Alumni entry while either field is empty.

#### Scenario: Publish blocked without consent timestamp
- **WHEN** an Editor attempts to publish an Alumni entry with `consentSource` filled and `consentRecordedAt` empty
- **THEN** the CMS rejects the publish and the entry is not published

#### Scenario: Publish blocked without consent source
- **WHEN** an Editor attempts to publish an Alumni entry with `consentRecordedAt` filled and `consentSource` empty
- **THEN** the CMS rejects the publish and the entry is not published

#### Scenario: Publish allowed when both consent fields are present
- **WHEN** an Editor publishes an Alumni entry with both `consentRecordedAt` and `consentSource` filled, with or without `photo` and `linkedinUrl`
- **THEN** the entry is published

### Requirement: Galactic Summit theming fields are constrained enums
Galactic Summit SHALL include `accentToken` and `heroTreatment` as required enum fields whose permitted values are defined in code. `accentToken` SHALL be exactly `aurora`, `ion`, `violet`, and `ember`. `heroTreatment` SHALL be exactly `still`, `wash`, and `gradient`. The CMS SHALL reject any other value.

#### Scenario: Accent token offers only the token set
- **WHEN** an Editor opens the `accentToken` field on a Galactic Summit entry
- **THEN** the only selectable values are `aurora`, `ion`, `violet`, and `ember`

#### Scenario: Hero treatment offers only the code-defined set
- **WHEN** an Editor opens the `heroTreatment` field on a Galactic Summit entry
- **THEN** the only selectable values are `still`, `wash`, and `gradient`

#### Scenario: Unknown theming values are rejected
- **WHEN** a write supplies `accentToken` or `heroTreatment` outside those sets
- **THEN** the CMS rejects the write

### Requirement: Sponsor has no tier
The Sponsor collection SHALL include `name`, `logo`, optional `logoLight`, `url`, optional `since`, `isCurrent`, and optional localized `blurb`. It SHALL NOT include a tier field, a `platinum`/`gold`/`silver` enum, or any field whose purpose is to rank or size sponsors relative to each other.

#### Scenario: Sponsor form has no tier control
- **WHEN** an Editor creates a Sponsor
- **THEN** the form has no tier, rank, or metal-level field

#### Scenario: Sponsor API has no tier attribute
- **WHEN** a Sponsor entry is read from the CMS API
- **THEN** the entry has no `tier` attribute

### Requirement: Editor and Super Admin roles
The CMS SHALL provide an Editor role distinct from Super Admin. Editors SHALL create, update, publish, unpublish, and delete entries in the seven collections and SHALL use the media library. Editors SHALL NOT modify the content-type schema or assign Super Admin. Super Admin SHALL remain available for the operators named in `docs/HANDOVER.md`.

#### Scenario: Editor can manage entries in both locales
- **WHEN** a user with the Editor role is signed in
- **THEN** they can create and edit entries in all seven collections in `en` and in `tr`

#### Scenario: Editor cannot change the schema
- **WHEN** a user with the Editor role opens administration settings
- **THEN** they cannot add, remove, or alter collection types or fields

#### Scenario: Super Admin remains distinct
- **WHEN** a Super Admin is signed in
- **THEN** they retain full administration, including schema and user management, which an Editor does not

### Requirement: Hosting uses Render Starter and Neon pooled Postgres
The production CMS process SHALL run on Render Starter and SHALL use a Neon pooled Postgres connection string as its database URL. It SHALL NOT use Render's Postgres offering.

#### Scenario: Production database URL is the Neon pooler
- **WHEN** the production CMS starts
- **THEN** it connects using the configured `DATABASE_URL` pointing at Neon's pooled endpoint, not at a Render-hosted Postgres instance

### Requirement: Admin panel is built in CI, not on Starter
Deploying the CMS SHALL NOT compile the admin panel on the Render Starter instance. The admin bundle SHALL be produced in GitHub Actions (or an equivalent CI runner with more than 512 MB) and the Starter instance SHALL serve that prebuilt bundle.

#### Scenario: Render start does not rebuild admin
- **WHEN** the CMS is deployed to Render Starter
- **THEN** the Starter instance starts from a prebuilt admin and does not run the admin compile step that OOMs at 512 MB

#### Scenario: CI produces the admin bundle
- **WHEN** the CMS deploy workflow runs
- **THEN** it builds the admin panel on the CI runner and that artifact is what production serves

### Requirement: Media uploads do not use local disk
Uploaded media SHALL be stored on Cloudflare R2 via the S3-compatible provider. Uploads SHALL NOT be written to the CMS instance filesystem. The provider configuration SHALL omit ACL.

#### Scenario: Upload lands on R2
- **WHEN** an Editor uploads a file in the media library in a configured environment
- **THEN** the stored URL is an R2 (or `media.<DOMAIN>`) URL, not a path on the CMS instance disk

#### Scenario: Secrets are not in the repository
- **WHEN** the repository is inspected for R2 keys, database URLs, and Strapi secrets
- **THEN** those values are absent from committed files and are supplied as environment variables
