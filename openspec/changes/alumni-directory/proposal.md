## Why

Alumni is Strapi-resident content (`docs/adr/0002-cms.md`; `design/content-model.md`)
already shipped by `cms-platform` (`apps/cms/src/api/alumnus/`). It is also
*"the one part of the KVKK position that is not deferred"*
(`docs/task-assignments.html`): a portrait carries personal data about
someone who has left and cannot easily be re-consented, so the consent gate
is not a nice-to-have layered on top — it has to be structurally impossible
to bypass in the code that decides what the public sees. Nothing consumes
this schema yet. This change builds the typed, consent-safe, testable
foundation; the actual page depends on capabilities that don't exist yet.

## What Changes

- Add a typed mapper (`apps/web/lib/cms/alumni.ts`) from Strapi's Alumni
  response shape into a **public-facing type that has no field for
  `consentRecordedAt` or `consentSource`** — not merely omitted from the
  output object, but structurally absent from the type, so no future edit
  can accidentally start returning them.
- Add the consent gate: a photo is only ever included in the public output
  when both `consentRecordedAt` and `consentSource` are present and
  well-formed on the raw record. A photo that is absent, or present but
  ineligible for that reason, resolves to `photo: null` — it does **not**
  fail the record. Only a structurally malformed photo (present but not a
  `{ url: string }` shape) throws, because that is corrupted data, not a
  consent-workflow gap.
- Add grouping/ordering by `yearLeft`, newest year first, alphabetical
  within a year, with a documented, explicit placement for the entries
  that have no `yearLeft` yet — `docs/task-assignments.html` states the
  goal ("a person who left in 2023 is as findable as one who left last
  month") without prescribing the grouping key, so this is recorded as a
  design decision, not assumed silently.
- Add fixture-based tests: valid records, a missing photo, a present photo
  with missing/invalid consent evidence, malformed data (a required field
  absent, a wrong-typed field, a structurally broken photo), and ordering
  across zero/one/many entries and an unset `yearLeft`.

Out of scope, by design, and blocked on capabilities that do not exist yet:
- **The `/en/alumni`, `/tr/mezunlar` pages, and the card's JSX/CSS** —
  blocked by `site-shell` (Dev 2). No `app/[locale]/` directory exists
  anywhere in the repository (verified directly). Not worked around with a
  placeholder route or unreviewed UI, per the same reasoning already
  applied to `announcements`: UI that can't be checked in a browser
  shouldn't be written yet.
- **Live fetching, a base-URL environment variable, revalidation tags** —
  blocked by `publish-integration` (Dev 4), which has no branch or
  convention anywhere in the codebase yet. This change consumes
  already-fetched Strapi JSON as a parameter; it does not fetch it.
- **The "unpublish removes them within one revalidation" acceptance
  criterion** cannot be verified until both of the above exist — recorded
  as a remaining blocker, not silently dropped.

## Capabilities

### New Capabilities
- `alumni-directory`: typed, consent-safe mapping and grouping/ordering for
  the Alumni content type.

### Modified Capabilities
(none)

## Impact

- **Audience served:** Serves credibility; the alumni section is a normal
  navbar destination, not sponsor/member-CTA-specific.
- **New runtime dependency:** none.
- **Content storage:** touches no storage decision — `Alumnus` is already
  Strapi-resident, defined by `cms-platform`. Reads
  `apps/cms/src/api/alumnus/content-types/alumnus/schema.json`; does not
  modify it.
- **KVKK / consent:** this change is the code that makes the consent
  requirement structural rather than procedural, per
  `docs/adr/0002-cms.md`'s "Known debt: KVKK" — the public type's absence
  of `consentRecordedAt`/`consentSource` fields, and the photo gate, are
  the enforcement mechanism, not documentation about one.
- **Affected code:** `apps/web/lib/cms/alumni.ts` and its tests. Nothing
  under `app/[locale]/`, nothing in `apps/cms/`, nothing in
  `apps/web/lib/strapi/fetch.ts` (Dev 1's file — read, not modified).
- **Blocked, not built here:** page routes and card UI (`site-shell`);
  live-fetch wiring (`publish-integration`); end-to-end unpublish
  verification (needs both).
