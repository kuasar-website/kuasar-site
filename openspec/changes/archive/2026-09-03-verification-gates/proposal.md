## Why

Every budget in `docs/adr/0003-motion-stack.md` and every rule in
`docs/adr/0004-verification.md` is currently a wish: nothing measures the import-graph
rule, the weight budgets, the four static motion checks, or git-content locale parity.
`docs/workflow.html`'s own ordering (§08, item 2) says this gate is worth far more before
application code exists than after — retrofitting a budget onto a built site means
deleting work. `platform-foundation` (PR #1, archived) is merged, so this is next on the
Phase 1 critical path per `docs/task-assignments.html`, and it is the load-bearing
dependency for every later change: no other Tier A status check can be made required on
`main` until it has run at least once.

## What Changes

- Add a **GitHub Actions workflow** (`.github/workflows/`) running **Tier A only** on
  every push to every branch, targeting **under two minutes**:
  - `tsc --noEmit` for every npm workspace that currently exists (today, only
    `apps/web` — the workflow must not hardcode `apps/cms`, which does not exist yet).
  - ESLint, including the import-graph rule below.
  - Locale-parity check.
  - Static motion checks 1, 2 and 4 below (see the design.md note on check 3 and 4's
    real coverage today).
  - First-load JS / deferred-animation-chunk budget check against
    `apps/web/budgets.json`.
- Add the **import-graph rule**: `gsap`, `@gsap/react` and any GSAP plugin may be
  imported only from the two designated L1 route segments (the home hero and
  `/[locale]/timeline`), and only via dynamic import. Implemented as an ESLint rule
  enforcing directory-scoped import restrictions (see design.md for the exact rule,
  which reconciles ADR 0004's wording against what ESLint's built-in
  `no-restricted-imports` actually supports).
- Add **`apps/web/budgets.json`** as the machine-readable source of truth for first-load
  JS (every route) and deferred-animation-chunk (the two L1 routes only) budgets,
  matching `design/motion.md`'s table exactly, plus the script that enforces it against
  a production build. Next.js 16 removed the build metric this budget was originally
  meant to read (see design.md's Decision), so the script is an explicitly-labeled,
  version-pinned compatibility mechanism against Next.js 16.3.1's build output — not an
  ADR change, and not a silent redefinition of the budget. It is covered by its own
  deterministic Node fixture-test suite (no browser stack) independent of any real
  build.
- Add the **four static motion checks** from ADR 0004: reduced-motion path exists beside
  every `animation`/`transition`; GSAP cleanup via `useGSAP` or
  `gsap.context(...).revert()`; no layout-property animation (Stylelint allowlist);
  durations resolve to `var(--duration-*)`, never literals.
- Add the **git-content locale-parity check**: every directory under `content/*/*/` has
  both `en.mdx` and `tr.mdx`, each declaring a `slug` in frontmatter.
- **`.github/PULL_REQUEST_TEMPLATE.md` already exists** (added in an earlier change) and
  already contains the screen-recording requirement and the three motion declarations
  (tier and route, reduced-motion path, mobile fallback) that ADR 0004 and
  `design/motion.md` require. This change does not recreate it; it only verifies the
  existing template still matches what Tier A enforces, and touches it only if a gap is
  found.

**Explicitly out of scope** — each belongs to a separate, later change per
`docs/task-assignments.html`:
- **Tier B** (Lighthouse, axe-core, motion determinism) — a distinct change,
  `verification-browser-gates`, owned separately and scheduled at Phase 3. Nothing in
  this change touches browser-based checks.
- **Branch protection / the merge-required ruleset.** Configuring `main` to require
  these checks is explicitly a hand-off to a different contributor ("GC"), and can only
  happen after Tier A has run at least once on `main`. This change ends with "tell GC
  Tier A is green," not with a ruleset change.
- Any content under `content/missions/` or `content/timeline/` — locale routing and the
  content pipeline (workflow.html §08, item 3) have not landed yet. The parity check is
  built and tested against synthetic fixtures, not real content, and passes vacuously
  today because no git content directories exist.
- The `/[locale]` route structure itself. Locale routing (item 3) has not landed; the
  import-graph rule's L1 path zones are written against the route paths
  `design/motion.md` specifies for when that structure exists, and cannot be exercised
  end-to-end against a real route until then.
- Design tokens as real CSS custom properties (item 4, still ahead of this change per
  `docs/workflow.html`'s own ordering table). The duration-token check is written now
  but has nothing to enforce yet — `apps/web/app/globals.css` contains no
  `transition`/`animation` declarations today, and `var(--duration-*)` does not exist as
  a real custom property until the design-tokens change lands.
- GSAP itself is not installed by this change. ADR 0003 defers the library install to
  the L1 signature change. The import-graph rule and cleanup checks target the import
  specifiers `gsap` / `@gsap/react` regardless of whether the package is installed.

## Capabilities

### New Capabilities
- `verification-gates`: the Tier A CI contract — what must be true about the workspace
  (typecheck, lint, import graph, budgets, the four static motion checks, locale parity)
  for a push to pass, independent of which application code exists yet.

### Modified Capabilities
None. `platform-foundation` (installability, buildability, the Strapi fetch wrapper) is
unaffected — this change adds a gate that checks the workspace, it does not change what
the workspace does.

## Impact

- **Serves credibility only.** No sponsor- or member-facing behavior changes; this
  protects future audience-facing quality against silent regressions.
- **No new runtime dependency.** Everything added ships to CI/tooling only — ESLint
  config and plugins, Stylelint and a config, and Node scripts run in CI — nothing here
  is bundled to the browser, so no ADR is triggered.
- **New devDependencies** (settled in design.md, not left open): `stylelint`, a base
  Stylelint config (e.g. `stylelint-config-standard`), `postcss-value-parser`, and
  `postcss` — the last two as explicit direct dependencies since a repository-local
  Stylelint plugin and a reduced-motion Node script import them directly, rather than
  relying on Tailwind v4's transitive copy. **No new ESLint plugin.** ADR 0004 names
  `no-restricted-imports` with "path zones," which core ESLint doesn't literally
  support — design.md resolves this with two core-ESLint rules (`no-restricted-imports`
  plus `no-restricted-syntax`) and a flat-config file-glob override, needing no
  additional package. The locale-parity script and the budget checker also add no new
  dependency: a dependency-free frontmatter scanner narrowly scoped to the two fields
  the gate needs, and Node's built-in `zlib`/`fs`/test runner for the budget mechanism.
- **New files**: `.github/workflows/` (Tier A workflow), `apps/web/budgets.json`,
  ESLint config changes in `apps/web/eslint.config.mjs`, a new Stylelint config plus a
  repository-local Stylelint plugin, Node scripts for the checks ESLint/Stylelint
  cannot express directly (locale parity, budget enforcement, reduced-motion
  existence), and a `node --test` fixture suite covering the budget checker's pass/
  fail/compatibility-error behavior deterministically, independent of any real build.
- **Affected code**: none yet — no application routes or components exist for these
  checks to run against beyond the Next.js scaffold's default page, so most checks pass
  vacuously at first. That is expected and is called out per-check in design.md, not
  hidden.
