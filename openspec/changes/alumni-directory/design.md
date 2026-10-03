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

## launch/alumni (2026-10-03): pages, live fetch, and closing the consent-field exposure

`site-shell` and `publish-integration` have merged, so the Non-Goals about pages and fetching
no longer apply. This section points at existing decisions rather than restating them.

### The exposure

Production grants the Public role `find` on Alumni (`apps/cms/src/draft-guard.ts`; the
permission lives in the database, not in code). Strapi returns every non-private attribute,
so a published alumnus's `consentRecordedAt` and `consentSource` were in the raw public API
response. The mapper's type-level exclusion protected the page, not the API. Proven, not
assumed: the extended `tests/cms-drafts/check.mjs` showed an unauthenticated
`GET /api/alumni` returning both values before the change.

### Decision: `private: true` on both fields

| Option | Closes the API exposure | Manual production step | Portraits |
| --- | --- | --- | --- |
| **`private: true` (chosen)** | Yes, for every Content API caller, including `fields`, `filters` and `sort` (refused with 400, so no blind inference) | None: code-only, shipped by the digest-verified CMS deploy (cms-deploy-digest) | Not shown (below) |
| Remove Public `find`, read with a server-only token | Yes | Yes: a Public role change, a new scoped token, a Vercel variable and a redeploy; until then every build fails | Gated as before |
| A middleware that strips and denies the keys for anonymous callers | Only if every filter, sort and populate path is caught (new security code) | A token, for portraits | Gated, with a token |

`private` is Strapi's own mechanism. It's the smallest change, it needs no production step,
and it's the only option that also closes inference through query filters. It doesn't touch
the admin (editors still see and edit the fields), and `required` still blocks publishing
without them (asserted in the same real-Strapi check).

### Consequence: portraits are not shown

`mapAlumnus` exposes a photo only with consent evidence it can check itself (the decisions
above), and the Content API now never sends that evidence. Every card therefore renders
without a photo. That is the mapper's defined safe behaviour, and `design/content-model.md`
asks for the photo to be "genuinely optional". The gate is kept exactly as specified rather
than weakened to trust the CMS implicitly.

**Open question (task 8.3):** how to show portraits without re-exposing the fields. One
option: a non-private, derived `portraitConsent` boolean set by a lifecycle hook from the
private fields, which would be a schema change. Another: a server-only token reading a
dedicated endpoint.

### Other decisions

- **Privacy canary.** The loader fails the build if any response contains a consent key, so
  a future schema edit that drops `private` is caught loudly instead of passing silently
  through the mapper.
- **Mapper correction.** `photo` is the `shared.image` component, not `{ url }`. The old
  check threw on the real shape, so the first published portrait would have failed every
  build. It is now passed to `toMediaImage` (approved host, dimensions, localized alt).
- **LinkedIn.** Rendered only for an HTTPS URL on `linkedin.com` or a subdomain, without
  credentials. Anything else is dropped silently. The schema's own `^https?://` regex
  allows `http:` and any host.
- **Locale.** The Turkish record supplies `roleHeld` (the only localized field). Without
  one, the English record is shown with `lang="en"` on the role. Non-localized fields are
  shared across locale variants by Strapi.
- **Draft Mode.** No preview branch. Alumni preview stays off, and the preview token is
  never scoped to Alumni (runbook step 7).
- **Sitemap.** Deliberately excluded. ADR 0002's erasure promise is "unpublish; gone within
  one revalidation", and a sitemap actively advertises named former members to crawlers
  whose caches outlive an unpublish. The page stays reachable from the navigation.
  Revisit only with a deliberate decision.
- **Motion:** none. **First-load JS:** Server Components only, measured in the PR.
  **Strapi:** no new field. Two attributes gain `private: true` (no migration), which
  triggers a CMS deploy on merge.
