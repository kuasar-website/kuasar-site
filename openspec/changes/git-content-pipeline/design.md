## Context

See `proposal.md` — Why. Constraints that shape this design:

- `docs/adr/0002-cms.md` §3 fixes the directory layout exactly:
  `content/<type>/<entry>/{index.json, en.mdx, tr.mdx}`, facts once in
  `index.json`, slugs in the locale files because slugs are locale-dependent
  by definition.
- `scripts/checks/locale-parity.mjs` (already shipped, Dev 1's file, **not
  modified here**) already enforces, at CI time, that every entry directory
  has both locale files and each declares a non-empty `slug`, using a
  narrow, dependency-free frontmatter scanner. This design's own frontmatter
  parser is independent code but follows the same fail-closed philosophy for
  the same reason: *"a false failure just means reformatting that field; a
  false pass would let a broken route merge."*
- `apps/web/lib/time/date.ts` (Dev 5's `client-time-state`, already shipped)
  exports `parseISO`, which accepts a bare `YYYY-MM-DD` day or a full ISO
  instant with `Z`/offset, and rejects everything else. This is exactly the
  validation `launchDate` (Mission) and Timeline Entry's `date` need, and
  reusing it keeps one definition of "a valid ISO date" instead of two.
- No validation library (zod, yup, valibot, gray-matter) exists anywhere in
  `apps/web/package.json`. Combined with `locale-parity.mjs`'s explicit
  precedent, this design adds none — schema validation and frontmatter
  parsing are both hand-rolled.

## Goals / Non-Goals

**Goals:**
- A single, reusable loading engine parameterized per entity type (Mission,
  Timeline Entry), not two copies of near-identical directory-scanning code.
- Every validation failure throws with a message naming the entry, the
  field, and why — "fails the build, not the page" only works if the error
  is loud and specific.
- The `status: incomplete` marker is available as typed data without this
  capability rendering anything for it.
- Tests prove the zero/one/many and validation-failure behavior without
  requiring real club content or a consuming page to exist yet.

**Non-Goals:**
- Rendering Mission/Timeline Entry pages or the visible incomplete-notice —
  `missions-archive`/`timeline-baseline`'s job, per `proposal.md`.
- Compiling MDX body content into JSX. The loader returns each locale's body
  as a raw string; compiling it is a rendering concern for whichever page
  consumes it, and doing so here would require a new dependency
  (`@mdx-js/mdx` or `next-mdx-remote`) this change has no need to add.
- Real Mission/Timeline Entry content — see `proposal.md`, "What Changes."
- Modifying `scripts/checks/locale-parity.mjs` or `apps/web/lib/time/**` —
  both are read, neither is edited.

## Decisions

### A generic loading engine, parameterized by an entity-specific fact schema

One module (`apps/web/lib/content/entries.ts`) implements directory
scanning, frontmatter parsing, and the zero/one/many contract once. Mission
and Timeline Entry each supply their own fact-validator function (checking
`index.json`'s shape) to that shared engine, rather than each entity type
re-implementing scanning and frontmatter parsing independently. This mirrors
`locale-routing`'s own precedent of one shared primitive multiple call sites
use, rather than duplicating logic per entity.

### Frontmatter parsing stays hand-rolled and narrow, independently of the CI script

`apps/web/lib/content/frontmatter.ts` implements its own `---`-delimited,
flat `key: value` scanner — the same fail-closed shape as
`scripts/checks/locale-parity.mjs` (quoted-scalar handling, YAML
null-spelling rejection, unsupported-indicator rejection), extended to
extract every field a locale file needs (`slug`, `name`/`title`, `summary`,
`status`), not just the two the CI script cares about. This is deliberately
**not** a shared import from `scripts/checks/` — that script lives outside
the `apps/web` workspace, is Dev 1's file, and is CI-only tooling; coupling
a runtime module to it would cross an ownership boundary for no real
benefit, since the two parsers serve different call sites (CI vs. the
Next.js build) and can evolve independently as long as both stay narrow and
fail-closed.

### Two different meanings of "status" are named apart, on purpose

Mission's own `index.json` has a lifecycle `status` field
(`planned | active | flown | retired`, per `design/content-model.md`). A
locale file's frontmatter can *separately* declare `status: incomplete`, an
unrelated concept (translation completeness, per `design/i18n.md`). Reusing
the bare name `status` for both in code would be a real defect waiting to
happen — a future edit could set the wrong one. This design names them
`Mission.status` (the fact) and `LocaleContent.translationStatus` (the
marker) so the two can never be confused at the type level, even though the
frontmatter field itself is still literally named `status:` in the MDX file
(matching the doc's own examples and the CI script's expectation).

### Relative imports inside `lib/content/` use explicit `.ts` extensions

Every other module in `apps/web/lib/` (`segments.ts`, `switcher.ts`,
`date.ts`, …) imports extensionlessly, which is valid and idiomatic under
`tsconfig.json`'s `moduleResolution: "bundler"` and is how Next's own
compiler resolves them. This design's own new files import each other with
explicit `.ts` extensions instead — TypeScript's `bundler` resolution
accepts both forms, but plain `node --test` (used for this capability's
tests, see below) requires the explicit form to resolve a relative import at
all. Scoping this to only the files this capability adds keeps the rest of
the codebase's convention untouched while making this capability's own
modules directly executable by Node without new tooling.

### Tests run via Node's built-in test runner, wired in the same way `test:budgets`/`test:time` already are

`apps/web/lib/content/**/*.test.ts` uses `node:test` and `node:assert`,
matching `scripts/checks/budgets.test.mjs`'s established pattern rather than
introducing a test framework. One line is added to root `package.json`'s
`scripts`: `"test:content": "node --test apps/web/lib/content"` — the same
kind of addition `client-time-state` already made for `test:time` and
`verification-gates` made for `test:budgets`; each capability adds its own
script entry to that file without editing anyone else's line, so this is
not treated as a cross-ownership edit requiring the same caution as, say,
`next.config.ts`.

### The "three files, no code edit" acceptance criterion is demonstrated by a test, not by committed content

The acceptance criterion in `docs/task-assignments.html` — *"Adding a
mission is three files and no code edit — verified by adding one and
listing every file touched"* — is satisfied by a test that writes exactly
three files (`index.json`, `en.mdx`, `tr.mdx`) to a temporary directory
inside the test's own lifecycle, loads them with the unmodified loader, and
asserts the result — rather than by committing a permanent, necessarily
fictional entry into `content/missions/`. This produces the same evidence
(the loader needs no code change to pick up a new entry) without the
content-integrity risk of shipping invented club history into a directory a
future page will render verbatim.

## Risks / Trade-offs

- **`content/missions/` and `content/timeline/` stay empty after this
  change** — nothing to browse, no visual proof beyond the test suite.
  Acceptable: real content is an editorial decision for the club, not an
  engineering one, and inventing placeholder history to make the directory
  look populated is a worse outcome than an honest, empty, well-tested
  pipeline.
- **Two independent frontmatter parsers (CI's and this capability's) could
  drift** if one is changed without the other → mitigated by keeping both
  narrow and by this design documenting the shared philosophy explicitly, so
  a future edit to either has this file to check against. Not unified into
  one shared module because that module would have to live somewhere
  ownership-neutral that doesn't currently exist, and inventing that
  location is outside this change's approved scope.
- **`parseISO` is Dev 5's function, not this capability's** — if
  `client-time-state`'s date contract ever changes shape, this loader's
  validation changes with it without this capability's own review. Accepted:
  the alternative (a second date-parsing implementation) is exactly the
  "two sources of truth" failure mode this whole project's documentation
  keeps warning about.
