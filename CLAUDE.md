# Agent instructions

`AGENTS.md` is a symlink to this file. Keep it harness-agnostic — no wording specific to one
agent tool, since the vendored skills can be deployed to any of them.

This file **points**. It does not restate decisions, because two copies of a decision drift
apart and nobody can tell which one is current. If you are about to write a rule here, ask
whether it belongs in `openspec/config.yaml`, `docs/adr/` or `design/` instead. It almost
always does.

## What this is

The bilingual (Turkish/English) promotional and archival site for KUASAR, a student rocketry
team at Koç University. It is a website, not an application. See [README.md](README.md) for
orientation and [docs/HANDOVER.md](docs/HANDOVER.md) for everything operational.

Five contributors with annual turnover. **Write every artifact for someone who joins in three
years and finds nobody left who built this.** That constraint is the reason for most of the
unusual choices in this repository.

## Authority

1. `openspec/config.yaml` — the project constitution. Injected into every generated OpenSpec
   artifact, so it is deliberately short: rules and pointers only.
2. `docs/adr/` — the decisions and, more importantly, why they were made.
3. `design/` — the design system those decisions produce.

**Where any document disagrees with `docs/adr/`, the ADRs win.** Several decisions were
changed deliberately during the bootstrap; the ADRs are where those changes landed.

Never create `openspec/project.md`. The constitution lives in `openspec/config.yaml`.

## Repository state

There is **no application code**. No `package.json`, no build, lint or test toolchain, no
`apps/` directory yet. Do not invent commands — nothing in this repository runs.

The stack is settled and is not open for renegotiation. It is recorded in the `context:` key
of `openspec/config.yaml` and argued in [docs/adr/0001-stack.md](docs/adr/0001-stack.md) and
[docs/adr/0002-cms.md](docs/adr/0002-cms.md). Read those before proposing a change to it.

`openspec/changes/` (with `archive/`) and `openspec/specs/` exist on disk but are empty. Git
does not track empty directories, so a fresh clone has only `config.yaml` until the CLI
recreates them on the first proposal.

## The documents

Read the one that covers your task. Do not summarise them back into this file.

| File | Decides |
| --- | --- |
| [docs/adr/0001-stack.md](docs/adr/0001-stack.md) | Framework, hosting, rendering rule, client-derived time state, repo layout, analytics |
| [docs/adr/0002-cms.md](docs/adr/0002-cms.md) | CMS, database, media, backups, the git/CMS content split, KVKK debt |
| [docs/adr/0003-motion-stack.md](docs/adr/0003-motion-stack.md) | Which animations may use a library and which may not |
| [docs/adr/0004-verification.md](docs/adr/0004-verification.md) | What CI checks and what it deliberately does not |
| [docs/ops/cms-runbook.md](docs/ops/cms-runbook.md) | Operating and restoring the CMS and media |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Accounts, domain, deploys, backups, inheriting the project |
| [design/tokens.md](design/tokens.md) | Colour, spacing, type scale, breakpoints, motion primitives |
| [design/motion.md](design/motion.md) | The two separate motion budgets |
| [design/content-model.md](design/content-model.md) | Every entity, its fields, where it is stored |
| [design/i18n.md](design/i18n.md) | Turkish and English, both first-class |
| [design/brand.md](design/brand.md) | Voice, wordmark, typography, photography |

## Unresolved, on purpose

- **20 `ASSUMPTION:` lines across 10 files.** They are deliberate and awaiting correction, not
  oversights. Find them with `grep -rn "ASSUMPTION:" docs design openspec`. If your work
  resolves or invalidates one, correct the document rather than letting it drift.
- **`<DOMAIN>` is a placeholder** in `docs/HANDOVER.md`, `docs/adr/0001-stack.md`,
  `docs/adr/0002-cms.md` and `docs/ops/cms-runbook.md`. The domain is not registered. Replace
  every occurrence once it is — see the runbook, step 1.

## OpenSpec workflow

Configured for spec-driven development via the `openspec` CLI (v1.9.0, `npx openspec`).
`openspec/config.yaml` sets `schema: spec-driven` and carries per-artifact `rules:` that are
injected at generation time — read them before writing a proposal, they are requirements, not
suggestions.

Feature work flows through the skills rather than going straight to code:

`openspec-explore` (think through the problem) → `openspec-propose` (proposal + design + delta
specs + tasks) → `openspec-apply-change` (implement) → `openspec-sync-specs` (fold deltas into
main specs) → `openspec-archive-change`

`openspec-update-change` revises a change's artifacts in place; it never edits code.

## Agent tooling is not in this repository

`.agents/`, `.claude/`, `.impeccable/` and `skills-lock.json` are gitignored. Anyone in the
organisation can install them, so they are not the repository's business, and **a fresh clone
has none of them.** Do not treat their absence as a broken checkout, and do not commit them.

Two consequences worth knowing:

- Vendored skills come from `emilkowalski/skill` (design engineering, animation, Sonner,
  Apple-style motion) and `greensock/gsap-skills` (GSAP core, timeline, ScrollTrigger,
  plugins, framework integration). The heavy motion-skill selection reflects what this project
  is: an animation-forward marketing site. **Never hand-edit files under a `skills/`
  directory** — edits diverge from the recorded hash and are lost on the next sync.
- If the impeccable design checker is installed locally, UI edits are automatically critiqued
  via editor hooks and the feedback arrives as hook output. It shells out to `node`; without
  Node on `PATH` it silently no-ops. Not having it is not an error.

## Easy to break by accident

- Use context7 before writing against Next.js App Router, Strapi 5 or GSAP APIs. All three
  move faster than model training data.
- `gsap-skills` is the authority for GSAP. `emilkowalski/skill` governs **interface** motion
  only, never narrative motion. The two motion budgets stay separate — see
  [design/motion.md](design/motion.md).
- Inter is a deliberate override of impeccable's font guidance, justified by Turkish glyph
  coverage and recorded in [design/brand.md](design/brand.md). Do not re-open it on every
  critique run.
