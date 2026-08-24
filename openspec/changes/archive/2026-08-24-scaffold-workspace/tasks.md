## 1. Root workspace

- [x] 1.1 Create root `package.json` declaring `"workspaces": ["apps/*"]`, per
      design.md's workspace-globs decision.
- [x] 1.2 Add `.nvmrc` pinning Node 24 LTS, matching `docs/adr/0001-stack.md` and
      `docs/workflow.html`'s setup step.
- [x] 1.3 Add an `engines` field to root `package.json` pinning the same Node 24
      version.
      (Evidence, added during review: `npm install --dry-run` under a real Node
      22.23.1 binary produced `npm warn EBADENGINE {required: {node:'24.x'},
      current: {node:'v22.23.1'}}` — the mismatch is reported, not silent.)
- [x] 1.4 Confirm no package manager other than npm is implied anywhere (no
      `pnpm-lock.yaml`, no `yarn.lock`, no `corepack` config) — npm is the settled
      choice per ADR 0001 §1a.
      (Evidence, added during review: `apps/web/README.md`'s generated "Getting
      Started" section originally offered `yarn dev`/`pnpm dev`/`bun dev` alongside
      `npm run dev`. Corrected to `npm run dev` only. The defensive yarn/pnpm ignore
      patterns in `apps/web/.gitignore` are left as-is — they cost nothing and guard
      against someone using the wrong tool locally, not against a claim about which
      tool this project uses.)

## 2. Scaffold apps/web

- [x] 2.1 Before generating anything, confirm `apps/web/public/brand/kuasar-wordmark.svg`
      exists and record its content so later steps can verify it survived unchanged.
      (Recorded: 3380 bytes, sha256 4e208c00c0d63fe23d4bf37c749cf6534f27eecd470986eddc3f2d515f16afd1.)
- [x] 2.2 Run `create-next-app@16.3.1` non-interactively into a temporary directory
      *outside* `apps/web` (never into `apps/web` itself — confirmed 2026-08-23 that
      `create-next-app` refuses any target whose `public/` subtree is already non-empty)
      with `--typescript --app --no-src-dir --tailwind --use-npm --skip-install
      --disable-git --yes`.
- [x] 2.3 Move every generated top-level entry (`app/`, `next.config.ts`,
      `package.json`, `tsconfig.json`, `next-env.d.ts`, `postcss.config.mjs`,
      `eslint.config.mjs`, `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md`) from the
      temporary directory into `apps/web/`.
- [x] 2.4 Merge `public/`: move the temporary directory's `public/file.svg`,
      `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
      into `apps/web/public/`, leaving `apps/web/public/brand/` untouched — verified no
      filename collides.
- [x] 2.5 Delete the now-empty temporary directory.
- [x] 2.6 Confirm `apps/web/public/brand/kuasar-wordmark.svg` still exists at the same
      path with content matching what was recorded in 2.1. (sha256 matches exactly;
      file's original mtime is untouched.)
- [x] 2.7 Inspect the generated `apps/web/package.json`; confirm `dependencies.next`
      already reads exactly `"16.3.1"` — verified 2026-08-23 by running
      `create-next-app@16.3.1` with `--skip-install` twice: the invoked CLI version, not
      npm's `latest` tag, is what's written, with no caret, and nothing is installed. If
      it does not match for any reason, correct it to `"16.3.1"` before proceeding.
      (Confirmed: reads exactly `"16.3.1"`, no correction needed.)
- [x] 2.8 Leave the generated `AGENTS.md` and `CLAUDE.md` in `apps/web/` exactly as
      scaffolded — per design.md's precedence decision, this repository's root project
      instructions remain in force for anyone working in `apps/web/` regardless (Claude
      Code's memory loading is additive, never overriding), and the nested
      `apps/web/CLAUDE.md` → `apps/web/AGENTS.md` pairing only adds Next.js-specific
      framework guidance on top of it. No conflict exists, so no deviation from the
      framework's default is made here.

## 3. Generate the workspace lockfile

- [x] 3.1 From the repository root, run `npm install` — no `package-lock.json` exists
      yet at this point, so this generates one; the `npm ci` check later only verifies
      against a lockfile that already exists, it does not create one. This resolves
      dependencies for the root workspace and `apps/web` together into a single root
      `package-lock.json`.
- [x] 3.2 Confirm the generated root `package-lock.json` exists, is tracked as part of
      this change, and reflects the finalized workspace `package.json` files (root and
      `apps/web`, with `next` pinned at `16.3.1`). The actual git commit happens after
      implementation and verification are complete, under the normal pull-request
      workflow in `docs/workflow.html` — not as a step performed here.
      (Confirmed: 236905-byte lockfile covers both the root and `apps/web` workspace
      packages, `next` resolves to `16.3.1`. "Tracked as part of this change" means
      present in the file set this change produces — nothing was `git add`ed or
      committed; `git status` shows it, `.nvmrc`, and every scaffolded file as
      untracked, per this task's no-commit-during-apply instruction.)

## 4. Strapi fetch wrapper

- [x] 4.1 Add `apps/web/lib/strapi/` with a fetch wrapper function that catches
      connection-level failures (refused, timeout, DNS) from `fetch()` and throws an
      error naming Strapi and pointing at `docs/ops/cms-runbook.md`, per ADR 0001's
      Consequences section. Construct the target `URL` *outside* the try/catch — only
      the `fetch()` call itself is wrapped — so a malformed base URL throws its own
      native error instead of being caught and relabeled as "Strapi unreachable." Avoid
      TypeScript constructs needing a real transform (enums, namespaces, decorators,
      constructor parameter properties) so the module stays runnable directly with
      plain `node` for 4.3.
- [x] 4.2 Confirm the wrapper passes through a successful response, and passes through
      an HTTP error response from Strapi itself (e.g. 404, 500) unchanged — `fetch()`
      only throws on a network-level failure, never on a non-2xx status, so this should
      hold with no special-case code.
      (Confirmed by code review: no status-based branching exists; empirically verified
      in 4.3.)
- [x] 4.3 Manually verify all four cases without adding a test runner: write a
      temporary, uncommitted `.ts` script that imports the wrapper from
      `apps/web/lib/strapi/` using its explicit `.ts` extension, and:
      - starts a throwaway local server with Node's built-in `node:http` (no
        dependency) returning `200` with a JSON body, and confirms the wrapper returns
        a matching `Response`;
      - reconfigures the server to return `404` (or `500`), and confirms the wrapper
        still returns the `Response` unthrown, with the matching status;
      - points the wrapper at a local port nothing listens on (e.g.
        `http://127.0.0.1:65500`), and confirms the thrown error names Strapi and the
        runbook path, not a raw `fetch failed`;
      - calls the wrapper with a deliberately malformed base URL, and confirms the
        thrown error is a native `TypeError` from URL parsing, **not** the
        "Strapi unreachable" message — so a configuration error is never mistaken for
        network unreachability.
      Run with plain `node <script>.ts` on Node 24 — no `ts-node`/`tsx`/build step.
      Delete the temporary script afterward; it is never committed.
      (Ran against the real `apps/web/lib/strapi/fetch.ts` — all four cases passed:
      200 passthrough, 404 passthrough, unreachable-port named error, malformed-URL
      native `TypeError` not mislabeled. Script deleted after the run; confirmed not
      present and never tracked by git.)

## 5. Verify the whole workspace

- [x] 5.1 From a clean checkout, run `npm ci` on Node 24 and confirm it completes with
      no lockfile changes. (Ran on Node v24.19.0; exit 0, 360 packages — `npm ci` itself
      would fail if the lockfile were out of sync with `package.json`.)
- [x] 5.2 Run `npm run build` in `apps/web` with no Strapi instance reachable and
      confirm the build succeeds, since no route in this change fetches Strapi.
      (Confirmed: `next build` exit 0, `▲ Next.js 16.3.1 (Turbopack)`, `/` and
      `/_not-found` prerendered as static content. No `apps/cms`/Strapi instance runs
      anywhere in this environment.)
- [x] 5.3 Verification: **no existing CI gate covers this change** — Tier A does not
      exist yet (it is `docs/workflow.html` §08 item 2, a later change). The checks in
      5.1, 5.2, and 4.3 are manual until verification-gates lands an automated one; say
      so in the pull request rather than implying coverage that doesn't exist.
      (Confirmed: `.github/workflows/` does not exist in this repository at all.)
