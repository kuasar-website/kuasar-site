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

## 6. Explicitly blocked — not attempted

- [ ] 6.1 **Blocked by `site-shell`:** `app/[locale]/(alumni)/` pages and
      the card's JSX/CSS. No `app/[locale]/` directory exists yet; not
      created here, not even as a placeholder.
- [ ] 6.2 **Blocked by `publish-integration`:** live fetch function, base
      URL, revalidation tags. No such convention exists anywhere in the
      codebase yet; not invented here.
- [ ] 6.3 **Blocked, needs both above:** the "unpublishing removes them
      within one revalidation" acceptance criterion — cannot be verified
      without a live page and a real revalidation path.
