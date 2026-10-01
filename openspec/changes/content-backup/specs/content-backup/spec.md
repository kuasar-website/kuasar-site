## Purpose

Gives this project a weekly, on-demand-triggerable export of Strapi's published, non-Alumni content into the `content-snapshots` branch, so the handover safety `docs/adr/0002-cms.md` decision 2 promises actually exists, in a form a successor with no Strapi experience can inspect and trust.

## ADDED Requirements

### Requirement: The workflow file lives on `main`
The content-snapshot workflow file SHALL exist at `.github/workflows/content-snapshot.yml` on the `main` branch. It SHALL NOT be triggerable on a `schedule` from any other branch.

#### Scenario: Scheduled trigger fires from the default branch
- **WHEN** the workflow's `schedule` trigger fires
- **THEN** it runs the version of the workflow file committed on `main`, per GitHub's own scheduled-workflow behavior

### Requirement: Snapshots land only on `content-snapshots`, never on `main`
The workflow SHALL commit and push generated snapshot files only to the `content-snapshots` branch. It SHALL NOT commit or push to `main`, and SHALL NOT trigger a production deploy as a side effect of running.

#### Scenario: A successful run does not touch main
- **WHEN** the workflow completes successfully
- **THEN** `main`'s HEAD commit is unchanged, and no Vercel or DigitalOcean deploy is triggered by this workflow

#### Scenario: Snapshot commit lands on the dedicated branch
- **WHEN** the workflow completes successfully
- **THEN** `content-snapshots`'s HEAD commit contains the freshly generated `content/_snapshots/**` files

### Requirement: Only published entries are exported
The export SHALL include only entries whose publish `status` is `published`, for every locale, for every included content type. It SHALL NOT include any entry whose only existing version is a draft.

#### Scenario: A draft-only entry is absent from the snapshot
- **WHEN** an entry has been created or edited but never published
- **THEN** no snapshot file contains that entry, in either locale

#### Scenario: A published entry with a newer unpublished draft exports the published version
- **WHEN** a published entry has since been edited in draft, and the draft has not been published
- **THEN** the snapshot contains the entry's last-published version, not the pending draft edit

### Requirement: The Alumni content type is excluded entirely
No Alumni entry, in any form, in any locale, in any state, SHALL ever be written to a snapshot file or committed to the `content-snapshots` branch. This applies to the entire entity, not only its consent fields.

#### Scenario: Alumni never appears in any snapshot file
- **WHEN** any snapshot file under `content/_snapshots/` is inspected, for any content type
- **THEN** no Alumni record, field, or reference to one appears anywhere in it

#### Scenario: A relation pointing at Alumni is dropped, not exported
- **WHEN** an included content type's schema is ever changed to add a relation targeting Alumni
- **THEN** the export drops that relation's value from the affected entries and logs a warning in the job's own output, and the Alumni-side data is still never written to any snapshot file

### Requirement: Weekly schedule plus manual dispatch
The workflow SHALL run on a weekly `schedule` trigger and SHALL also support `workflow_dispatch` for an on-demand run.

#### Scenario: A manual run is available
- **WHEN** a repository collaborator opens the Actions tab for this workflow
- **THEN** a "Run workflow" control is available, independent of the schedule

### Requirement: The published-only and no-Alumni filters cannot be relaxed for restore convenience
Neither the published-only filter nor the Alumni exclusion SHALL ever be configurable, parameterized, or bypassable via workflow input, environment variable, or script argument. Restoring is documented as harder without them; that is accepted, not fixed by weakening the export.

#### Scenario: No input exists to include drafts or Alumni
- **WHEN** the workflow is triggered manually via `workflow_dispatch`
- **THEN** no available input can cause drafts or Alumni entries to be exported

### Requirement: Snapshot format is deterministic, human-readable JSON with a defined empty state
Each included content type SHALL be serialized to its own JSON file under `content/_snapshots/`, named after the content type's `pluralName`, with object keys in a fixed sorted order so identical content produces a byte-identical file across runs. A content type with zero published entries in a locale SHALL still produce a file containing an empty array, never an omitted file.

#### Scenario: Re-running against unchanged content produces an identical file
- **WHEN** the workflow runs twice with no intervening content change
- **THEN** the two runs' snapshot files for a given content type are byte-identical

#### Scenario: A content type with nothing published still has a file
- **WHEN** a content type has zero published entries
- **THEN** its snapshot file exists and contains `[]`, not a missing file

### Requirement: Relations reference stable identifiers; every media attribute reference is public-URL-only
A relation from one included content type to another SHALL be stored as the related entry's `documentId`, never the database's internal numeric id. Every media-bearing attribute — whether a `shared.image` component field or a direct media attribute with no component wrapper — SHALL store only the same public `media.<DOMAIN>` URL the live site already serves, plus any required alt text the schema defines alongside it — never a raw R2 endpoint, bucket name, binary payload, or credential.

#### Scenario: A cross-type relation survives as a documentId
- **WHEN** an entry of one included content type relates to an entry of another included content type
- **THEN** the snapshot records that relation using the related entry's `documentId`

#### Scenario: No binary or credential-bearing media data is present
- **WHEN** any snapshot file's media field is inspected, including a direct media attribute with no component wrapper
- **THEN** it contains only a public `media.<DOMAIN>` URL (with required alt text alongside it where the schema defines one), with no binary payload, R2 endpoint, or credential

#### Scenario: A nested component's own media field is not silently dropped
- **WHEN** an entry has a component whose own attributes include another media-bearing component (a component nested inside a component)
- **THEN** the snapshot includes that nested media reference, not an empty or missing value

### Requirement: Pagination is exhausted; ordering is deterministic regardless of page count
The export SHALL retrieve every published entry of a content type regardless of how many pages the Content API divides them across, and SHALL NOT assume a single request returns the complete set. The final serialized array SHALL be ordered by a stable, content-independent key so that ordering does not depend on how many requests were needed or the order pages happened to arrive in.

#### Scenario: A content type with more entries than one page still exports completely
- **WHEN** a content type has more published entries than the API's default page size
- **THEN** every one of those entries appears in the snapshot, not only the first page's worth

#### Scenario: Ordering is stable across runs regardless of pagination
- **WHEN** the same content type is exported twice, with no content change but a different number of underlying page requests
- **THEN** the resulting snapshot files are byte-identical, per the existing determinism requirement

### Requirement: One content type's export failure fails the entire run without a partial commit
If exporting any single included content type throws an error, the workflow SHALL fail the run and SHALL NOT commit or push any snapshot files for that run.

#### Scenario: A single content-type export error blocks the whole run
- **WHEN** the export step throws while processing any one included content type
- **THEN** the job exits with a non-zero status and `content-snapshots` is not updated

### Requirement: Concurrent runs cannot race or overwrite each other
The workflow SHALL use a concurrency group so that a run already in progress is never overtaken by a second push from an overlapping run.

#### Scenario: An overlapping manual run queues instead of racing
- **WHEN** a manual run is triggered while a scheduled run is still in progress
- **THEN** the second run waits for the first to finish rather than pushing concurrently

### Requirement: No secret or credential appears in a snapshot file or workflow log
No database connection string, API key, or other credential SHALL appear in any committed snapshot file or in the workflow's own log output. No snapshot filename or commit message SHALL be derived from entry content.

#### Scenario: Workflow logs contain no connection string
- **WHEN** the workflow's run log is inspected
- **THEN** no database URL, API key, or Strapi secret value appears anywhere in it

#### Scenario: Filenames and commit messages are fixed, not content-derived
- **WHEN** the commit made by this workflow is inspected
- **THEN** every file path matches a fixed, code-defined name, and the commit message matches a fixed template — neither is built from any entry's own field values

### Requirement: A restore preserves the exact slug recorded in the snapshot
When a snapshot entry's `slug` (a `uid`-typed field) is restored, the restore procedure SHALL set that exact value rather than allow it to be regenerated from the entry's title.

#### Scenario: A restored Announcement keeps its original slug
- **WHEN** an Announcement entry is restored from a snapshot
- **THEN** the restored entry's `slug` matches the snapshot's recorded value exactly, not a freshly generated one

### Requirement: Handover documentation matches the implemented behavior
`docs/HANDOVER.md` and `docs/ops/cms-runbook.md` SHALL state, accurately, where backups live, how to trigger one manually, how a restore is performed, and who is responsible for the existing monthly liveness check.

#### Scenario: A new maintainer can find and verify the backup unaided
- **WHEN** someone who has never seen this project reads `docs/HANDOVER.md` and `docs/ops/cms-runbook.md`
- **THEN** they can locate the `content-snapshots` branch, trigger a manual run, understand the documented restore procedure, and identify who checks monthly liveness, without asking anyone
