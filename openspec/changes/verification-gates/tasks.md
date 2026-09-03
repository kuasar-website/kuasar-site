## 1. Workspace scripts

- [x] 1.1 Add a `typecheck` script (`tsc --noEmit`) to `apps/web/package.json` — it
      currently has `dev`/`build`/`start`/`lint` but no `typecheck`.
- [x] 1.2 Add root-level `typecheck` and `lint` scripts to the root `package.json` that
      delegate via `npm run <script> --workspaces --if-present`, so a workspace missing
      the script (or a workspace that doesn't exist yet, like `apps/cms`) is skipped
      rather than failing the whole run.
- [x] 1.3 Confirm `npm run typecheck` and `npm run lint` both succeed from the repo root
      against the current scaffold, with zero source changes.

## 2. The import-graph rule (no new ESLint plugin)

- [x] 2.1 Add a `no-restricted-imports` (core ESLint) entry disallowing static imports
      of `gsap`, `@gsap/react`, and known GSAP plugin package names, applied with no
      file-glob restriction — static import of these is wrong everywhere, including
      inside the eventual L1 routes, per design.md's decomposition.
- [x] 2.2 Add a `no-restricted-syntax` (core ESLint) rule targeting `ImportExpression`
      nodes whose source matches those same specifiers, applied globally.
- [x] 2.3 Add a flat-config override block, scoped to `files` globs for the two eventual
      L1 route segments (the home route and `/[locale]/timeline`, per
      `design/motion.md`), that sets the 2.2 rule to `"off"` for those files only —
      this is the "path zone" exception. Document in a comment above the override
      exactly which two routes these globs are meant to match and why, since the
      directories do not exist yet.
- [x] 2.4 Write a fixture (outside `apps/web/app/`, deleted before commit or kept under
      a clearly test-only path — decide which per repo convention) with: a static
      `import { gsap } from "gsap"` outside an L1 glob (must fail both 2.1's rule), a
      dynamic `import("gsap")` outside an L1 glob (must fail 2.2's rule), and a dynamic
      `import("gsap")` inside an L1 glob (must pass). Run ESLint against the fixture and
      confirm all three outcomes, then remove the fixture if it was temporary.
      Verified via `eslint --stdin --stdin-filename=<virtual path>` — no file is ever
      written under `apps/web/app/`, which satisfies "outside `apps/web/app/`" more
      strongly than a real temp file would, while still exercising the real glob
      matching against the exact paths the rule will see once locale routing exists.
      Confirmed: static import fails outside L1 (and for `@gsap/react` and a
      `gsap/<plugin>` pattern import too); dynamic import fails outside L1
      (`no-restricted-syntax`); dynamic import passes inside both L1 globs
      (`app/[locale]/page.tsx`, `app/[locale]/timeline/_components/scene.tsx`); the
      same dynamic import still fails inside a sibling non-L1 route nested under the
      locale segment (`app/[locale]/missions/page.tsx`), confirming the glob does not
      over-match.

## 3. GSAP cleanup rule

- [x] 3.1 Write a small project-local ESLint rule (registered as a local flat-config
      plugin, per ESLint's documented mechanism) that flags a file importing `gsap`
      unless it also calls `useGSAP` (from `@gsap/react`) or pairs `gsap.context(` with
      a `.revert()` call.
- [x] 3.2 Fixture-test it: a file importing gsap with neither pattern (must fail), a
      file using `useGSAP` (must pass), a file using `gsap.context(...).revert()`
      (must pass). Verified via `eslint --stdin` with the import-graph rules disabled
      to isolate `local/gsap-cleanup`; all three outcomes confirmed.

## 4. Stylelint: property allow-list and duration tokens

- [x] 4.1 Add `stylelint`, a base config (e.g. `stylelint-config-standard`), and
      `postcss-value-parser` as explicit direct devDependencies; add a project
      Stylelint config file that registers a small repository-local plugin (not a
      third-party one — none exists for this narrow, project-specific shape).
      Installed at the repo root (`stylelint.config.mjs`, `stylelint-rules/motion.mjs`,
      `.stylelintignore`, `npm run stylelint`) rather than in `apps/web`: Stylelint has
      no npm-workspace concept to key off, and the checks apply to CSS anywhere in the
      repo. `stylelint-config-standard` predates Tailwind v4's CSS-native
      `@theme`/`@import "tailwindcss"` syntax, so three of its rules
      (`import-notation`, `color-hex-length`, `at-rule-no-unknown`) are disabled/scoped
      in `stylelint.config.mjs` with an inline comment explaining why — ADR 0004's
      Tier A table names only the two motion rules as a gate; the base config is a
      formatting baseline, not itself a second enforced gate, so it must not fail CI on
      this project's real, deliberate stack rather than on a motion violation.
- [x] 4.2 Write the property allow-list rule: `transition-property`, `transition`
      shorthand, and declarations inside `@keyframes` blocks may only name `transform`
      and `opacity` — using `postcss-value-parser` to tokenize the `transition`
      shorthand so a property hidden inside `transition: width 200ms` is caught the
      same as the long-hand `transition-property: width`. This rule does **not** apply
      to the `animation` shorthand: its components (name, duration, timing function,
      delay, iteration count, direction, fill mode, play state) never include the
      property being animated — that's determined by what's declared *inside* the
      `@keyframes` block the animation name references, which is exactly what this
      rule inspects directly instead.
- [x] 4.3 Write the duration-token rule: `transition-duration`, `animation-duration`,
      and both the `transition` and `animation` shorthands must reference a
      `var(--duration-*)` custom property for their duration component — same
      shorthand-tokenizing approach so `transition: transform 200ms` and
      `animation: fade-in 200ms` are both caught, not only the long-hand forms.
      Strengthened past a pure literal-value rejection during implementation (see
      design.md's "Decision" note added alongside this task): the rule positively
      requires a syntactically valid `var(--duration-*)` reference rather than merely
      rejecting literals, so a wrong-family token (`var(--space-md)`) or an
      unrecognized value (`calc(...)`, or a real motion declaration with no duration
      component at all) fails too, not just a bare literal. Long-hand
      (`transition-duration`/`animation-duration`) and shorthand are handled with
      different strictness: on long-hand, *every* `var(...)` call must be
      `var(--duration-*)` — there is no timing-function slot for `var(--ease-*)` to
      legitimately occupy, so `transition-duration: var(--ease-standard)` fails, not
      passes. In the shorthand, `var(--ease-*)` is recognized as the legitimate timing-
      function component and excluded from the duration check. A group with no
      identifiable property (`transition`) or animation-name (`animation`) — `none`, or
      a bare CSS-wide keyword (`inherit`/`initial`/`unset`/`revert`/`revert-layer`) —
      describes no motion and is exempt from needing a duration at all. Unlike 4.2,
      this rule applies to `animation` shorthand too, since duration genuinely is one
      of its components.
- [x] 4.4 Fixture-test both, including the shorthand form specifically: a
      `transition-property: width` (must fail 4.2), a `transition: width 200ms ease`
      (must fail 4.2 — shorthand must not slip through), a `@keyframes` block
      declaring `width` (must fail 4.2), a `@keyframes` block declaring only
      `transform`/`opacity` (must pass 4.2), an `animation: fade-in var(--duration-base)`
      (must **not** fail 4.2 — `fade-in` is an animation name, not an animated
      property, so the property allow-list does not apply to it at all), a
      `transition-property: transform` (must pass), a `transition-duration: 200ms`
      (must fail 4.3 — literal), a `transition: transform 200ms` (must fail 4.3 —
      shorthand literal), an `animation: fade-in 200ms` (must fail 4.3 — literal
      duration in the `animation` shorthand), a `transition-duration:
      var(--duration-base)` (must pass — note this passes on the reference-shape
      alone; `--duration-base` is not expected to resolve to a real token yet, per
      design.md's Context). Additionally, per 4.3's strengthening: a
      `transition-duration: var(--ease-standard)` and a `transition-duration:
      var(--space-md)` (must both fail — wrong token family, no easing exemption on
      long-hand), a `transition: transform var(--space-md)` (must fail — wrong token
      family in shorthand) alongside a `transition: transform var(--duration-base)
      var(--ease-out)` (must pass — easing exempt in shorthand), a
      `transition-duration: calc(200ms + 50ms)`, a `transition: opacity ease-in`, and
      an `animation: fade-in ease-in` (must all fail — a real motion declaration with
      no duration token at all is not silently accepted), and a `transition-duration:
      inherit`, a `transition: none`, and an `animation: none` (must all pass — a
      whole-value CSS-wide keyword or a declaration describing no motion needs no
      duration). All cases verified via `stylelint --stdin` against the plugin in
      isolation.
- [x] 4.5 Confirm the check passes cleanly against `apps/web/app/globals.css` as it
      exists today (no transition/animation declared at all). Verified via
      `npm run stylelint` against the whole repository.

## 5. Reduced-motion-block existence check

- [x] 5.1 Add `postcss` as an explicit direct devDependency (this script imports it
      directly; do not rely on it being present only transitively via Tailwind v4).
      Write a small Node script using it that, for each stylesheet, checks whether it
      declares any `transition`/`animation`, and if so requires a
      `@media (prefers-reduced-motion: reduce)` at-rule somewhere in the same file.
      `scripts/checks/reduced-motion-css.mjs`, wired as `npm run
      check:reduced-motion-css`; a dependency-free recursive directory walk (no glob
      library), matching every property whose name starts with `transition`/
      `animation` — not only the bare shorthand — so a file using only the long-hand
      form (e.g. `transition-duration` with no `transition:` ever written) is still
      caught.
- [x] 5.2 Fixture-test it: a stylesheet with a transition and no reduced-motion block
      (must fail), one with a transition and a reduced-motion block (must pass), one
      with neither (must pass — vacuous, per the spec's stated scenario). Verified
      against three temp fixture directories (never committed).
- [x] 5.3 Confirm it passes cleanly against `apps/web/app/globals.css` as it exists
      today. Verified via `npm run check:reduced-motion-css` against the whole
      repository.
- [x] 5.4 **Scope gap found and closed during implementation** (see design.md's new
      "Scope gap found and closed during implementation: GSAP reduced-motion branch"
      note): spec.md's requirement for this check has a second scenario — "GSAP code
      with no matchMedia reduced-motion branch fails" — that neither this section nor
      design.md's original "CSS static checks" decision broke into a task. Confirmed
      with the user before proceeding (not silently narrowed or silently expanded).
      Added a third local ESLint rule, `apps/web/eslint-rules/gsap-reduced-motion.mjs`
      (registered as `local/gsap-reduced-motion` in `apps/web/eslint.config.mjs`,
      alongside `local/gsap-cleanup`): a file that creates a gsap tween or timeline
      (`gsap.to/from/fromTo/set/timeline(...)`, or the same methods on an identifier
      the file itself created from `gsap.timeline(...)`, tracked by variable or
      chained directly) must branch through `gsap.matchMedia().add(...)` with a
      "prefers-reduced-motion" query actually passed into that `.add(...)` call — not
      merely present somewhere else in the file, and not triggered by an unrelated
      `.to()`/`.set()` call on some other API (e.g. `Map#set`).
- [x] 5.5 Fixture-test the ESLint rule, covering both the chained and the
      variable-tracked form of each side: a direct `gsap.to(...)` with no
      `gsap.matchMedia()` branch (must fail); a `gsap.matchMedia().add("(prefers-
      reduced-motion: reduce)", ...)` wrapping the tween (must pass); an unrelated
      `someMap.set(...)` in a gsap-importing file (must not trigger the rule at all);
      a "prefers-reduced-motion" string present elsewhere in the file but never
      passed into `.add(...)` on a matchMedia instance (must still fail); `const tl =
      gsap.timeline(); tl.to(...)` with no branch (must fail — variable-tracked
      timeline); `const mm = gsap.matchMedia(); mm.add(...)` with a valid
      reduced-motion query wrapping a variable-tracked `tl.to(...)` (must pass); the
      same variable-tracked pair with `mm.add(...)` given a non-reduced-motion query
      (e.g. `"(min-width: 768px)"`) (must fail — variable tracking does not bypass
      the query check). Verified via `eslint --stdin` with the other GSAP rules
      isolated off.

## 6. Locale-parity check

- [x] 6.1 Write a Node script that walks `content/*/*/`, and for each directory found,
      requires both `en.mdx` and `tr.mdx`, each declaring a non-empty `slug` in
      frontmatter. Use a dependency-free scanner restricted to the `---`-delimited
      block, recognizing only the two fields this gate needs (`slug`, `status`) and
      ignoring every other field — per design.md's "Locale parity" decision. Fail
      closed on `slug` (treat as absent) if it cannot be confidently parsed in the
      simple `key: value` form; do not add a general YAML/frontmatter dependency.
      `scripts/checks/locale-parity.mjs`, wired as `npm run check:locale-parity`.
      Fail-closed coverage extended past a bare literal/missing check during
      implementation to also reject: YAML's unquoted null spellings
      (`null`/`Null`/`NULL`/`~`); a bare or trailing `#` comment (a comment-only value
      and a value-plus-trailing-comment are indistinguishable to this scanner, so both
      fail rather than guessing); a malformed or incomplete quoted scalar (an
      unterminated quote, an escaped inner quote, or trailing content after the
      closing quote — a value starting with a quote character must be a complete,
      single-line, matching-quote scalar or it fails closed, never falls through as if
      unquoted); and an unsupported YAML indicator (`!tag`/`!!str`, `&anchor`,
      `*alias`, `|`/`>` block scalars, `{...}`/`[...]` flow collections). A
      **well-formed quoted** value is taken literally and bypasses all of the above —
      `slug: "null"` is a real slug, not a null.
- [x] 6.2 Confirm the script does not error, and reports nothing to fail, when `content/`
      does not exist at all (today's real state) — the vacuous-pass case from the spec.
      Verified via `npm run check:locale-parity` against the real repository (no
      `content/` directory exists) and separately against an empty temp directory.
- [x] 6.3 Fixture-test the non-vacuous cases under a test-only fixtures path (never under
      real `content/`, which does not exist yet): a directory with both locale files and
      slugs (must pass), one missing `tr.mdx` (must fail), one where `tr.mdx` has no
      `slug` (must fail), one where a locale file declares `status: incomplete` but still
      has a `slug` (must pass — incomplete licenses a placeholder body, not a missing
      slug). Additionally, per 6.1's extended fail-closed coverage: valid unquoted and
      valid quoted slugs (both pass); a missing `slug` key, an empty value, `null`,
      `~`, a comment-only value, and a value-with-trailing-comment (all fail); a
      malformed unterminated quote and a quoted value with trailing content (both
      fail); an unsupported tag (`!!str`) and anchor (`&anchor`) indicator (both
      fail); a quoted literal `"null"` (passes — a real slug, not YAML null). All run
      against temp fixture directories, never committed.
- [x] 6.4 Confirm multiple fixture directories are each reported independently — one
      failure does not suppress reporting on a sibling directory. Verified: a fixture
      tree with one directory missing `tr.mdx` and a sibling directory whose `tr.mdx`
      has no slug reported both failures in one run, each under its own directory
      heading.
- [x] 6.5 Note (no file edit here): `design/content-model.md` documents Timeline
      Entry's frontmatter as `title` and a short body only, with no `slug` field,
      while ADR 0004 states the slug requirement as a blanket rule over every git
      content directory. Per `CLAUDE.md`'s authority order the ADR wins, so this
      script enforces `slug` for Timeline Entry directories too — per design.md's
      "Cross-document reconciliation" section. Do not edit `content-model.md` in this
      change; that correction belongs to `git-content-pipeline`/`timeline-baseline`.

## 7. Weight budgets

- [x] 7.1 Add `apps/web/budgets.json` matching `design/motion.md`'s table exactly,
      including a `default` entry with `deferredAnimationKb: 0` (the table's own
      documented figure for every non-L1 route) and named `home` and `timeline`
      entries, matched by route pattern rather than a literal path frozen before
      locale routing exists. (The file originally shipped the 110 / 120 KB first-load
      figures `design/motion.md` then published; those were raised to 160 / 175 KB
      on 2026-09-03 after 7.9 measured the scaffold above that floor — see 7.9.)
      `budgets.json` is JSON and
      carries no comments; the explanation of what `default.deferredAnimationKb: 0`
      means belongs in the budget-checker source (7.6) and in design.md, not in this
      file: it records parity with `design/motion.md`'s table, it is not read as a
      generic numeric deferred-JS scan target for non-L1 routes, and that 0 KB outcome
      is enforced structurally by the import-graph rule instead.
- [x] 7.2 The budget checker itself does not run a build — it inspects whatever build
      output already exists under `apps/web/.next/`. Producing that output is the
      caller's responsibility: a fresh `npm run build -w apps/web` must complete
      successfully immediately before the checker (7.3–7.7) is invoked, both in the
      GitHub Actions workflow (section 9) and in 7.9 below. On a clean checkout,
      `.next/` does not exist until that build runs. `scripts/checks/budgets.mjs`'s
      `main()` reports a compatibility failure (not a crash) if the diagnostics file is
      absent, naming the missing build step.
- [x] 7.3 Write the diagnostics-schema validator: read
      `apps/web/.next/diagnostics/route-bundle-stats.json`, confirm it is a JSON array
      where each entry has a string `route`, a numeric `firstLoadUncompressedJsBytes`,
      and a non-empty array of string `firstLoadChunkPaths`. A missing file — whether
      because the build in 7.2 never ran or because a successful build simply didn't
      produce it — or any entry not matching this shape, fails with a named
      *compatibility/infrastructure* error, distinct from a budget-exceeded failure,
      per design.md's Decision. `validateDiagnostics()`.
- [x] 7.4 Write the version-pin guard: assert the installed `next` package version is
      exactly `16.3.1` before trusting the diagnostics format at all; a mismatch fails
      with an explicit "this compatibility mechanism is pinned to Next.js 16.3.1 and
      must be revalidated" error, distinct from both the schema error and an ordinary
      budget failure. `checkNextVersionPin()`.
- [x] 7.5 Write the first-load measurement: for every route, resolve each of its
      `firstLoadChunkPaths` to the emitted file, gzip-compress its actual contents,
      and sum per route. Never compare against `firstLoadUncompressedJsBytes`
      directly. A named chunk missing from disk is a compatibility/infrastructure
      error, not a zero-byte contribution. `measureFirstLoad()`.
- [x] 7.6 Write the deferred-animation-chunk traversal, run only for the two named L1
      routes (`home`, `timeline`): starting from that route's `firstLoadChunkPaths`,
      breadth-first scan each chunk's text for quoted `"static/chunks/<name>.js"`
      literals not yet visited; add each newly found path to a visited set and the
      traversal frontier; continue until the frontier is empty. Gzip and sum every
      visited path not already part of first-load. A missing referenced file is the
      same compatibility/infrastructure error class as first-load's. No route other
      than the two named L1 entries has this traversal run against it at all, so an
      unrelated dynamic import on any other route is never scanned or flagged by this
      checker. On the two L1 routes themselves, this mechanism sums *everything*
      transitively reachable — per design.md's disclosed limitation, if an L1 route
      ever also dynamically imports something unrelated to animation, this traversal
      would currently count that toward the same budget too, and the mechanism must be
      revalidated at that point, not silently trusted. Include the code comment
      required by 7.1 here. `measureDeferred()`/`findChunkReferences()`, plus
      `canonicalizeChunkRef()`: diagnostics-provided chunk paths carry a `.next/`
      prefix, references discovered inside chunk text don't, and every ref is
      normalized to one canonical form before it ever enters `visited`/`firstLoadSet` —
      caught during implementation review as a real bug (an actual first-load chunk
      re-referenced under the other spelling was being rediscovered and double-counted
      as deferred); fixture-verified fixed. A newly discovered chunk's existence is
      checked explicitly before it is read/gzip'd, so a missing chunk raises
      `CompatibilityError` rather than a raw filesystem exception — also caught and
      fixed during implementation review, fixture-verified.
- [x] 7.7 Match each route against `apps/web/budgets.json` by pattern (falling back to
      `default` for first-load when no named entry matches; the numeric
      deferred-chunk check runs only for the `home`/`timeline` entries per 7.6), and
      fail naming the route, which budget, the configured limit, and the measured
      total on overage. `matchRouteBudgetKey()`, `runBudgetCheck()`.
- [x] 7.8 Diagnostic output: a budget failure additionally names every contributing
      emitted chunk path and each chunk's individual gzip contribution; a
      deferred-chunk failure additionally states how each chunk was discovered
      (directly from the route's first-load code, or transitively through another
      named chunk). Format every compatibility/infrastructure failure (7.3, 7.4, a
      missing chunk in 7.5/7.6) visibly distinctly from a budget-exceeded failure —
      different label/heading in the log, not just different wording — so a
      contributor cannot mistake one for the other. `formatReport()`.
- [ ] 7.9 **Waiting on a re-run against the raised floor** (see design.md's "Blocker
      found during implementation, resolved 2026-09-03"). The unmodified scaffold
      measured 136.0 KB gzipped first-load JS on `/` (130.3 KB on `/_not-found`)
      against the original 120 KB default — React 19.2.8 + Next.js 16.3.1's own
      client-runtime floor, confirmed not to be a measurement bug. The captain
      decision was to raise the floor: `design/motion.md` and `apps/web/budgets.json`
      now cap first-load at 160 KB (home) / 175 KB (default and timeline). Re-run a
      fresh `npm run build -w apps/web` (per 7.2) and the checker against that output
      to confirm `/` now passes under `default`. Do not mark this done until that
      re-run is on the record.

## 8. Fixture-based checker verification (Node's built-in test runner, no browser stack)

- [x] 8.1 Set up a `node --test` suite for the budget checker (7.3–7.8). Each test
      constructs its own fake `route-bundle-stats.json` and fake chunk files
      programmatically inside a fresh temp directory it creates at run time (e.g. via
      `fs.mkdtempSync`) — no real `next build`, no Jest, no Playwright, and nothing
      written to a committed location, per design.md's "Testing the checker itself"
      decision. This suite is independent of 7.2's build requirement: it never
      invokes, and never needs, a real production build. **Reconciled against the
      literal wording rather than silently redefined**: design.md's "Testing the
      checker itself" section now has an explicit Amendment recording that
      `runBudgetCheck` takes already-parsed `diagnosticsRaw` as a plain in-memory
      value (a deliberate pure-function boundary — see `budgets.mjs`'s own header
      comment) rather than a file path, so most cases construct the fake diagnostics
      as a JS array directly instead of writing and re-reading an actual
      `route-bundle-stats.json`; fake chunk *files* remain real temp-directory files
      in every case, as originally written, since gzip measurement and the deferred
      scan are genuinely filesystem operations. The one case that is specifically
      about file *absence* (not content) spawns the real CLI via `execFileSync`
      against a temp `webDir` with no `.next/diagnostics/` at all, so that failure
      mode is still covered at the file-system boundary where it actually lives.
      `scripts/checks/budgets.test.mjs`, wired as `npm run test:budgets`; 19 tests,
      all passing.
- [x] 8.2 Cover, at minimum, one test per case: first-load chunks below budget
      (pass); first-load chunks above budget (fail); a fake L1 route's deferred
      chunks below budget (pass); a fake L1 route's deferred chunks above budget
      (fail); a multi-hop chain of chunk-path references, confirming every hop is
      counted (transitive); the same chunk referenced from two places, confirming it
      is summed once (duplicate); two chunks referencing each other, confirming the
      traversal terminates and each is counted once (cycle); a missing diagnostics
      file (compatibility/infrastructure failure); a diagnostics file with a missing
      or wrong-typed field (schema-mismatch compatibility/infrastructure failure); a
      referenced chunk file absent from the fixture directory (compatibility/
      infrastructure failure); a fake installed-version string that doesn't match
      `16.3.1` (explicit revalidation-required failure). All present, plus cases
      added during implementation review: a first-load chunk re-referenced under the
      alternate path spelling must not be double-counted as deferred, and a non-L1
      route's first-load chunk containing a chunk-path-shaped literal must never be
      traversed at all (locks in the two bugs caught and fixed in 7.6). Also, per
      review: `formatReport()` fixture assertions for an ordinary first-load- and a
      deferred-over-budget result, confirming the route, budget type, configured
      limit, measured total, and every contributing chunk path/size are present in
      the text output; the deferred case additionally confirms both "direct" and
      "transitive" discovery attribution appear correctly per chunk; and a
      compatibility-failure report is asserted to carry the distinct
      "COMPATIBILITY / INFRASTRUCTURE FAILURE" heading while a budget report never
      does, and vice versa — the visible-distinction half of 7.8, not just the data
      returned.
- [x] 8.3 Confirm the suite leaves nothing behind: every fixture is created in a
      per-test temp directory and torn down (or left in the OS temp area, never in the
      repository) when the test ends — none is ever written under `apps/web/app/` or a
      real `.next/`, unlike the throwaway-but-committed-path fixtures used to test the
      ESLint/Stylelint rules in earlier sections. Every fixture in
      `budgets.test.mjs` is created via `fs.mkdtempSync(join(tmpdir(), ...))` — the OS
      temp area, never the repository — and left there rather than explicitly
      removed, which the task text accepts explicitly ("or left in the OS temp
      area").

## 9. The GitHub Actions workflow

- [x] 9.1 Add `.github/workflows/tier-a.yml`: triggers on `push` with no branch or path
      filter, checks out, sets up Node from `.nvmrc` with npm cache, runs `npm ci`, then
      runs typecheck, lint (including the import-graph and GSAP-cleanup rules via
      `npm run lint`), Stylelint, the reduced-motion script, the locale-parity script,
      and the fixture suite (section 8) as separate steps — none of these need a
      build. Then run `npm run build -w apps/web` (per 7.2), and only after that
      succeeds, run the budget-enforcement script (section 7) as its own step, so a
      failure names which gate tripped and the budget check is never silently skipped
      or run against stale output. Lint also covers `local/gsap-reduced-motion`
      (task 5.4). YAML syntax verified (`yaml.safe_load`).
- [x] 9.2 Push a commit and confirm the workflow runs automatically and reports a result
      against it — the workflow itself is what's being verified here, so this is a real
      run, not a fixture. Pushed `deb40df` to `change/verification-gates`; Tier A
      triggered automatically (run 33743821412). Every step passed — Checkout, Node
      setup, install, Typecheck, Lint, Stylelint, reduced-motion CSS, locale-parity,
      the budget-checker fixture suite, and the build — **except** the final
      Weight-budget check step, which failed exactly as expected given the 7.9
      blocker: CI reproduced the identical numbers found locally (136.0 KB / 130.3 KB
      against the 120.0 KB budget). This confirms the workflow mechanism itself is
      correct end-to-end on real GitHub Actions infrastructure — the one non-green
      step is the real, already-documented blocker, not a workflow defect.
- [x] 9.3 Time the run; confirm it completes in under two minutes. If it does not,
      identify the slowest step before considering scope cuts — do not silently drop a
      gate to hit the number. **32 seconds** (job); well under the two-minute target,
      no slow step to investigate.

## 10. PR template verification

- [x] 10.1 Re-read `.github/PULL_REQUEST_TEMPLATE.md` against ADR 0004 and
      `design/motion.md`'s "every animation declares three things" section. Confirm it
      already asks for the screen recording and the three motion declarations (tier and
      route, reduced-motion experience, mobile fallback). Screen recording and two of
      the three declarations ("Motion tier **stated**", "Mobile fallback **stated**")
      already matched. The reduced-motion item did not: it was phrased only as a
      quality assertion ("A genuine non-animated `prefers-reduced-motion` path
      exists — not a faster version"), asymmetric with its two siblings' explicit
      "stated" wording, and never actually asked the author to say *what* a
      reduced-motion user sees — design/motion.md's literal required wording
      ("Reduced motion: what a reduced-motion user sees instead"). A PR could tick
      that box without the PR ever saying what the reduced-motion experience is.
- [x] 10.2 Only if a gap is found: make the minimal edit to close it. If no gap is
      found, make no edit and say so explicitly in the pull request — do not touch the
      file just to have touched it. **Gap found and closed**, minimally: the
      reduced-motion checklist item now reads "Reduced motion stated: what a
      reduced-motion user sees instead — a genuine non-animated
      `prefers-reduced-motion` path, not a faster version" — brings it into the same
      "stated" pattern as its two siblings without dropping the existing genuineness
      requirement.

## 11. Verification and hand-off

- [x] 11.1 Verification: this change **is** the CI gate — no existing gate covers it.
      State this explicitly in the pull request rather than implying prior coverage,
      matching how `platform-foundation`'s tasks.md handled the same situation.
      (Confirmed the same way `platform-foundation` did: `.github/workflows/` did not
      exist before this change — verified at the start of this session. Every check
      added here was previously manual/nonexistent; to be stated in the pull request
      body, not just recorded here.)
- [x] 11.2 Confirm every fixture added in tasks 2–6 to prove a failure case was removed
      (or, if kept, lives under a clearly test-only path) before the change is
      considered done — none of them belong under `apps/web/app/` or real `content/`.
      Section 8's fixtures are a separate case already covered by 8.3 (per-test temp
      directories, never committed) and don't need this same removal step. Every
      fixture across tasks 2–6 was either fed via `--stdin`/`--stdin-filename` (no
      file ever written) or built under `mktemp -d` (OS temp area, outside the repo
      entirely) and removed after use. Verified via `git status --porcelain` (no
      stray untracked files anywhere but the intended deliverables) and a direct check
      that `content/` doesn't exist and `apps/web/app/` holds only the four original
      scaffold files.
- [ ] 11.3 **Blocked, not done.** Once Tier A has run at least once on a pushed branch
      and gone green, tell GC (Dev 4) so the required-status-check ruleset can be
      configured — per `docs/task-assignments.html`, that ruleset cannot require a
      check that has never run, and configuring it is explicitly out of scope for
      this change. Tier A **has** now run on a pushed branch (9.2: run
      [33743821412](https://github.com/kuasar-website/kuasar-site/actions/runs/33743821412),
      commit `deb40df` on `change/verification-gates`) — every gate passed except the
      Weight-budget check, which failed on the original 7.9 finding (the bare
      scaffold's baseline exceeded the then-120 KB default). The floor has since been
      raised (160 / 175 KB; see design.md's resolved blocker). This task stays
      unchecked until a subsequent Tier A run is fully green against those numbers.
