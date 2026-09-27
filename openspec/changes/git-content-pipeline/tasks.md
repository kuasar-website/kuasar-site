## 1. Frontmatter parsing

- [x] 1.1 Create `apps/web/lib/content/frontmatter.ts`: a `---`-delimited,
      flat `key: value` scanner extracting named string fields
      (`slug`, `name`/`title`, `summary`, `status`), following
      `scripts/checks/locale-parity.mjs`'s fail-closed philosophy
      (quoted-scalar handling, YAML null-spelling rejection, unsupported-
      indicator rejection) as independent code — not imported from that
      script. Also return the body (everything after the closing `---`).
- [x] 1.2 Throw, with a message naming the file and the missing/malformed
      field, when a locale file has no frontmatter block at all, or when a
      requested required field can't be confidently parsed.

## 2. Entity fact schemas

- [x] 2.1 Define `Mission`'s `index.json` shape and a validator: `id`,
      `year`, `type` (`competition | research | test`), `competition?`,
      `status` (`planned | active | flown | retired` — the mission
      lifecycle field, kept apart from the locale-file translation marker
      below), `launchDate?`, `apogeeMetres?`, `patch`, `gallery`, `links`,
      `team`, per `design/content-model.md`. Validate `launchDate` (when
      present) with `parseISO` from `apps/web/lib/time/date.ts`.
- [x] 2.2 Define Timeline Entry's `index.json` shape and a validator:
      `date`, `kind` (`founding | competition | launch | milestone |
      recognition`), `image?`, `link?`. Validate `date` with the same
      `parseISO`.
- [x] 2.3 Each validator throws, naming the entry and the offending field,
      on a wrong type or a missing required fact — never coerces or
      defaults.

## 3. Generic loading engine

- [x] 3.1 Create `apps/web/lib/content/entries.ts`: given a content-type
      directory name and a fact validator, scan `content/<type>/*/`,
      require `index.json` + `en.mdx` + `tr.mdx` per entry directory, parse
      frontmatter for each locale, and combine into one typed record per
      entry. Return `[]` when the content-type directory does not exist or
      is empty — the zero-entries case, not an error.
- [x] 3.2 Throw when a locale file is missing, or when its `slug` is
      missing or empty — independently of the CI check, as defense in
      depth.
- [x] 3.3 Expose each locale's `status: incomplete` marker as
      `translationStatus` on that locale's content — named apart from
      `Mission.status` (the lifecycle fact) so the two can never be
      confused at the type level.
- [x] 3.4 Do not compile MDX body content — return each locale's body as a
      raw string. Compiling to JSX is a rendering concern for whichever
      page consumes this, not this capability's.

## 4. Public API

- [x] 4.1 Create `apps/web/lib/content/missions.ts` and
      `apps/web/lib/content/timeline.ts`, each a thin call into the shared
      engine (task 3.1) with that entity's own fact validator (task 2),
      exporting a typed `loadMissions()` / `loadTimelineEntries()`.

## 5. Tests (Node's built-in test runner — no new dependency)

- [x] 5.1 Valid loading: a temporary three-file Mission directory
      (`index.json`, `en.mdx`, `tr.mdx`) loads correctly — this is the test
      that demonstrates "adding an entry is three files and no code edit"
      (`docs/task-assignments.html`'s acceptance criterion) without
      committing fictional content to `content/missions/`.
- [x] 5.2 A missing locale file throws.
- [x] 5.3 A missing or empty `slug` throws.
- [x] 5.4 A malformed typed fact (e.g. non-numeric `apogeeMetres`) throws.
- [x] 5.5 A missing required fact (e.g. no `year`) throws.
- [x] 5.6 `status: incomplete` on `tr.mdx` with no status on `en.mdx`
      surfaces as `translationStatus` on the Turkish content only.
- [x] 5.7 Zero entries (content-type directory absent, and separately,
      present but empty) both return `[]`, not an error.
- [x] 5.8 Many entries: a directory with multiple valid entries returns
      all of them.

## 6. Wiring and verification

- [x] 6.1 Add `"test:content": "node --test apps/web/lib/content/*.test.ts"`
      to root `package.json`'s `scripts` — the same pattern already used by
      `test:budgets` and `test:time` (a bare directory path doesn't work
      with `node --test`; it must be given the explicit glob).
- [x] 6.2 Run `npm run typecheck`, `npm run lint`, `npm run test:content`,
      `npm run check:locale-parity`, `npm run build -w apps/web`, and
      `npm run check:budgets` — confirm all pass with the new files added.
      Verified: typecheck clean, lint clean (0 errors/warnings after
      cleaning up test-file destructuring warnings), 32/32 tests pass,
      locale-parity passes vacuously, build succeeds, budgets pass
      (136.0 KB / 175.0 KB on `/`).
- [x] 6.3 Confirm `content/missions/` and `content/timeline/` remain absent
      from the repository (this change adds no real content) and that
      `check:locale-parity` still reports its vacuous pass. Confirmed —
      `check:locale-parity` reports "no content/ directory yet".
