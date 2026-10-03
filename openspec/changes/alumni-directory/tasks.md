## 1. Public type and mapper

- [x] 1.1 Create `apps/web/lib/cms/alumni.ts`: declare `PublicAlumni` as
      its own type (`documentId`, `locale`, `name`, `yearJoined`,
      `yearLeft`, `subTeam`, `roleHeld`, `photo`, `linkedinUrl`) — no
      `consentRecordedAt`/`consentSource` field, by construction, not by
      omission from a wider type.
- [x] 1.2 Implement `mapAlumnus(raw: unknown)`: throw, naming the field,
      when `name` is missing or when any present field (`yearJoined`,
      `yearLeft`, `subTeam`, `roleHeld`, `linkedinUrl`, `documentId`,
      `locale`) doesn't match its declared type. `yearJoined`/`yearLeft`/
      `subTeam`/`roleHeld`/`linkedinUrl` are all optional per the actual
      Strapi schema — absent is `null`, not an error.
- [x] 1.3 Validate `subTeam` against the schema's enum
      (`propulsion | avionics | structures | software`) when present.

## 2. Consent-gated photo

- [x] 2.1 Throw if `photo` is present but not `{ url: string }` —
      malformed data.
- [x] 2.2 If `photo` is absent, result is `photo: null`; do not inspect
      consent fields.
- [x] 2.3 If `photo` is present and well-formed, include it only when
      `consentRecordedAt` parses as a valid date (`parseISO` from
      `apps/web/lib/time/date.ts`) and `consentSource` is a non-empty
      string; otherwise `photo: null`. Never throw for this reason.

## 3. Grouping and ordering

- [x] 3.1 Create `groupAndOrderAlumni(entries)`: group by `yearLeft`,
      groups ordered newest year first, entries within a group ordered
      alphabetically by `name`, entries with no `yearLeft` in one group
      placed last.
- [x] 3.2 Works without error on zero, one, and many entries.

## 4. Tests (Node's built-in test runner — no new dependency, matching
      `git-content-pipeline`/`announcements`' established pattern)

- [x] 4.1 A well-formed record with valid consent maps with its photo
      included.
- [x] 4.2 A record with no photo maps with `photo: null` and every other
      field intact.
- [x] 4.3 A record with a photo but missing `consentRecordedAt` maps with
      `photo: null`, record otherwise intact.
- [x] 4.4 A record with a photo but missing `consentSource` maps with
      `photo: null`, record otherwise intact.
- [x] 4.5 A record with a photo and an invalid `consentRecordedAt` maps
      with `photo: null`.
- [x] 4.6 A missing `name` throws.
- [x] 4.7 A wrong-typed optional field (e.g. `yearJoined` as a string)
      throws.
- [x] 4.8 A structurally malformed `photo` (not an object, or no `url`)
      throws even with valid consent fields present.
- [x] 4.9 An invalid `subTeam` enum value throws.
- [x] 4.10 The mapped type has no `consentRecordedAt`/`consentSource`
      property at all (a structural assertion, not just "undefined").
- [x] 4.11 Groups order newest `yearLeft` first; entries within a group
      sort alphabetically; entries with no `yearLeft` form one trailing
      group.
- [x] 4.12 Grouping succeeds on zero, one, and many entries.

## 5. Verification

- [x] 5.1 Add `"test:cms": "node --test apps/web/lib/cms/*.test.ts"` to
      root `package.json`'s `scripts` if not already present (it may
      already exist from `announcements`, on another unmerged branch —
      check before adding, to avoid a conflicting duplicate line). Checked:
      not present on this branch (created from `main`, which doesn't have
      `announcements`' unmerged changes) — added.
- [x] 5.2 Add `"allowImportingTsExtensions": true` to
      `apps/web/tsconfig.json` if not already present, for the same
      reason `git-content-pipeline` and `announcements` each added it
      independently on their own branches. Checked: not present — added.
- [x] 5.3 Run `npm run typecheck`, `npm run lint`, `npm run test:cms`,
      `npm run build -w apps/web`, `npm run check:budgets` — confirm all
      pass with the new files added. Verified: typecheck clean, lint
      clean, 16/16 tests pass, build succeeds, budgets pass (136.0 KB /
      175.0 KB on `/`).
- [x] 5.4 Confirm nothing under `app/[locale]/`, `apps/cms/`, or
      `apps/web/lib/strapi/fetch.ts` was created or modified. Confirmed
      via `git status`/`git diff --stat`.

## 6. Pages, live fetch and the consent-field exposure (`launch/alumni`, 2026-10-03)

`site-shell` and `publish-integration` have merged. Design: "launch/alumni" in design.md.

- [x] 6.1 `app/[locale]/(alumni)/` pages, `/en/alumni` and `/tr/mezunlar`, in the
      events/schedule/news shape (static, `dynamicParams = false`, `revalidate = false`,
      `sectionAlternates("alumni", …)`), and the card UI (`components/alumni/`): grouped by
      `yearLeft` via `groupAndOrderAlumni`, localized `roleHeld` and sub-team labels, years,
      an HTTPS `linkedin.com` link only, and an explicit empty state. The photo is optional
      and renders only when `mapAlumnus` lets it through.
- [x] 6.2 Live fetch: `lib/cms/alumni-data.ts` `fetchAlumniData()` via `strapiRead()` with
      tag `alumni-directory` (= `CACHE_TAGS.alumni`, asserted in its test): published only,
      every page, drafts skipped, Turkish record for `roleHeld` with silent English
      fallback. **No Draft Mode branch.**
- [ ] 6.3 The "unpublishing removes them within one revalidation" criterion. Covered by the
      shared `/api/revalidate` path (tag `alumni-directory`). Still to verify live after
      merge (8.2).
- [x] 6.4 **The consent-field exposure is closed.** `consentRecordedAt` and `consentSource`
      are `private: true` in the alumnus schema. Real Strapi 5.52.3 (`tests/cms-drafts/
      check.mjs`, extended) proves they're absent from Public and API-token list,
      single-entry and `populate=*` responses. A `fields`, `filters` or `sort` on them is
      refused with 400, and right and wrong filter guesses are indistinguishable. They stay
      readable server-side, and publishing without them still fails. Before the change,
      the same check showed an unauthenticated `GET /api/alumni` returning both values.
- [x] 6.5 A privacy canary in the loader: a consent key in any Content API response fails
      the build, naming the field and never printing its value. Proved end to end by a build
      that must fail in `tests/alumni/check-routes.mjs`.
- [x] 6.6 `mapAlumnus` corrected to the actual schema: `photo` is the `shared.image`
      component (it threw on the real shape), rendered through `toMediaImage`. The consent
      gate is unchanged.
- [x] 6.7 Alumni is deliberately **not** in the sitemap (design.md, "launch/alumni"), and
      not in the content snapshot (ADR 0002, unchanged).
- [x] 6.8 **Page-level `noindex`**, because sitemap exclusion alone doesn't stop indexing of
      pages linked from the navigation (raised in review). Both pages emit
      `<meta name="robots" content="noindex, nofollow"/>`. `robots.txt` deliberately doesn't
      block them, so crawlers can read the directive. Asserted in
      `tests/alumni/check-routes.mjs`: the exact tag on both pages, no other public page
      `noindex`, and `robots.txt` not blocking Alumni.

## 7. Verification (`launch/alumni`)

- [x] 7.1 Unit tests: `lib/cms/alumni.test.ts` and `lib/cms/alumni-data.test.ts` (Tier A
      `test:cms`).
- [x] 7.2 `tests/alumni/check-routes.mjs` (Tier B alumni, `.github/workflows/tier-b-alumni.yml`)
      and the extended `tests/cms-drafts/check.mjs` (Tier B CMS drafts, which runs on any
      `apps/cms` change). Neither is a required gate. **Tier A** covers typecheck, lint, the
      unit tests, the build and budgets. **No CI gate checks production Strapi;** that is 8.1.

## 8. After merge (live; manual)

- [ ] 8.1 The CMS deploy that this merge triggers is green (digest, `/_version`, `/_health`,
      draft 403). Then, in production, an unauthenticated
      `GET /api/alumni?fields[0]=consentSource` returns 400, and the list contains no
      consent key once a record exists.
- [ ] 8.2 `/en/alumni` and `/tr/mezunlar` return 200 with the correct `lang` and the empty
      state, reachable from the navigation. Publish a test alumnus (en and tr role): it
      appears with no consent field anywhere and no photo. Unpublish: it disappears from
      both. Delete it.
- [ ] 8.3 **Product decision, not a bug:** how portraits can be shown again without
      re-exposing the consent fields (design.md, "launch/alumni", Open question).
