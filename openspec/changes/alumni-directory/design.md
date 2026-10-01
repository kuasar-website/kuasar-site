## Context

See `proposal.md` — Why. Facts checked directly, not assumed:

- **`apps/cms/src/api/alumnus/content-types/alumnus/schema.json`** (already
  shipped by `cms-platform`) is the actual, current contract — read
  directly rather than trusted from `design/content-model.md`'s summary
  table. It marks only `name`, `consentRecordedAt`, and `consentSource` as
  `required: true`. `yearJoined`, `yearLeft`, `subTeam`, `roleHeld`,
  `photo`, and `linkedinUrl` are all schema-optional, even though
  `design/content-model.md`'s prose reads as if `yearJoined` were always
  present. Where the two disagree, the shipped schema — an executable
  contract Strapi itself enforces — wins over the prose summary, the same
  precedence this project's ADRs already establish for other cross-
  document conflicts.
- `roleHeld` is localized (`pluginOptions.i18n.localized: true`); `name`,
  `yearJoined`, `yearLeft`, `subTeam`, `photo`, `linkedinUrl` are not.
- Strapi's own `required: true` is enforced through the admin Content
  Manager at publish time, per `design/content-model.md`'s own claim that
  "an editor physically cannot publish a portrait without recording where
  consent came from." This design does not rely on that claim holding for
  every path data could reach this mapper (a bulk import, a future schema
  change, an API call that bypasses the admin UI) — the consent gate below
  is enforced again, independently, in application code.
- Reuses `parseISO` from `apps/web/lib/time/date.ts` (Dev 5's, read-only)
  to validate `consentRecordedAt`, matching `git-content-pipeline`'s and
  `announcements`' established precedent of one shared date-validation
  function rather than a second implementation.

## Goals / Non-Goals

**Goals:**
- The public type cannot carry `consentRecordedAt`/`consentSource` even by
  accident — a type-level guarantee, not a runtime omission that a future
  edit could quietly break.
- A missing or consent-ineligible photo degrades gracefully; nothing about
  the KVKK requirement should make an otherwise-complete alumni record
  disappear.
- Grouping/ordering logic that is pure, fully fixture-tested, and works
  without a live Strapi instance, a page, or a fetch strategy.

**Non-Goals:**
- `app/[locale]/(alumni)/` pages or any card JSX/CSS — `site-shell`'s
  territory (Dev 2, not yet proposed; no `app/[locale]/` directory exists
  in the repository at all).
- Live fetching, base-URL/env conventions, revalidation tags —
  `publish-integration`'s territory (Dev 4, not yet proposed; no such
  convention exists anywhere in the codebase, checked).
- Verifying "unpublishing removes them within one revalidation" — needs
  both of the above to exist.
- Editing `apps/cms/src/api/alumnus/**` (Dev 4's shipped schema) — read
  only.
- Re-validating `linkedinUrl`'s `^https?://` format — Strapi's schema
  already enforces this server-side; this mapper only checks it is a
  string when present, to avoid a second, potentially drifting regex.

## Decisions

### The public type is a distinct type, not the raw-response type with two fields deleted

`PublicAlumni` is declared with its own field list — it does not extend or
`Omit<>` a broader "raw Alumnus" type that includes the consent fields.
`Omit<>` would still let a future edit re-widen the base type and forget to
re-apply the omission at every call site; a type with no such fields at all
cannot leak them regardless of how the mapper's implementation changes
later.

### The photo gate is evaluated after independently validating photo shape and consent shape

`mapAlumnus` validates three things about the photo/consent trio
independently, in this order, so the reason for `photo: null` is always one
of "there was no photo" or "there was a photo but consent was missing/
invalid" — never conflated:

1. If `photo` is present but not `{ url: string }`, throw — malformed data.
2. If `photo` is absent, the result's `photo` is `null`; consent fields are
   not even inspected, since there is nothing to gate.
3. If `photo` is present and well-formed, include it only if
   `consentRecordedAt` parses as a valid date (via `parseISO`) and
   `consentSource` is a non-empty string; otherwise `photo` is `null`.

The public output never reveals *why* a photo is absent — a consumer
should not be able to distinguish "never uploaded" from "consent missing"
from the public API, which keeps the KVKK-sensitive detail out of anything
downstream that might log or expose it.

### Grouping by `yearLeft`, an explicit design decision

`docs/task-assignments.html` states the goal (departure year should not
determine findability) without naming a grouping key. Grouping by
`yearLeft` — newest first, alphabetical within a year, an "unset" group
placed last — is this design's own choice, recorded here so a future
reviewer can agree or override it deliberately rather than inheriting an
implicit one. Alphabetical-by-name is the tie-break because it is stable
and requires no additional field.

## Risks / Trade-offs

- **The grouping key is a documented assumption, not a specified
  requirement** → cheap to change if whoever builds the actual card
  disagrees; isolated to one function (`groupAndOrderAlumni`).
- **This change cannot be exercised end-to-end** until `site-shell` and
  `publish-integration` both ship, same limitation already accepted for
  `announcements`. Verification here is fixture-based unit testing only.
- **Trusting the schema over `design/content-model.md`'s prose** could be
  wrong if the schema itself has a bug relative to intent → flagged here
  explicitly rather than silently preferring one source, so it's visible
  in review.
