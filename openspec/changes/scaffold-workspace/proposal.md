## Why

There is no application in this repository yet — no `package.json`, no lockfile, no
runtime pin, no `apps/web`. Every later change (CI gates, design tokens, locale routing,
CMS integration, every section) needs somewhere to land. This is `docs/workflow.html`'s
first item in "First changes, in order" and the BOOSTER console's Phase 1 critical path
in `docs/task-assignments.html`: nothing else can merge code until this exists.

## What Changes

- Establish the root **npm workspace** and `apps/web` as a **Next.js 16.3.1** TypeScript
  application, per `docs/adr/0001-stack.md`.
- Pin **Node 24 LTS** in `.nvmrc` and `package.json` `engines`, matching the stack ADR
  and `docs/workflow.html` setup instructions.
- Commit the lockfile (`package-lock.json`) so every contributor and both deploy targets
  resolve identically.
- Add the **build-time Strapi fetch wrapper** required by `docs/adr/0001-stack.md`
  (Consequences): a network-level failure to reach the CMS (connection refused, timeout,
  DNS failure) at build time must fail with an explicit error naming Strapi and pointing
  at `docs/ops/cms-runbook.md`, never a raw network error surfaced as-is. A malformed or
  missing Strapi URL is a different kind of failure and is out of scope — this change
  defines no behavior for it. `apps/cms` does not exist yet, so this wrapper has no real
  caller in this change — it exists so the failure mode is correct from the first commit
  that could exercise it.
- Preserve `apps/web/public/brand/kuasar-wordmark.svg` exactly where it is; the scaffold
  must not move, regenerate, or overwrite it.

**Explicitly out of scope**, per the BOOSTER assignment and `docs/workflow.html`'s
ordering — each belongs to a later, separate change:
- CI workflows and `apps/web/budgets.json` (next in the sequence: CI Tier A).
- Design tokens / `@theme` CSS (design-tokens change).
- Locale routing, the URL segment map, MDX/content loading (locale-routing,
  git-content-pipeline changes).
- Any page, route, or component beyond the minimal runnable shell Next.js scaffolding
  requires.
- `apps/cms` itself, Render/Neon/R2 setup, the revalidation webhook (cms-platform and
  related changes).

## Capabilities

### New Capabilities
- `platform-foundation`: the workspace exists, installs, and builds on a pinned Node/npm
  toolchain, and a build-time Strapi lookup fails loudly and points at the runbook
  instead of surfacing a raw network error.

### Modified Capabilities
(none — no existing `openspec/specs/` capabilities exist yet to modify)

## Impact

- **Audience served:** neither sponsors nor prospective members directly — this change
  serves credibility only, per `openspec/config.yaml`'s proposal rule. It is
  infrastructure that later audience-facing changes depend on.
- **Content:** none added. No entity is created, so there is nothing to place in git vs.
  Strapi and nothing that could be split across both.
- **New runtime dependencies:** none beyond what `docs/adr/0001-stack.md` already
  settled (Next.js 16.3.1, TypeScript, npm workspaces, Node 24). No animation library,
  no second scroll system, and no new route are introduced, so no accompanying ADR is
  required.
- **Affected paths:** repo root (`package.json`, `package-lock.json`, `.nvmrc`),
  `apps/web/` (new Next.js app skeleton, `apps/web/lib/strapi/` fetch wrapper). Files
  under `.github/workflows/`, `apps/web/budgets.json`, `design/`, and `apps/cms/` are
  untouched by this change.
- **Systems:** none deployed yet — Vercel/Render wiring is out of scope here; this
  change only makes the workspace exist and build locally.
