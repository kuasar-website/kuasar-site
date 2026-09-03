## Purpose

Makes the budgets and rules in ADR 0003 and ADR 0004 mechanically enforced rather than
relied upon: every push to every branch is checked against the workspace's typecheck,
lint, import-graph, weight-budget, static-motion, and locale-parity requirements before
it can be merged.

## ADDED Requirements

### Requirement: Tier A runs on every push and completes in under two minutes
The workspace SHALL run a single automated check suite ("Tier A") on every push to every
branch, without requiring a browser, completing in under two minutes under normal
conditions.

#### Scenario: Push to any branch triggers Tier A
- **WHEN** a commit is pushed to any branch, including a branch that is not yet the
  target of a pull request
- **THEN** Tier A runs automatically and reports a pass/fail result against that commit

#### Scenario: Tier A does not require a browser
- **WHEN** Tier A runs
- **THEN** it completes without launching a browser or browser-automation tool — that
  work is Tier B's, run only on pull requests to `main`

### Requirement: The workspace typechecks with no errors
Every npm workspace present in the repository SHALL typecheck with no errors, using
each workspace's own TypeScript configuration.

#### Scenario: A workspace with a type error fails
- **WHEN** any file in an existing npm workspace contains a type error
- **THEN** Tier A fails and names the workspace and file

#### Scenario: Only the workspaces that exist are checked
- **WHEN** Tier A runs typecheck
- **THEN** it discovers workspaces from the repository's actual npm workspace
  configuration rather than a hardcoded list, so it checks exactly the workspaces
  present at that commit — today `apps/web` only

### Requirement: The workspace lints with no errors
Every npm workspace present in the repository SHALL pass ESLint with no errors.

#### Scenario: A lint violation fails the build
- **WHEN** any file in an existing npm workspace violates a configured ESLint rule
- **THEN** Tier A fails and names the file and rule

### Requirement: GSAP and its plugins are import-restricted to L1 routes via dynamic import
`gsap`, `@gsap/react`, and any GSAP plugin SHALL be importable only from the two
designated L1 route segments (the home hero route and `/[locale]/timeline`), and only
through a dynamic import, never a static one. This is enforced as a lint rule, so a
violation is visible in the editor as well as in Tier A.

#### Scenario: A static GSAP import outside an L1 route fails
- **WHEN** a file outside the two designated L1 route segments contains a static
  `import ... from "gsap"` (or `@gsap/react`, or a GSAP plugin)
- **THEN** Tier A fails, identifying the offending file and import

#### Scenario: A static GSAP import inside an L1 route also fails
- **WHEN** a file inside a designated L1 route segment imports `gsap` statically rather
  than via `import(...)`
- **THEN** Tier A fails — the dynamic-import requirement applies inside L1 routes too,
  since first-load JS is capped on L1 routes exactly as on every other route

#### Scenario: A dynamic GSAP import inside an L1 route passes
- **WHEN** a file inside a designated L1 route segment imports `gsap` (or `@gsap/react`,
  or a GSAP plugin) via a dynamic `import(...)`
- **THEN** Tier A does not flag it

#### Scenario: No route currently matches an L1 segment
- **WHEN** Tier A runs against a commit where the `/[locale]` route structure does not
  exist yet (today's state)
- **THEN** the rule is still active and passes vacuously — it has nothing to flag, not
  because it is disabled, but because no file anywhere imports GSAP yet

### Requirement: First-load JS and deferred-animation-chunk budgets are enforced per route
Every route's first-load JavaScript SHALL be checked against the numeric budget
recorded in `apps/web/budgets.json` after a production build, measured as actual gzip
size rather than a raw or uncompressed byte count. The two designated L1 routes'
deferred-animation-chunk size SHALL additionally be checked, gzip-measured the same
way, against their own budget in the same file. Every route other than the two L1
routes is guaranteed to load zero deferred animation-library code by the import
restriction above, not by a numeric scan of that route's dynamic imports in general —
this requirement does not extend to, and does not constrain, a dynamic import unrelated
to the animation library on any route.

#### Scenario: A route exceeding its first-load budget fails
- **WHEN** a production build produces a route whose gzipped first-load JS exceeds the
  budget that applies to it in `apps/web/budgets.json`
- **THEN** Tier A fails and names the route, its measured gzip size, and its budget

#### Scenario: An L1 route exceeding its deferred-animation-chunk budget fails
- **WHEN** a production build produces one of the two L1 routes whose gzipped deferred
  animation-library payload exceeds the budget configured for that route in
  `apps/web/budgets.json`
- **THEN** Tier A fails and names the route, its measured gzip size, and its budget

#### Scenario: A non-L1 route cannot acquire a deferred animation-library chunk at all
- **WHEN** a file outside the two designated L1 route segments contains any import —
  static or dynamic — of `gsap`, `@gsap/react`, or a GSAP plugin
- **THEN** Tier A fails via the import-restriction requirement above, before a
  production build could ever produce a deferred animation-library chunk on that route
  to measure — the 0 KB outcome on non-L1 routes is a structural consequence of that
  rule, not a separate numeric scan of every route's dynamic imports

#### Scenario: A non-L1 route's unrelated dynamic import is out of this requirement's scope
- **WHEN** a non-L1 route dynamically imports something that is not `gsap`,
  `@gsap/react`, or a GSAP plugin
- **THEN** this requirement does not flag it — it constrains the animation-library
  deferred payload specifically, not dynamic imports in general

#### Scenario: A route with no explicit budget entry falls back to the site-wide default
- **WHEN** a production build produces a route that does not match either named L1
  budget entry (home or timeline)
- **THEN** its first-load JS is checked against the site-wide default budget, so a
  newly added route is covered without an `apps/web/budgets.json` edit; it is not
  subject to a deferred-animation-chunk check at all, since that check applies only to
  the two named L1 entries

#### Scenario: Today's single scaffolded route is checked under the default budget
- **WHEN** Tier A runs against a commit where only the Next.js scaffold's default `/`
  route exists (today's state, before locale routing lands)
- **THEN** it is measured and checked against the site-wide default budget, exercising
  the same code path that will apply to every future non-L1 route

#### Scenario: An L1 route's deferred chunk that itself loads further chunks counts all of them
- **WHEN** an L1 route's deferred payload dynamically loads a chunk which itself
  dynamically loads one or more further chunks
- **THEN** every chunk in that chain is included in the measured deferred-animation-chunk
  size, not only the one loaded directly from the route's first-load code

#### Scenario: A chunk reachable by more than one path is counted once
- **WHEN** the same deferred chunk is reachable from an L1 route's first-load code by
  more than one reference path
- **THEN** its size is counted exactly once toward that route's measured total

#### Scenario: A cyclic reference between chunks is measured safely
- **WHEN** two or more chunks reachable from an L1 route's deferred payload reference
  each other, directly or indirectly
- **THEN** the measurement still completes, each such chunk is still counted exactly
  once, and Tier A does not hang or fail from the cycle itself

#### Scenario: A missing build-measurement artifact is a compatibility failure, not a pass
- **WHEN** the build output this measurement depends on is absent after a production
  build that otherwise succeeded
- **THEN** Tier A fails with an error naming this a compatibility/infrastructure
  failure, distinct from a budget-exceeded failure, and no route is treated as having
  passed its budget

#### Scenario: An unexpected shape in that build artifact is also a compatibility failure
- **WHEN** the build-measurement artifact exists but does not match the shape this
  check expects (a missing or wrong-typed field, for any route entry)
- **THEN** Tier A fails with a compatibility/infrastructure error naming what did not
  match, rather than skipping the check or passing the route

#### Scenario: A referenced chunk that does not exist on disk is a compatibility failure
- **WHEN** the build-measurement artifact, or a chunk discovered while tracing deferred
  references, names a file that does not exist at the expected build output location
- **THEN** Tier A fails with a compatibility/infrastructure error naming the missing
  file, and does not treat the missing contribution as zero bytes

#### Scenario: A Next.js version other than the one this measurement is verified against fails
- **WHEN** the installed Next.js version does not match the version this budget
  measurement was verified against
- **THEN** Tier A fails with an error stating that this measurement must be
  re-verified against the newly installed version before it can be trusted again

#### Scenario: A budget failure names enough to debug without reading the checker's code
- **WHEN** Tier A reports a first-load or deferred-animation-chunk budget failure for a
  route
- **THEN** the report names the route, which budget was exceeded, the configured limit,
  the measured total, every emitted file that contributed to that total, and each
  file's individual contribution — enough that a contributor can find the offending
  code without inspecting the checker's implementation or the build output by hand

#### Scenario: A compatibility failure reads differently from a budget failure
- **WHEN** Tier A fails for any of the compatibility/infrastructure reasons above
  (missing artifact, shape mismatch, missing referenced file, version mismatch)
- **THEN** the failure is visibly distinguishable from an ordinary budget-exceeded
  failure, so a contributor does not mistake "the measurement broke" for "the route is
  too heavy"

### Requirement: Every CSS animation or transition has a reduced-motion counterpart
Any stylesheet declaring `animation:` or `transition:` SHALL also declare a
`@media (prefers-reduced-motion: reduce)` block. Any GSAP code SHALL branch through
`gsap.matchMedia()` with a reduced-motion case.

#### Scenario: A transition with no reduced-motion block fails
- **WHEN** a stylesheet declares `transition:` or `animation:` and contains no
  `@media (prefers-reduced-motion: reduce)` block anywhere in the file
- **THEN** Tier A fails and names the file

#### Scenario: GSAP code with no matchMedia reduced-motion branch fails
- **WHEN** a file imports GSAP and calls a tweening or timeline API without going
  through `gsap.matchMedia()` with a reduced-motion branch
- **THEN** Tier A fails and names the file

#### Scenario: No stylesheet declares any animation yet
- **WHEN** Tier A runs against a commit where no stylesheet declares `animation:` or
  `transition:` (today's state — `apps/web/app/globals.css` has neither)
- **THEN** the check passes, having found nothing to require a reduced-motion block for

### Requirement: GSAP contexts and ScrollTriggers are cleaned up on unmount
Any file importing GSAP SHALL either use `useGSAP` from `@gsap/react`, or pair
`gsap.context(` with a matching `.revert()` call.

#### Scenario: A GSAP import with neither cleanup pattern fails
- **WHEN** a file imports `gsap` and contains neither a `useGSAP` call nor a
  `gsap.context(` paired with `.revert()`
- **THEN** Tier A fails and names the file

#### Scenario: useGSAP usage passes
- **WHEN** a file imports GSAP and calls `useGSAP` from `@gsap/react`
- **THEN** Tier A does not flag it

### Requirement: No animation of layout-triggering properties
CSS transitions and keyframe animations SHALL be restricted to an allow-list of
properties that do not trigger layout or paint (`transform` and `opacity`), never
`width`, `height`, `margin`, `padding`, `top`, or `left`.

#### Scenario: A transition on a disallowed property fails
- **WHEN** a stylesheet declares `transition-property` or a `@keyframes` block that
  names `width`, `height`, `margin`, `padding`, `top`, or `left`
- **THEN** Tier A fails and names the file and property

#### Scenario: A transition on transform or opacity passes
- **WHEN** a stylesheet declares `transition-property: transform` or
  `transition-property: opacity` (or both)
- **THEN** Tier A does not flag it

### Requirement: Animation durations resolve to design tokens, never literals
Any `transition-duration` or `animation-duration` declaration SHALL reference a
`var(--duration-*)` custom property rather than a literal time value.

#### Scenario: A literal duration fails
- **WHEN** a stylesheet declares a literal time value (e.g. `200ms`, `0.3s`) in
  `transition-duration`, `animation-duration`, or the shorthand `transition`/`animation`
  properties
- **THEN** Tier A fails and names the file and the literal value found

#### Scenario: A token-referenced duration passes
- **WHEN** a stylesheet declares `transition-duration: var(--duration-base)` (or any
  other `--duration-*` token)
- **THEN** Tier A does not flag it

#### Scenario: No stylesheet declares any duration yet
- **WHEN** Tier A runs against a commit where no stylesheet declares a duration at all,
  and `--duration-*` custom properties are not yet emitted anywhere (today's state,
  before the design-tokens change lands)
- **THEN** the check passes, having found no literal duration to flag — it is not yet
  exercising the "reference resolves to a real token" half of the rule, only the
  "no literal value" half

### Requirement: Every git content directory has both locale files, each with a slug
Every directory directly under `content/*/` (one per Mission or Timeline Entry) SHALL
contain both `en.mdx` and `tr.mdx`, and each SHALL declare a non-empty `slug` in its
frontmatter.

#### Scenario: A content directory missing one locale file fails
- **WHEN** a directory under `content/*/` contains `en.mdx` but not `tr.mdx` (or vice
  versa)
- **THEN** Tier A fails and names the directory and the missing file

#### Scenario: A locale file with no declared slug fails
- **WHEN** a directory under `content/*/` contains both locale files, but one of them
  declares no `slug` in its frontmatter (or an empty one)
- **THEN** Tier A fails and names the directory and the file missing its slug

#### Scenario: A locale file with status "incomplete" still requires a slug
- **WHEN** a locale file declares `status: incomplete` in its frontmatter
- **THEN** it must still declare a non-empty `slug` — `status: incomplete` licenses a
  placeholder body, per `design/i18n.md`, never a missing route

#### Scenario: A fully matched content directory passes
- **WHEN** a directory under `content/*/` contains both `en.mdx` and `tr.mdx`, each
  declaring a non-empty `slug`
- **THEN** Tier A does not flag it

#### Scenario: Many content directories are each checked independently
- **WHEN** the repository contains more than one directory under `content/*/`
- **THEN** each is checked against the same rule independently, and one directory
  failing does not suppress reporting on the others

#### Scenario: No git content directories exist yet
- **WHEN** Tier A runs against a commit where `content/` does not exist at all (today's
  state, before the content pipeline lands)
- **THEN** the check passes vacuously — there is nothing to check, and its absence is
  not itself a failure

### Requirement: The pull request template names every declaration Tier A cannot check
The pull request template SHALL require the screen-recording attachment and the three
per-animation declarations (motion tier and route, the reduced-motion experience, the
mobile fallback) for any pull request that changes motion, since none of these are
things Tier A (or any automated gate) can verify.

#### Scenario: The template already covers the required declarations
- **WHEN** a contributor opens a pull request that changes motion
- **THEN** the template presents the screen-recording checklist item and the three
  motion declarations, matching what ADR 0004 and `design/motion.md` require
