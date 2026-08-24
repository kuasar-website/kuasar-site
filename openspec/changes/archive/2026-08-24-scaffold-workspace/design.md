## Context

`apps/web/` currently holds only the committed wordmark; there is no `package.json`
anywhere in the repository. See `proposal.md` - Why for motivation. The target shape —
`apps/web`, `apps/cms`, npm workspaces, Node 24, Next.js 16.3.1 — is settled by
`docs/adr/0001-stack.md` and is not reopened here; this document only covers how to
stand it up.

This is the first change to touch the workspace, so several sequencing decisions that
later changes will build on need to be made explicitly, once, rather than left for
whoever writes the next `package.json` edit to guess at.

## Goals / Non-Goals

**Goals:**
- A root workspace and `apps/web` that install and build on Node 24 / npm alone, with
  the exact Next.js 16.3.1 version and lockfile committed.
- A workspace layout that `apps/cms` can join later without a further root
  `package.json` restructuring.
- A Strapi fetch wrapper whose shape later CMS-consuming code (content-model,
  cms-platform, schedule-calendar, etc.) can adopt as-is.

**Non-Goals:** everything proposal.md's "Explicitly out of scope" section already
lists — CI, `budgets.json`, design tokens, locale routing, pages beyond the framework
default, `apps/cms` itself. Not restated here.

## Decisions

**Workspace globs as `apps/*`, not an explicit list.** Root `package.json` declares
`"workspaces": ["apps/*"]`. When the cms-platform change adds `apps/cms`, it becomes a
workspace member automatically — that change edits `apps/cms/package.json`, not this
one's `package.json`, keeping Dev 1's file (per the BOOSTER ownership table) out of a
change Dev 4 owns. Alternative considered: list `apps/web` explicitly and require every
future app to add itself to root `package.json`. Rejected — it forces a Dev-1-owned edit
into every future app's change for no benefit over a glob.

**No `src/` directory; `apps/web/app/` directly.** Every path referenced across
`docs/task-assignments.html`'s ownership table and ADRs (`app/[locale]/(schedule)/`,
`app/[locale]/(missions)/`, etc.) assumes `apps/web/app/`, not `apps/web/src/app/`.
Scaffolding with a `src/` layout would put every one of those paths one directory off
from what the rest of the team's plans already say.

**Scaffold into a temporary directory, then merge into `apps/web` — verified, not
assumed.** A direct run of `create-next-app@16.3.1 apps/web ...` against this
repository's actual `apps/web` was tested on 2026-08-23: it refuses outright — *"The
directory web contains files that could conflict: public/"* — and writes nothing.
`create-next-app` treats any pre-existing entry under the target, including a non-empty
subdirectory, as a conflict. Scaffolding directly into `apps/web` is not viable while the
wordmark lives there.

Instead: run `create-next-app@16.3.1` into an empty temporary directory outside
`apps/web` (never committed at that path), then merge its output into `apps/web` by
hand. A real run into an empty directory was captured on 2026-08-23 and produces exactly:
`app/`, `next.config.ts`, `package.json`, `tsconfig.json`, `next-env.d.ts`,
`postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `README.md`, `AGENTS.md`,
`CLAUDE.md`, and `public/{file,globe,next,vercel,window}.svg`. Every one of those except
`public/` moves into `apps/web` directly — nothing else exists there yet, so there is
nothing to merge. `public/` is the one directory present on both sides: the five
generated SVGs move into `apps/web/public/` alongside the untouched
`apps/web/public/brand/` subtree. Verified: no filename collision — the generated assets
are flat, `kuasar-wordmark.svg` lives one level deeper, under `brand/`. The temporary
directory is deleted once the merge is done.

Alternative considered: move the wordmark out of `apps/web`, scaffold in place, move it
back. Rejected — it is the same merge with an added risk window where the wordmark
briefly exists nowhere in the tree, for no benefit over scaffolding somewhere that was
never non-empty to begin with.

**`apps/web/AGENTS.md` and `apps/web/CLAUDE.md` are both carried over unchanged —
verified precedence, not assumed harmlessness.** Claude Code's `CLAUDE.md` loading is
documented as lazy-per-subdirectory and strictly additive: a nested `CLAUDE.md` never
overrides or shadows a root one — both concatenate into context, root first — and root
`CLAUDE.md` always still loads via the ordinary upward directory walk regardless of what
exists under `apps/web/`
(https://code.claude.com/docs/en/memory#how-claude-md-files-load). `@file` imports are
resolved recursively (max 4 hops) and resolve relative to the file containing them, not
the working directory (same doc) — so `apps/web/CLAUDE.md`'s `@AGENTS.md` resolves to
`apps/web/AGENTS.md` (Next's own short framework notice), not this project's root
`AGENTS.md`. That is additive, not an override: **this repository's root project
instructions remain in force for anyone or anything working in `apps/web/` regardless**,
and the nested Next.js guidance simply adds framework-specific context on top of it —
which is exactly what `create-next-app` intends the pairing for. Since no conflict with
the project constitution exists, both generated files are kept exactly as scaffolded;
inventing a custom deviation from the framework's default here would cost effort for no
benefit ADR 0001 or `openspec/config.yaml` asks for.

**`dependencies.next` already reads exactly `16.3.1` — verified, not assumed to
float.** `docs/adr/0001-stack.md` names `16.3.1` specifically. Checked directly by
running `create-next-app@16.3.1 ... --skip-install` twice (2026-08-23): `--skip-install`
means nothing is installed at all, and the invoked CLI version — not npm's `latest`
dist-tag — is what gets written into `dependencies.next`, with no caret. The generated
`package.json` therefore already reads `"next": "16.3.1"` exactly. The corresponding
task is an inspect-and-confirm step, not a corrective edit: it exists in case a future
re-run (a different pinned `create-next-app` version, a registry change) ever produces
something else, not because this run does.

**Tailwind v4 is installed here; `@theme` tokens are not.** `docs/adr/0001-stack.md`
already settles Tailwind v4 as the CSS approach, so declining it now only to have
design-tokens add it as a follow-up dependency edit gains nothing. `create-next-app`'s
default output (`apps/web/app/globals.css` with the framework's own minimal styles) is
what ships; no custom `@theme` block is authored, per the explicit scope boundary in
proposal.md. design-tokens is the change that turns `design/tokens.md` into real
`@theme` custom properties.

**Strapi fetch wrapper: network failures only — and the URL is constructed outside the
try block, verified.** A single function in `apps/web/lib/strapi/` wraps `fetch`. The
target `URL` is built *before* the try/catch; only the `fetch()` call itself is inside
it, so a malformed or missing base URL throws its own native error and is never caught
and relabeled as "Strapi unreachable" — confirmed by running a script that calls the
wrapper with a deliberately invalid URL and observing a native `TypeError`, not the
wrapper's message. Connection-level failures (refused, timeout, DNS) are caught and
rethrown as an error naming Strapi and `docs/ops/cms-runbook.md`, per ADR 0001's
Consequences section — the ADR's own language is "a raw network error," which is what
this scopes to. An HTTP response Strapi itself returns (404, 500) is never thrown —
`fetch()` only throws on a network-level failure, never on a non-2xx status — confirmed
by running the wrapper against a throwaway local server returning each. A future caller
needs to distinguish an HTTP error response from "the CMS is unreachable," and collapsing
both into one message would make them indistinguishable to whoever debugs it later. A
malformed or missing Strapi URL remains a third, distinct, out-of-scope case: it surfaces
its own native error rather than either of the other two messages, narrowing scope to
what ADR 0001 actually asks for rather than inventing a broader "misconfiguration"
contract nobody has specified yet. The wrapper's implementation should avoid TypeScript
constructs that need a real transform (enums, namespaces, decorators, constructor
parameter properties) so it stays runnable directly with plain `node`, which is what
makes the verification below possible without a build step.

**Lockfile generation is its own explicit step, and it is a build action, not a git
action.** After both `package.json` files (root and `apps/web`) are finalized, an
explicit `npm install` run at the repository root resolves and writes
`package-lock.json` covering the whole workspace — `npm ci` later only verifies against
a lockfile that already exists, it does not create one, so the generating step has to
exist as its own task. Committing that file to git is not a task-level action taken
during implementation: per `docs/workflow.html`'s loop, planning artifacts and code
travel to review in one pull request and get committed together under the normal
workflow, after implementation and its manual verification are done — not as a discrete
step apply performs on its own.

**No test runner introduced — verified manually with a real 4-case script, not a
placeholder.** The repository has no test toolchain today; adding one is
verification-gates' job (`docs/workflow.html` §08 item 2). Built and ran directly
against this environment's Node 24 install: a temporary `.ts` script starts a throwaway
`node:http` server (built-in, no dependency) and drives the actual wrapper through all
four cases — a 200 response, a 404 response, an unreachable port, and a malformed URL —
asserting each behaves as the requirements above describe. All four passed. The script
and its output are never committed; tasks.md makes deleting it an explicit step, not an
afterthought. This adds no dependency, permanent or temporary. Automated coverage of
the same behavior is verification-gates' job once a real test runner exists.

**Rule-required notes, since design.md's rules ask for them explicitly:**
- Motion tier: none. This change introduces no animation.
- First-load JS impact: not meaningfully assessable yet — `create-next-app`'s default
  home page is a placeholder every later change replaces, and `apps/web/budgets.json`
  (which would give the number something to be measured against) doesn't exist until
  verification-gates.
- CMS field: none. No Strapi field is added or consumed by this change.

## Risks / Trade-offs

**The exact generated file list this design relies on was captured against
`create-next-app@16.3.1` specifically, on 2026-08-23.** → Mitigation: if the pinned
`create-next-app` version ever changes, re-run and re-verify the file list and the
non-empty-target refusal before trusting tasks.md's merge steps as still accurate — don't
assume they're still exact.

**The Strapi wrapper ships with no real caller, so its only evidence of correctness in
this change is a manual check, not an automated one.** → Mitigation: the manual check is
a concrete, reproducible 4-case script (tasks.md 4.3) — success passthrough, HTTP error
passthrough, unreachable-port naming, and malformed-URL non-mislabeling — not a vague
placeholder; automated coverage is verification-gates' job, once a test runner exists.

**Tailwind is present in `package.json` before any token exists, which could tempt
someone to start writing utility classes with raw values before design-tokens lands.** →
Mitigation: `apps/web/app/globals.css` stays at the framework default; nothing in this
change's tasks touches a component or writes a class, so there is nothing to write a raw
value into yet.

## Migration Plan

There is no prior state — this is the first scaffold. Per the BOOSTER readiness note in
`docs/task-assignments.html`, this is also the one change of Phase 1 required to land
alone before any other lane's code merges, so there is no concurrent work to coordinate
around. Rollback is an ordinary revert: nothing else depends on this change yet.
