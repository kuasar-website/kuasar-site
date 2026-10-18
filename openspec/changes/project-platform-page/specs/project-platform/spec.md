## REMOVED Requirements

### Requirement: No public read until the page ships
**Reason**: The page has shipped (`project-platform-page`). This requirement only held Public read back until then.
**Migration**: Replaced by "Published content is publicly readable, drafts are not" below. A Super Admin grants the Public role `find` on both types; drafts stay refused.

## ADDED Requirements

### Requirement: Published content is publicly readable, drafts are not
The Public role SHALL have the `find` permission on Project Platform and on Platform Project,
and no other permission on either type. Unauthenticated requests SHALL read published
content in `en` and `tr`. Unauthenticated requests for draft content of either type SHALL be
refused.

#### Scenario: Anonymous published read of the page content
- **WHEN** an unauthenticated client requests `/api/project-platform` in a locale with a published entry
- **THEN** the CMS returns that published entry

#### Scenario: Anonymous read when nothing is published in a locale
- **WHEN** an unauthenticated client requests `/api/project-platform` in a locale with no published entry
- **THEN** the CMS answers not found, not forbidden

#### Scenario: Anonymous published read of projects
- **WHEN** an unauthenticated client requests `/api/platform-projects` with zero, one or many published projects
- **THEN** the CMS returns exactly the published projects, and no draft-only project

#### Scenario: Anonymous draft read is refused
- **WHEN** an unauthenticated client requests either type with `status=draft`
- **THEN** the CMS refuses it

#### Scenario: Anonymous writes are refused
- **WHEN** an unauthenticated client tries to create, update, delete or publish either type
- **THEN** the CMS refuses it
