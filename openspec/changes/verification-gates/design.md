## Context

See `proposal.md` — Why for motivation. This section covers only what shapes the
approach.

**What exists today:** one npm workspace (`apps/web`, a bare Next.js 16.3.1 scaffold —
`app/layout.tsx`, `app/page.tsx`, `app/globals.css` with no animation properties at
all). `apps/cms` does not exist. No `[locale]` route segments exist. No `content/`
directory exists. No stylesheet declares any `transition`/`animation`. `--duration-*`
tokens are documented in `design/tokens.md` but not yet emitted as real CSS custom
properties (that is a later change, workflow.html §08 item 4). `.github/workflows/`
does not exist. `.github/PULL_REQUEST_TEMPLATE.md` already exists and already contains
the screen-recording and three-declaration requirements ADR 0004 asks for — confirmed by
reading it directly; this change does not touch it unless review finds a gap.

**Why several of Tier A's checks pass vacuously at first:** most of what Tier A checks
does not exist yet to violate. That is intentional per `docs/workflow.html`'s own
ordering (§08) — this change is sequenced second specifically so the gate exists before
the code that could trip it. Each requirement in `specs/verification-gates/spec.md`
states its vacuous-pass case explicitly rather than leaving it implicit.

## Goals / Non-Goals

**Goals:**
- Every Tier A gate in ADR 0004 running on every push, in under two minutes, against
  whatever workspaces and files currently exist — no hardcoded assumption about
  `apps/cms`, `[locale]` routes, or `content/` existing yet.
- Each check is forward-compatible: when locale routing, design tokens, or the content
  pipeline land in later changes, the existing checks start exercising their real logic
  without needing to be rewritten.
- No new runtime (browser-shipped) dependency. Everything here is CI/tooling.

**Non-Goals:**
- Tier B (Lighthouse, axe-core, motion determinism) — separate change,
  `verification-browser-gates`.
- Configuring branch protection / the required-status-check ruleset on `main` — a
  hand-off to a different contributor once Tier A has run at least once.
- Building any real `content/` fixtures, `[locale]` routes, or token CSS just to
  exercise these checks end-to-end. They are tested against synthetic fixtures checked
  into the change (e.g. a scratch content directory under a test-fixtures path,
  never under the real `content/`), not against production structure that does not
  exist yet.
- Deciding the L1 signature's implementation technique (ADR 0003 explicitly defers
  this). The import-graph rule's L1 path zones are written against the route paths
  `design/motion.md` names, not against a technique.

## Decision: the first-load JS and deferred-animation-chunk budgets on Next.js 16.3.1 are a version-pinned compatibility mechanism

Next.js 16 removed the `size`/`First Load JS` metrics `next build` used to print. The
official upgrade guide: *"We found these to be inaccurate in server-driven
architectures using React Server Components. Both our Turbopack and Webpack
implementations had issues, and disagreed on how to account for Client Components
payload."* Confirmed firsthand against this repo's pinned build — `next build` prints
no size columns at all. The upstream issue asking for it back (`vercel/next.js#85712`)
is closed **not planned**; Vercel's own recommendation (Lighthouse, Speed Insights) is
browser-based or production-only, not a Tier A mechanism.

**Human implementation decision for this change (resolution (a)): build the numeric
budgets on top of Next.js 16.3.1's actual build output anyway, as an explicitly-labeled
version-pinned compatibility mechanism.** ADR 0004 is not amended and not superseded —
the requirement stands exactly as accepted; this section records how this change
satisfies it on the currently pinned Next.js version, and what must happen if that
version changes.

**Both numeric checks depend on the same version-pinned diagnostics artifact for route
attribution.** `apps/web/.next/diagnostics/route-bundle-stats.json` is undocumented and
internal (no public API doc mentions it; it lives in a folder literally named
`diagnostics`; no stability guarantee) — but it is the only source, documented or not,
that attributes specific emitted chunk files to a specific route at all. Both
mechanisms below start from its `firstLoadChunkPaths` per route; neither is independent
of it. The **first-load** mechanism stops there — it only needs to know which files
count as first load, to gzip-sum them. The **deferred-chunk** mechanism goes one step
further, on top of the same route attribution: since the diagnostics file reports no
deferred-size metric at all (only a first-load byte count), the deferred mechanism
discovers deferred chunks itself by scanning the emitted JS text of files the
diagnostics file already told us are this route's first-load code, rather than relying
on any diagnostics-provided deferred number, because there isn't one.

### First-load JS: gzip-computed, schema-validated, every route

1. **Never trust `firstLoadUncompressedJsBytes` directly** — it's uncompressed, and
   `apps/web/budgets.json` is gzipped KB. The script resolves each of a route's
   `firstLoadChunkPaths` to its emitted file, gzip-compresses the actual contents, and
   sums that per route.
2. **Validate the diagnostics schema explicitly**: must be a JSON array; each entry
   must have a string `route`, a numeric `firstLoadUncompressedJsBytes` (checked as a
   format fingerprint even though its value is never compared to a budget), and a
   non-empty array of string `firstLoadChunkPaths`. Any deviation fails with a named
   schema error.
3. **Fail closed, distinctly, on every incompatibility** — missing diagnostics file,
   schema mismatch, a named chunk that doesn't exist on disk — each its own labeled
   *compatibility/infrastructure* error (distinct from an ordinary budget-exceeded
   failure). None may be read as a zero-byte route; none may pass silently.
4. **Guard the version pin.** The script asserts the installed `next` version matches
   the pinned `16.3.1` before trusting the diagnostics format; a mismatch fails with an
   explicit "this compatibility mechanism is pinned to Next.js 16.3.1 and must be
   revalidated" error. **Any future Next.js version bump requires re-running this
   research and re-verifying the diagnostics schema before trusting the gate again.**

### Deferred-animation-chunk: what the ADR actually scopes it to, verified via two synthetic fixtures — L1 routes only, never a repository-wide dynamic-import ban

**Scope, checked against the authoritative wording, not assumed.** ADR 0004's own Tier
A table names one enumerated CI row, "First-load JS budget" — it does not separately
list a "deferred-animation-chunk" row. Design/motion.md's own "What CI checks" summary
repeats only "per-route first-load JS." What does put the deferred number in CI's
remit: design/motion.md's Weight-budgets section states plainly "CI is authoritative"
directly over the table that defines both the first-load *and* the deferred-animation
column together, and ADR 0003 frames "a separate cap on the deferred animation chunk"
as a real, parallel budget, not an aspirational one. Read together, the deferred number
is in scope — but the column is named **"Deferred animation chunk"**, and
design/motion.md's own reasoning for the figure is entirely GSAP-specific ("fits GSAP
core... plus ScrollTrigger... plus `@gsap/react`, leaving roughly 14 KB for the
sequence's own code"). It is not a budget for "whatever a route happens to dynamically
import," and this change does not build a checker that silently widens it into one.

**Consequence for what gets measured, and where — this is the corrected, final
scoping:**
- **Every route other than the two L1 routes: this verification-gates change performs
  no numeric deferred-animation-chunk scan.** The import-graph rule alone is the
  entire enforcement outside L1 in this change — it makes a static *or dynamic* import
  of `gsap`/`@gsap/react`/a GSAP plugin from any non-L1 file fail Tier A directly,
  before a build could ever produce an animation-derived deferred chunk there to
  measure. This is a genuine structural guarantee, not an approximation: if the import
  never happened, the chunk never exists. A route dynamically importing something
  **unrelated** to the animation library is explicitly **out of scope** for this
  requirement and is never scanned, flagged, or counted against any deferred-chunk
  budget — this change does not introduce a repository-wide ban on unrelated dynamic
  imports, and must not be implemented as one.
- **The two L1 routes only: the configured deferred-animation-chunk budget in
  `apps/web/budgets.json` is measured**, using the transitive scan below, over
  whatever is dynamically reachable from that route's first-load code. Under the
  currently accepted architecture, the two L1 routes are the only routes permitted to
  dynamically load the motion library, and no unrelated dynamic imports are currently
  specified or planned for those L1 signatures. Therefore the transitive deferred-JS
  scan is a valid compatibility mechanism for the current planned L1 shape, with the
  explicitly documented obligation to re-verify it if an L1 route later introduces
  unrelated deferred code. **Disclosed limitation:** if an L1 route later gains
  unrelated deferred code, the current scan would also count that code toward the
  animation budget, and must be revalidated at that point — the same class of
  "re-verify against real output" obligation already recorded for the other
  synthetic-fixture-tested checks, inherited by whichever change first builds a real
  L1 route.

**The traversal must be transitive, deduplicated, and cycle-safe — verified
empirically, not assumed.** A second synthetic fixture (a route dynamically importing
a module which itself dynamically imports a second, further module; removed after the
experiment) confirmed that a deferred chunk's own emitted text can contain a further
literal reference to *another* deferred chunk one level deeper — a single-hop scan from
only the route's first-load chunks would have found the first chunk and silently
missed the second entirely. The mechanism is therefore a breadth-first scan starting
from an L1 route's `firstLoadChunkPaths`: scan each chunk's text for quoted
`"static/chunks/<name>.js"` literals not yet visited; add each newly found path to both
the visited set and the traversal frontier; continue until the frontier is empty. The
visited set makes it dedup-safe (a chunk referenced from two places is only measured
once) and cycle-safe (two chunks referencing each other terminates once both are
visited, rather than looping). Every discovered path must exist on disk — a reference
to a missing file, at any depth, is the same *compatibility/infrastructure* error
class as the first-load half, not a silent partial sum. The regex is deliberately a
fully quoted, both-quotes-anchored literal, specifically so it can't false-positive on
an unquoted `//# sourceMappingURL=...` comment.

**Both halves stay Tier A, non-browser, and tied to the version pin.** The import-graph
rule remains the primary structural guard exactly as ADR 0004 frames it; both numeric
checks are additional regression gates on top of it, implemented as part of this
change — not relocated to Tier B, not deferred to a later one.

### Testing the checker itself: a lightweight, deterministic Node fixture harness — no browser stack

The budget checker's correctness must not rest on "it worked against today's one real
route." Every budget-checker behavior enumerated by the first-load/deferred-animation
budget scenarios in `specs/verification-gates/spec.md` is covered by a small,
deterministic fixture test, using Node's own built-in test runner
(`node --test`) — no Jest, no Playwright, no real `next build` required for most cases,
since the checker's logic operates on plain JSON and text files that a test can
construct directly:

- A hand-written fake `route-bundle-stats.json` plus fake chunk files under a temp
  directory stand in for a real build, for every case: first-load under/over budget,
  deferred under/over budget on a fake L1 route, a multi-hop chain of chunk-path
  references (transitive), the same chunk referenced twice (duplicate), two chunks
  referencing each other (cycle), a missing diagnostics file, a diagnostics file with a
  field missing or wrong-typed (schema mismatch), a referenced chunk file absent from
  the fixture directory (missing chunk), and a fake installed-version string that
  doesn't match the pin (version mismatch).
- Each of these is a same-shaped, few-line test case: write the fixture files, run the
  checker's measurement function against that temp directory, assert the pass/fail
  outcome and the error category. None require spawning `next build` or a browser.
- The two real synthetic-route experiments run during this planning phase (a single
  dynamic import; a nested one) are not the test suite themselves — they were
  throwaway, manually-run proofs that the *real* Next.js/Turbopack output shape matches
  what the fixture tests assume. The fixture suite is what runs in CI and regresses;
  the real-build experiments were how the fixture's assumptions were validated once,
  by hand, during design.

**Amendment, made explicit during implementation rather than silently reinterpreted:**
the "fake `route-bundle-stats.json`" described above is constructed as an in-memory
JavaScript array and passed directly to `runBudgetCheck({ diagnosticsRaw, ... })`, not
written to a temp file and read back for most test cases. `scripts/checks/budgets.mjs`
was deliberately built so `runBudgetCheck` is a pure function of already-parsed
diagnostics — its own header comment states this — specifically so this suite needs no
file I/O beyond the chunk files a case actually needs to gzip or traverse. Reading
JSON off disk is CLI-layer (`main()`) concern, not measurement-logic concern, so this
suite covers it with exactly one dedicated case that does spawn the real script against
a temp `webDir` with no `.next/diagnostics/` at all (`execFileSync`), for the one
scenario that's genuinely about file *absence* rather than content. Writing and
re-reading an actual `route-bundle-stats.json` file in every other case would be
ceremony around `JSON.parse`/`fs.readFileSync` that the measurement logic itself
doesn't touch and that case already covers directly — it would not exercise anything
the in-memory construction doesn't already exercise. Fake chunk *files* remain real
files under a temp directory in every case, as originally described, since gzip
measurement and the deferred-chunk text scan are genuinely filesystem operations.

### CI diagnostic output: enough to debug without reading the checker or `.next/` by hand

A budget failure names, per route: which budget (first-load or deferred-animation),
the configured limit, the measured gzip total, every contributing emitted chunk path,
and each chunk's individual gzip contribution. For a deferred-chunk failure, the report
also states how each chunk was discovered (directly referenced from the route's own
first-load code, or reached transitively through another named chunk), so a
contributor can follow the chain rather than being told only a final number.

A compatibility/infrastructure failure (missing artifact, schema mismatch, missing
referenced file, version mismatch) is visibly, formattedly distinct from a
budget-exceeded failure in the same log — different label/heading, not just different
wording in a similar-looking line — so a contributor scanning CI output cannot mistake
"the measurement broke" for "the route is too heavy."

## Cross-document reconciliation: Timeline Entry's frontmatter omits `slug`

ADR 0004 states the locale-parity rule as a blanket requirement: "every git content
directory has both locale files and a slug in each." `design/content-model.md`
documents Mission's `en.mdx`/`tr.mdx` frontmatter as `slug`, `name`, `summary` — but
documents Timeline Entry's as `title` and a short body only, with no `slug` field.

Per `CLAUDE.md`'s stated authority order, the ADR wins where the two disagree. **The
gate enforces ADR 0004's rule uniformly: every directory under `content/*/*/`,
Timeline Entry included, must have a non-empty `slug` in both locale files.** This was
already how `specs/verification-gates/spec.md`'s locale-parity requirement was written
from the first draft, since it was written directly against the ADR rather than
against `content-model.md`.

This change does not edit `design/content-model.md` — per
`docs/task-assignments.html`, that file's content-shape corrections belong to
`git-content-pipeline`/`timeline-baseline`, neither of which this change is. The
inconsistency is recorded here for those contributors; which authority currently wins
is stated above, and no further fix is prescribed.

## Decisions

### Workflow: a single Tier A job, unfiltered by path, on every push

One `.github/workflows/tier-a.yml` (name open to bikeshedding; not `ci.yml`, to leave
that name free for whatever Tier B or a future combined workflow wants), triggered on
`push` with no branch or path filter — Tier A is deliberately **not** path-filtered,
unlike Tier B, because ADR 0004 requires it on every push to every branch. Steps: 1
checkout, 1 `actions/setup-node` pinned to the `.nvmrc` version with npm cache enabled,
`npm ci`, then the check steps below. Target under two minutes; `npm ci` and Node setup
are most of that budget on a cache hit.

### Workspace discovery: read it, don't hardcode it

Root `package.json` already declares `"workspaces": ["apps/*"]`. Add root-level
`typecheck` and `lint` scripts that delegate via `npm run <script> --workspaces
--if-present`, and add a `typecheck` script (`tsc --noEmit`) to `apps/web/package.json`
(it currently has `dev`/`build`/`start`/`lint` but no `typecheck`). This is the one
place this change edits `apps/web/package.json`; see proposal.md — Impact. Because
`--if-present` skips workspaces missing the script rather than failing, `apps/cms`
landing later needs only its own `typecheck`/`lint` scripts, not a workflow edit.

### The import-graph rule needs no new ESLint plugin

ADR 0004 says "ESLint `no-restricted-imports` with path zones." Read literally, this
doesn't exist: core ESLint's `no-restricted-imports` has no concept of "only allowed
from these paths" — that shape (`zones: [{ target, from }]`) belongs to
`eslint-plugin-import`'s `no-restricted-paths`, a different rule.

The actual requirement decomposes into two independent constraints, both expressible in
plain ESLint flat config with no new plugin:

1. **Static import of `gsap` / `@gsap/react` / any GSAP plugin is disallowed
   everywhere, including inside L1 routes** (design/motion.md's route budgets don't
   exempt L1 from the first-load cap, so a static import is wrong even there). This is
   `no-restricted-imports` (core), applied with no file-glob restriction.
2. **Dynamic `import(...)` of those same specifiers is disallowed everywhere except
   inside the two L1 route segments.** This is a `no-restricted-syntax` (core) rule
   targeting `ImportExpression` nodes whose source matches those specifiers, applied
   globally, then turned off (`"off"`) in a flat-config block scoped to `files: [the
   two L1 route globs]`.

Both rules report in the editor as well as in CI, satisfying ADR 0004's stated reason
for choosing a lint rule over a script. No `eslint-plugin-import` (or `-import-x`)
dependency is needed for this rule. (Revises `proposal.md`'s Impact note, written before
this was worked out — that note is left as originally written rather than edited after
the fact, since it was a reasonable statement of uncertainty at proposal time; this is
where it resolves.)

### GSAP cleanup check: a small local ESLint rule, not a plugin search

No published ESLint rule checks "a file importing GSAP pairs `gsap.context(` with
`.revert()`, or uses `useGSAP`." Write one local rule (a single-file custom rule
registered as a local flat-config plugin, per ESLint's documented mechanism for
project-local rules) rather than searching for a third-party plugin that happens to
cover this narrow, project-specific shape.

### CSS static checks: Stylelint for per-declaration rules, a small script for the file-level one

Three of the four static motion checks are naturally per-declaration (property
allow-list, duration-token-only) and fit Stylelint's rule model; the fourth
(reduced-motion block exists *somewhere in the file* when an animation exists anywhere
in it) is a file-level structural check that doesn't fit a single-declaration rule
well.

- **No layout-property animation** and **durations reference tokens**: researched
  directly against Stylelint's current rules documentation — no built-in rule
  restricts which properties may appear in `transition-property`/`@keyframes`, or
  restricts `transition-duration`/`animation-duration` to `var(...)` references only,
  and none of the closest built-ins (`declaration-property-value-allowed-list`) can
  reliably catch a violation hidden inside shorthand (`transition: width 200ms`), which
  is exactly the failure mode that matters most. Per the decision to prefer a
  repository-local rule over an unrelated third-party plugin when built-ins can't
  express the policy: write a small local Stylelint plugin (two rules) using
  `postcss-value-parser` (added as an explicit direct devDependency, not relied on
  transitively) to tokenize `transition`/`animation` shorthand values and `@keyframes`
  declarations, so a property or duration hidden in shorthand is caught the same as the
  long-hand form.
- **Reduced-motion block exists**: a small Node script using PostCSS to parse each
  stylesheet, check whether it declares any `transition`/`animation`, and if so require
  a `@media (prefers-reduced-motion: reduce)` at-rule somewhere in the same file. Since
  this script imports `postcss` directly, `postcss` is added as an explicit direct
  devDependency rather than relied on transitively through Tailwind v4 — the same
  reasoning applied to `postcss-value-parser` above applies here: a direct import
  should not depend on a version another package happens to pull in.

New devDependencies: `stylelint`, the chosen base Stylelint config (e.g.
`stylelint-config-standard`), `postcss-value-parser`, and `postcss` — plus the
project-specific local plugin/rule configuration described above.

**Scope gap found and closed during implementation: GSAP reduced-motion branch.**
`specs/verification-gates/spec.md`'s "Every CSS animation or transition has a
reduced-motion counterpart" requirement has two scenarios, not one — a CSS scenario
and "GSAP code with no matchMedia reduced-motion branch fails." This "CSS static
checks" decision above, and tasks.md's entire Reduced-motion-block-existence-check
section, only broke the CSS half into a task; the GSAP half was never assigned one.
Confirmed with the user before implementing rather than silently narrowing the check
to only its CSS half, or silently expanding scope without confirmation.

Resolution: a third project-local ESLint rule, `apps/web/eslint-rules/gsap-reduced-
motion.mjs` (registered as `local/gsap-reduced-motion`, alongside `local/gsap-
cleanup` from the GSAP cleanup check above — same mechanism, same reasoning for why a
local rule rather than a plugin search). A file that creates a gsap tween or timeline
must branch through `gsap.matchMedia().add(...)` with a "prefers-reduced-motion"
query actually passed into that call. Two precision requirements shaped the
implementation, both because the obvious naive version would misfire either
direction:

- **Not every `.to()`/`.from()`/`.set()` in a gsap-importing file is a GSAP call.**
  Those method names collide with unrelated APIs (`Map#set`, a state setter, some
  other fluent builder). The rule only recognizes `gsap.to/from/fromTo/set/
  timeline(...)` directly, or the same methods called on an identifier the file
  itself created from `gsap.timeline(...)` — tracked via `VariableDeclarator`
  (`const tl = gsap.timeline()`) as well as recognized when chained directly
  (`gsap.timeline().to(...)`).
- **A "prefers-reduced-motion" string elsewhere in the file does not satisfy the
  rule.** It must actually flow into an `.add(...)` call on a `gsap.matchMedia()`
  instance — tracked the same two ways (by variable, or chained directly) — as
  either a plain query-string argument or a property value inside an options object
  (`{ reduceMotion: "(prefers-reduced-motion: reduce)" }`, GSAP's documented second
  form for `.add()`).

Like every other static motion check, this remains an approximation: it does not
verify the flagged tween is actually *inside* the matched branch, only that both
exist and are wired together in the shape ADR 0004 asks for.

**Decision, resolved during implementation: the duration-token rule positively requires
`var(--duration-*)`, not merely rejects literals.** The spec's scenarios only enumerate
"literal fails" / "token passes," but the requirement text itself ("SHALL reference a
`var(--duration-*)` custom property rather than a literal time value") is a positive
contract, and a rule that only rejects a fixed literal shape would silently pass
anything else unrecognized — a wrong-family token (`var(--space-md)`), a `calc(...)`
expression, or a real transition/animation with no duration component supplied at all
(CSS defaults an omitted duration to `0s`). The rule therefore requires, per
comma-separated group, that a valid `var(--duration-*)` reference actually be present,
with two exceptions: a long-hand `transition-duration`/`animation-duration` value that
is a bare CSS-wide keyword (`inherit`/`initial`/`unset`/`revert`/`revert-layer` —
deferring to the cascade rather than stating a duration), and a shorthand group that
names no real property (`transition`) or animation name (`animation`) at all — `none`,
or a bare CSS-wide keyword — which describes no motion to time.

Long-hand and shorthand are checked with different strictness for exactly this reason:
a long-hand duration declaration has no timing-function slot, so *every* `var(...)`
call in it must be `var(--duration-*)` — `transition-duration: var(--ease-standard)`
is wrong, not exempt. The shorthand does have a legitimate timing-function slot
(`var(--ease-*)`, per `design/tokens.md`), so a `var(--ease-*)` call there is
recognized and excluded from the duration check rather than flagged as a wrong-family
duration token. This still checks nothing about whether the named `--duration-*`
(or `--ease-*`) custom property is actually defined anywhere — that remains pending
the design-tokens change, per this document's Context above — only that the reference
is shaped like the accepted one.

### Locale parity: a dependency-free frontmatter scanner, not a lint rule

Doesn't fit ESLint or Stylelint's model — it walks a content directory tree and reads
only the specific frontmatter fields this gate enforces, not source code or CSS. A
small Node script, run as its own Tier A step:

Walk `content/*/*/`, for each directory require `en.mdx` and `tr.mdx`, and require each
to declare a non-empty `slug` (and, when present, honor `status: incomplete` without
waiving the slug requirement). This needs a **dependency-free scanner**, not a general
YAML/frontmatter library: this gate only ever needs to recognize two fields — a
non-empty scalar `slug`, and `status: incomplete` where present — inside the
`---`-delimited block at the top of a locale file, and can ignore every other
frontmatter field entirely, whatever shape those turn out to have. The scanner matches
only a simple `key: value` line (optionally quoted) for `slug` and for `status`; it
does not parse, validate, or impose any restriction on any other field, and does not
assume no locale file will ever hold a nested or multi-line field for something this
gate doesn't check. If `slug` (or `status`) cannot be confidently parsed in that narrow
accepted form, the scanner fails closed **for that field** — treats the slug as absent
rather than guessing — which is the safe direction: a false failure just means
reformatting that one field to the accepted style; a false pass would let a broken
route merge, which is the entire reason this gate exists. A general YAML/frontmatter
dependency is not introduced unless implementation experience proves the narrow
scanner unreliable. Tested against synthetic fixtures the change adds under a
test-only path, never under real `content/`, which does not exist yet.

`apps/web/budgets.json` mirrors `design/motion.md`'s table exactly:

```json
{
  "default": { "firstLoadKb": 120, "deferredAnimationKb": 0 },
  "routes": {
    "home": { "firstLoadKb": 110, "deferredAnimationKb": 45 },
    "timeline": { "firstLoadKb": 120, "deferredAnimationKb": 45 }
  }
}
```

Route matching is by **pattern**, not by a literal path string frozen before locale
routing exists: `home` matches the route that will become `/[locale]`, `timeline`
matches `/[locale]/timeline`, once those exist. Until then, the build's only route (`/`)
falls through to `default` — exercising the same fallback path a genuinely new,
un-budgeted route will use later (per the spec's "route with no explicit budget entry"
scenario).

## Blocker found during implementation, unresolved: the bare scaffold already exceeds
## the default first-load budget

Confirmed against a fresh `npm run build -w apps/web` on the unmodified scaffold, with
the checker described above, on 2026-09-03:

```
FAIL / (budget: default)
  first-load: 136.0 KB / 120.0 KB budget  *** OVER BUDGET ***
    - static/chunks/3fntmmi971322.js: 3.6 KB
    - static/chunks/3pf0sat3z4mrq.js: 5.6 KB
    - static/chunks/12aruqaur5huj.js: 7.2 KB
    - static/chunks/2epaexi-r3zyk.js: 46.0 KB
    - static/chunks/227kwhsrjlnp4.js: 69.9 KB
    - static/chunks/turbopack-03j1fmb5mbdr7.js: 3.7 KB
FAIL /_not-found (budget: default)
  first-load: 130.3 KB / 120.0 KB budget  *** OVER BUDGET ***
```

**Ruled out before treating this as a real finding rather than a checker bug:** the
build output is genuinely minified (no dev-mode strings, single-line output); `next
build` runs in production mode by default, and `next.config.ts` is the unmodified
scaffold default (no debug flags). `static/chunks/227kwhsrjlnp4.js` (69.9 KB gzip, 224
KB raw) contains React DOM's Fiber reconciler; `static/chunks/2epaexi-r3zyk.js` (46.0 KB
gzip, 174 KB raw) is Next's own client framework runtime. This is the inherent baseline
cost of React 19.2.8 + Next.js 16.3.1's client runtime — present before a single line of
this project's application code exists.

**The measurement method is not in question.** It is exactly what this Decision section
and `spec.md` specify: resolve every `firstLoadChunkPaths` entry to its emitted file,
gzip the actual contents, and sum — not a looser or stricter methodology substituted to
make a number come out differently.

**This is a real, unresolved gap between `design/motion.md`'s accepted 120 KB default /
110 KB home budget and what the settled stack (ADR 0001) actually costs at the
framework floor, discovered here because this change is what first made the budget
mechanically real.** It is not this change's job to resolve — no ADR is amended, no
budget number is adjusted, and `apps/web/budgets.json` is not touched to make this
pass — a static-site verification gate does not get to unilaterally redefine the
performance budget it was built to enforce. `tasks.md`'s 7.9 stays unchecked as a
result: **the accepted task is "confirm it measures that route under the default
budget and passes," and against the real repository right now it does not.** Tier A
therefore cannot be pushed to green until the team (or whoever owns `docs/adr/0003-
motion-stack.md` / `design/motion.md`) makes a call — raise the default/home budgets to
reflect React 19 + Next 16's real floor, or treat it as a problem for whichever change
first adds real application code to solve (route-level code-splitting, trimming
`next.config.ts` defaults, etc.). Either way, that decision — and the ADR/design-doc
edit it requires — belongs to that person, not to this change implementing the gate.

## Risks / Trade-offs

- **The budget-check mechanism rests on an undocumented, version-pinned Next.js
  artifact** (see the Decision above) → accepted deliberately, as a human
  implementation decision, with the risk stated rather than hidden: no stability
  guarantee, gzip-computed rather than trusted at face value, fail-closed on every
  detected incompatibility, and an explicit obligation to re-verify the diagnostics
  schema against any future Next.js version bump before trusting the gate again.
- **A custom local ESLint rule (GSAP cleanup) is maintenance surface a published plugin
  wouldn't be** → accepted; the check is narrow and project-specific enough that no
  published plugin covers it, and the alternative (a bespoke Node/AST script outside
  ESLint) loses the editor-reporting property ADR 0004 explicitly wants.
- **Testing against synthetic fixtures rather than real structure means a check that
  "passes" today could still be wrong against the real shape locale-routing or the
  content pipeline eventually produces** → each later change (locale-routing,
  git-content-pipeline) inherits an obligation to re-verify the relevant Tier A check
  still fires correctly against its real output, not just trust that Tier A is green.
  Worth a line in each of those changes' own tasks.md, not solved here.
- **Five rotating contributors, one of whom wrote three separate small tools (a local
  ESLint plugin, a Stylelint config, two Node scripts) to cover one ADR** → this is
  more moving parts than "just run a linter." Mitigated by keeping every script small,
  single-purpose, and named after the requirement it checks rather than bundled into
  one opaque "verify.js."

## Migration Plan

Additive only — no existing behavior changes, no rollback complexity. If Tier A proves
too slow or too noisy after landing, the workflow can be disabled by removing the
trigger without affecting anything else, since nothing yet depends on it being green
(the branch-protection ruleset is explicitly a later, separate hand-off).

## Open Questions

None remaining. The three questions this section originally raised — the Next.js
budget-measurement mechanism, the Stylelint property/duration-check approach, and the
locale-parity frontmatter-parsing approach — are all resolved above, in the Decision
section and in "CSS static checks" / "Locale parity" respectively, each with the
research that produced the answer.
