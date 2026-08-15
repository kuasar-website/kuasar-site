# kuasar-site

The website for **KUASAR** — the Koç University Association of Space & Rocketry, a
student-founded, multidisciplinary rocketry team active since 2022, competing at TEKNOFEST
and the Spaceport America Cup.

It is a bilingual (Turkish and English) promotional and archival site, not an application. It
exists to do two things: get sponsors to the sponsorship material, and get prospective members
to the join form. Everyone else — press, the university, competition judges — is served by the
site being credible.

## Status

**Documentation only.** The architecture is decided and written down; no application code has
been committed yet. Everything under *Running it locally* below describes the intended shape
of the repository and **will not work until `apps/web` and `apps/cms` exist.**

## Stack

Next.js 16 (App Router) and TypeScript on Vercel, statically generated with on-demand
revalidation — visitors never wait on a database, and the site stays up when the CMS is down.

Strapi 5 CE on Render with Postgres on Neon, media on Cloudflare R2. One repository, pnpm
workspaces, Node 22.

## Running it locally

*Aspirational — there is no `package.json` yet.*

```bash
pnpm install
pnpm --filter web dev      # site   → http://localhost:3000
pnpm --filter cms develop  # Strapi → http://localhost:1337/admin
```

The site needs environment variables to reach Strapi: copy `apps/web/.env.example` to
`.env.local` and fill it. Secrets live in the Vercel and Render dashboards, never in this
repository.

## Layout

```
apps/web/            Next.js site → Vercel                (planned)
apps/cms/            Strapi CMS → Render                  (planned)
content/missions/    Mission content, in git              (planned)
content/timeline/    Timeline entries, in git             (planned)
design/              Design system: tokens, motion, content model, i18n, brand
docs/adr/            Architecture decisions and why they were made
docs/ops/            Runbook
openspec/            Spec-driven workflow; config.yaml is the project constitution
```

Agent tooling (`.agents/`, `.claude/`, `.impeccable/`) is gitignored — install it yourself if
you want it. A fresh clone having none of it is intentional.

## Where to read next

- **[docs/workflow.html](docs/workflow.html)** — start here if you are contributing. How work
  moves through this repository: which command to run, in what order, and what happens after
  your pull request is merged.
- **[docs/HANDOVER.md](docs/HANDOVER.md)** — start here if you have just inherited this
  project. Accounts, domain, deploys, backups.
- **[docs/adr/](docs/adr/)** — the decisions and the reasoning behind them. Read the relevant
  one before undoing anything; each was written for a stranger.
- **[CLAUDE.md](CLAUDE.md)** — instructions for AI agents working in this repository.

Two things that look like bugs and are not: dates are computed in the browser rather than on
the server ([0001](docs/adr/0001-stack.md)), and most of the site is forbidden from using the
animation library ([0003](docs/adr/0003-motion-stack.md)). Both are enforced deliberately.

## Contributing

Content changes are usually *data* changes, not code changes — adding a talk, event, alumnus
or sponsor happens in the CMS, and missions and the timeline are edited as files in this
repository. If adding a record seems to require editing a component or a layout, that is a
design defect worth reporting.

Feature work flows through the OpenSpec workflow described in [CLAUDE.md](CLAUDE.md).
