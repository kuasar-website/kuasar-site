## Purpose

Lets editors publish KUASAR's downloadable resources (training materials, guides, documents) from Strapi in English and Turkish, each with its own uploaded file per language, with every published entry in the content backup.

## ADDED Requirements

### Requirement: Resources are one locale-enabled collection with an uploaded file
The CMS SHALL provide a collection, Resource, with i18n and draft/publish enabled, with `title` (string, localized, required), `description` (text, localized, required) and `file` (one Media Library file, localized, required). The CMS SHALL NOT provide a page-level type for Resources, and Resource SHALL NOT have a category, cover image, year or date, manual order, external URL, slug or body.

#### Scenario: Zero resources
- **WHEN** no Resource exists
- **THEN** the collection list is empty rather than erroring

#### Scenario: One resource in both locales
- **WHEN** an Editor creates a Resource in `en` with an English file and adds its `tr` translation with a Turkish file
- **THEN** `title`, `description` and `file` each differ by locale, and each locale keeps its own file

#### Scenario: Many resources
- **WHEN** an Editor publishes several Resources and unpublishes one
- **THEN** only the published ones are published, and the unpublished one remains a draft

#### Scenario: Required fields at publish
- **WHEN** an Editor publishes a Resource without `title`, `description` or `file`
- **THEN** the CMS rejects the publish

#### Scenario: Publish, unpublish and republish
- **WHEN** an Editor unpublishes a published Resource and publishes it again
- **THEN** it is a draft after unpublishing and published after republishing

### Requirement: The file is a document, never an image, video or audio
In the Content Manager, the `file` field SHALL offer for selection only Media Library files of the document types the upload configuration allows (for example PDF, Word and other Office documents, plain text and CSV), and SHALL NOT offer an image, video or audio file for selection. The CMS SHALL NOT restrict `file` to PDF only.

#### Scenario: A PDF and another document type can be selected
- **WHEN** an Editor opens the `file` picker on a Resource
- **THEN** PDF files and other allowed document files, such as `.docx`, can be selected

#### Scenario: Images and videos cannot be selected
- **WHEN** an Editor opens the `file` picker on a Resource and the Media Library holds images and videos
- **THEN** the images and videos are not selectable for `file`

### Requirement: An entry's locale is the language of its file
A Resource SHALL exist in a locale only when a file in that language exists. An English-only Resource SHALL be publishable in `en` without a `tr` version, and a Turkish-only Resource SHALL be publishable in `tr` without an `en` version. Each locale's published content SHALL contain only the Resources published in that locale.

#### Scenario: English-only resource
- **WHEN** an Editor publishes a Resource in `en` only
- **THEN** it is published in `en`, has no `tr` version, and is absent from the `tr` published content

#### Scenario: Turkish-only resource
- **WHEN** an Editor creates and publishes a Resource in `tr` only
- **THEN** it is published in `tr`, has no `en` version, and is absent from the `en` published content

### Requirement: Published Resources are in the content snapshot
The weekly content snapshot SHALL export published Resources in both `en` and `tr`, with `title`, `description`, and the file's public URL, original file name and MIME type, and SHALL NOT export drafts or the file's contents. A snapshot with nothing published SHALL still have the Resource file, holding an empty list. A permission failure or any other error reading Resource SHALL fail the whole run without writing any snapshot file.

#### Scenario: Nothing published yet
- **WHEN** the snapshot runs and no Resource is published
- **THEN** the run succeeds and the Resource file exists with an empty list

#### Scenario: Localized resources
- **WHEN** Resources are published in both locales, in `en` only and in `tr` only
- **THEN** the snapshot holds one entry per published Resource per published locale, each with that locale's own file URL, name and type, and no draft-only Resource

#### Scenario: The backup token lacks permission
- **WHEN** the snapshot runs with a token that cannot read Resource
- **THEN** the run fails with the permission error and writes no file for any type

### Requirement: Resource files are public and archived
The project SHALL document, for editors, that a file is publicly reachable at its media URL from the moment it is uploaded, whether or not its Resource is published; that confidential or internal documents SHALL NOT be uploaded; that the original file SHALL be kept in the media archive, because the snapshot does not contain it; and that a revised file SHALL be uploaded as a new file rather than replacing the existing one.

#### Scenario: Editor guidance exists
- **WHEN** an editor reads the CMS runbook's Resource notes
- **THEN** they state that uploads are public even for drafts, forbid confidential documents, require the original in the media archive, and require a new upload instead of Replace media

### Requirement: No public read until the page ships
The Public role SHALL NOT be granted read permission on Resource by this capability. Unauthenticated requests for published or draft Resources SHALL be refused until the frontend change for the Resources page grants published read.

#### Scenario: Anonymous published read is refused
- **WHEN** an unauthenticated client requests `/api/resources`, in either locale
- **THEN** the CMS refuses it

#### Scenario: Anonymous draft read is refused
- **WHEN** an unauthenticated client requests `/api/resources?status=draft`
- **THEN** the CMS refuses it
