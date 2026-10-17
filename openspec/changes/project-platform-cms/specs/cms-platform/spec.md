## REMOVED Requirements

### Requirement: Exactly seven locale-enabled collections
**Reason**: The CMS gains a Platform Project collection and a Project Platform single type (project-platform-cms), so "exactly seven collections" and its scenario "Admin lists only the seven collections" are no longer true.
**Migration**: Replaced by "Exactly eight locale-enabled collections and one single type" below, which keeps every other scenario (plugin-provided types hidden; zero, one and many entries) and lists the new types.

## ADDED Requirements

### Requirement: Exactly eight locale-enabled collections and one single type
The CMS SHALL expose exactly these eight **KUASAR/project-defined** content collections in the Content Manager, each with i18n enabled: Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Alumni, Sponsor, and Platform Project. It SHALL also expose exactly one **KUASAR/project-defined** single type, Project Platform, with i18n enabled. It SHALL NOT expose any other project-defined collection type or single type. Mission and Timeline Entry SHALL NOT appear in the CMS. Each collection SHALL accept zero entries, a single entry, and many entries.

A content type that Strapi or one of its core plugins registers for its own operation — for example `plugin::users-permissions.user`, which backs the Public role's API permissions rather than any project content — is **not** a project-defined content type and SHALL NOT count toward, or be counted against, the eight collections and one single type. Such a plugin-provided type SHALL NOT be visible in the Content Manager, since it has no editorial purpose here and its presence would be indistinguishable from an unauthorized extra collection.

#### Scenario: Admin lists only the project-defined content types
- **WHEN** an Editor opens the Content Manager
- **THEN** the collection list contains Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Alumni, Sponsor, and Platform Project, the single-type list contains Project Platform, and there is no other collection or single type and no Mission or Timeline Entry

#### Scenario: A plugin-provided type stays hidden
- **WHEN** the `users-permissions` plugin remains enabled for its Public-role API permissions
- **THEN** its `User` content type does not appear anywhere in the Content Manager, and the visible lists still contain exactly the eight KUASAR collections and the one KUASAR single type

#### Scenario: Empty collections are valid
- **WHEN** a collection has zero published entries
- **THEN** the admin list for that collection is empty rather than erroring, and the CMS remains usable

#### Scenario: First entry in a collection
- **WHEN** an Editor saves the first entry in a previously empty collection, with required fields filled in both the default locale and as applicable
- **THEN** the collection lists exactly that one entry

#### Scenario: Many entries in a collection
- **WHEN** an Editor saves additional entries in a collection that already has one
- **THEN** all saved entries appear in that collection's list

## MODIFIED Requirements

### Requirement: Locales are exactly en and tr
The CMS SHALL be configured with locale codes `en` and `tr` only — the same short ISO 639-1 strings the App Router uses. `en` SHALL be the default locale. The CMS SHALL NOT register `en-US`, `tr-TR`, or any third locale.

#### Scenario: Locale switcher shows only en and tr
- **WHEN** an Editor opens any of the eight collections or the Project Platform single type in the Content Manager
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

### Requirement: Editor and Super Admin roles
The CMS SHALL provide an Editor role distinct from Super Admin. Editors SHALL create, update, publish, unpublish, and delete entries in the eight collections and the Project Platform single type, and SHALL use the media library. Editors SHALL NOT modify the content-type schema or assign Super Admin. Super Admin SHALL remain available for the operators named in `docs/HANDOVER.md`. Editor access to a newly added content type SHALL be granted only after the content snapshot has been confirmed to export that type.

#### Scenario: Editor can manage entries in both locales
- **WHEN** a user with the Editor role is signed in
- **THEN** they can create and edit entries in all eight collections and in the Project Platform single type, in `en` and in `tr`

#### Scenario: Editor cannot change the schema
- **WHEN** a user with the Editor role opens administration settings
- **THEN** they cannot add, remove, or alter collection types, single types, or fields

#### Scenario: Super Admin remains distinct
- **WHEN** a Super Admin is signed in
- **THEN** they retain full administration, including schema and user management, which an Editor does not

#### Scenario: A new content type reaches editors only after its backup works
- **WHEN** a new content type has been deployed and the content snapshot has not yet produced its file successfully
- **THEN** the Editor role has no permission on that type, so no editor can create content the backup does not cover
