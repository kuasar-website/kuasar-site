## ADDED Requirements

### Requirement: Draft content is readable through the Content API only with an API token
The CMS SHALL refuse, with 403, any Content API request (`/api/…`) that reads draft content
(`status=draft` on a list, single-entry or count read) unless the request is authenticated
with a Strapi API token. This SHALL apply to the Public role and to end-user
authentication, for every collection, Alumni included. Reads without `status`, or with
`status=published`, SHALL behave exactly as before. The admin panel, API-token requests and
server-side code without a request SHALL keep full draft access.

#### Scenario: Public list request for drafts
- **WHEN** an unauthenticated request calls `GET /api/schedule-events?status=draft` while a draft-only entry exists
- **THEN** the response is 403 and contains no draft entry

#### Scenario: Public single-entry request for a draft
- **WHEN** an unauthenticated request calls `GET /api/alumni/<documentId>?status=draft`
- **THEN** the response is 403

#### Scenario: Bogus token
- **WHEN** a request sends `Authorization: Bearer <invalid>` with `status=draft`
- **THEN** it receives no draft content (401 or 403)

#### Scenario: Published reads unchanged
- **WHEN** an unauthenticated request calls `GET /api/schedule-events` or adds `?status=published`
- **THEN** the published entries are returned exactly as before, in both locales

#### Scenario: API token reads drafts
- **WHEN** a request authenticated with an API token that has `find` permission calls `GET /api/schedule-events?status=draft`
- **THEN** the draft entries are returned

#### Scenario: Admin panel unaffected
- **WHEN** an Editor opens a draft in the Content Manager
- **THEN** it loads and saves as before
