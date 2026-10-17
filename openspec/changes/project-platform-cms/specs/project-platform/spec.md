## Purpose

Lets editors manage the bilingual Project Platform page from Strapi: the page's own content (intro, WhatsApp call to action, the platform's functions) and its non-rocket space and aerospace projects, each published on its own, with every published entry in the content backup.

## ADDED Requirements

### Requirement: Page content is one locale-enabled single type
The CMS SHALL provide a single type, Project Platform, with i18n and draft/publish enabled, holding the page's intro (`intro`, rich text, localized, required), WhatsApp call to action (`whatsappUrl`, non-localized, optional; `whatsappLabel`, localized, optional), and functions (`features`, localized, repeatable, each with a required `title` and `description`). It SHALL have at most one entry per locale. The number, text and order of `features` SHALL be content: the schema SHALL NOT fix them to particular values or a particular count.

#### Scenario: One entry per locale
- **WHEN** an Editor opens Project Platform in `en` and then in `tr`
- **THEN** each locale shows one entry, never a list

#### Scenario: Functions keep each locale's own order and count
- **WHEN** an Editor saves four functions in `en` and three, in a different order, in `tr`
- **THEN** `en` keeps its four in its order and `tr` keeps its three in its order

#### Scenario: Zero functions
- **WHEN** an Editor publishes Project Platform with no functions
- **THEN** the entry publishes, with an empty list of functions

#### Scenario: Intro and function fields are required at publish
- **WHEN** an Editor publishes Project Platform without `intro`, or with a function that lacks `title` or `description`
- **THEN** the CMS rejects the publish

#### Scenario: The WhatsApp link is shared and its label is per locale
- **WHEN** an Editor sets `whatsappUrl` in `tr` and different `whatsappLabel` values in `en` and `tr`
- **THEN** both locales show the same `whatsappUrl`, and each keeps its own label

### Requirement: Projects are one locale-enabled collection, published individually
The CMS SHALL provide a collection, Platform Project, with i18n and draft/publish enabled, with `title` and `summary` (localized, required), `coverImage` (the shared image with both alt texts, non-localized, optional), `startYear` (non-localized, required, 1900–2100), `endYear` (non-localized, optional, 1900–2100), `projectStatus` (non-localized, required), and `applicationUrl` (non-localized, optional). Each entry SHALL be published and unpublished on its own. It SHALL NOT have a slug, a long body, a manual display order, or any application-state field.

#### Scenario: Zero projects
- **WHEN** no Platform Project exists
- **THEN** the collection list is empty rather than erroring

#### Scenario: One project in both locales
- **WHEN** an Editor creates a project in `en`, adds its `tr` translation, and edits `startYear` in `tr`
- **THEN** `title` and `summary` differ by locale, and `startYear`, `endYear`, `projectStatus`, `applicationUrl` and `coverImage` are the same in both

#### Scenario: Many projects, one published at a time
- **WHEN** an Editor publishes one of several projects and unpublishes another
- **THEN** only the published ones are published, and the others remain drafts

#### Scenario: English without Turkish
- **WHEN** an Editor publishes a project in `en` only
- **THEN** it is published in `en`, and the CMS does not require a `tr` translation

#### Scenario: Required fields at publish
- **WHEN** an Editor publishes a project without `summary`, `startYear` or `projectStatus`, or with a cover image that lacks either alt text
- **THEN** the CMS rejects the publish

#### Scenario: Years outside the range
- **WHEN** an Editor publishes a project with `startYear` or `endYear` below 1900 or above 2100
- **THEN** the CMS rejects the publish

### Requirement: Platform Projects are not rocket Missions
Platform Projects SHALL be KUASAR's non-rocket space and aerospace projects. KUASAR's rocket Missions SHALL remain git-managed Missions and SHALL NOT also be entered as Platform Projects. The Project Platform SHALL NOT replace the Missions archive.

#### Scenario: A rocket Mission stays in git
- **WHEN** the team records a rocket Mission
- **THEN** it is added as a Mission in the repository, and no Platform Project is created for it

#### Scenario: The CMS has no Mission type
- **WHEN** an Editor opens the Content Manager
- **THEN** there is no Mission type, and Platform Project is described as non-rocket projects

### Requirement: Project status is an editorial choice
`projectStatus` SHALL be exactly `current` or `past`, with no default, so that an Editor chooses it for every project. It SHALL NOT be derived from `startYear`, `endYear` or the current date, and the CMS SHALL NOT compute or store any other lifecycle state. The field SHALL NOT be named `status`.

#### Scenario: The editor must choose
- **WHEN** an Editor creates a project and leaves `projectStatus` empty
- **THEN** the project cannot be published until `current` or `past` is chosen

#### Scenario: Status does not follow the years
- **WHEN** an Editor marks a project `past` that has no `endYear`, or `current` with an `endYear` in the past
- **THEN** the CMS stores exactly the chosen status

#### Scenario: Any other value is rejected
- **WHEN** a write sets `projectStatus` to a value other than `current` or `past`
- **THEN** the CMS rejects it

### Requirement: The WhatsApp link accepts only HTTPS WhatsApp destinations
`whatsappUrl` SHALL accept only HTTPS URLs whose host is `whatsapp.com`, a single subdomain of it, or `wa.me`, followed by a non-empty path without whitespace. It SHALL accept group and Community invite links, Channel links and `wa.me` links without assuming a particular invite-code format. It SHALL reject other schemes, other hosts, lookalike hosts, a URL without a path, and plain text. A value that does not match SHALL NOT be publishable.

#### Scenario: WhatsApp destinations are accepted
- **WHEN** an Editor publishes `https://chat.whatsapp.com/<code>`, `https://whatsapp.com/channel/<id>`, `https://www.whatsapp.com/channel/<id>` or `https://wa.me/<number>`
- **THEN** the publish succeeds

#### Scenario: Everything else is rejected at publish
- **WHEN** an Editor publishes `http://chat.whatsapp.com/<code>`, `https://evilwhatsapp.com/<x>`, `https://whatsapp.com.evil.com/<x>`, `https://chat.whatsapp.com/`, a non-WhatsApp URL, or plain text
- **THEN** the CMS rejects the publish and the published entry keeps its previous value

### Requirement: The application link is optional and HTTPS
`applicationUrl` SHALL be optional and SHALL accept only HTTPS URLs. An empty `applicationUrl` SHALL mean the project has no application link. The CMS SHALL NOT store any separate application state, deadline or form type.

#### Scenario: HTTPS application link
- **WHEN** an Editor publishes a project with an HTTPS `applicationUrl`
- **THEN** the publish succeeds and the link is the same in both locales

#### Scenario: Non-HTTPS link rejected
- **WHEN** an Editor publishes a project with an `http://` or non-URL `applicationUrl`
- **THEN** the CMS rejects the publish

#### Scenario: No application link
- **WHEN** an Editor publishes a project without `applicationUrl`
- **THEN** the project publishes with no application link

### Requirement: Published Project Platform content is in the content snapshot
The weekly content snapshot SHALL export published Project Platform and Platform Project content in both `en` and `tr`, with every field and every function, and SHALL NOT export drafts. A locale of Project Platform with nothing published SHALL be recorded as no entry, and a snapshot with nothing published for a type SHALL still have that type's file, holding an empty list. A permission failure or any other error reading either type SHALL fail the whole run without writing any snapshot file.

#### Scenario: Nothing published yet
- **WHEN** the snapshot runs and neither type has published content
- **THEN** the run succeeds, and both types' files exist with an empty list

#### Scenario: One locale published
- **WHEN** Project Platform is published in `en` only
- **THEN** its snapshot file holds the `en` entry only, and the run succeeds

#### Scenario: Many projects in both locales
- **WHEN** several Platform Projects are published, some in both locales and some in `en` only
- **THEN** the snapshot holds one entry per published project per published locale, with cover image URL and both alt texts, and no draft-only project

#### Scenario: The backup token lacks permission
- **WHEN** the snapshot runs with a token that cannot read Project Platform or Platform Project
- **THEN** the run fails with the permission error and writes no file for any type

#### Scenario: A field added later is not silently dropped
- **WHEN** a field is added to either schema, or to a component it uses, without updating the snapshot
- **THEN** the backup tests fail

### Requirement: No public read until the page ships
The Public role SHALL NOT be granted read permission on Project Platform or Platform Project by this capability. Unauthenticated requests for either type's published or draft content SHALL be refused until the frontend change for the page grants published read.

#### Scenario: Anonymous published read is refused
- **WHEN** an unauthenticated client requests `/api/project-platform` or `/api/platform-projects`
- **THEN** the CMS refuses it

#### Scenario: Anonymous draft read is refused
- **WHEN** an unauthenticated client requests either type with `status=draft`
- **THEN** the CMS refuses it
