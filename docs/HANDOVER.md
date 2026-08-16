# Handover

**You are probably reading this because everyone who built this site has graduated.**

That was expected. This document is written for you specifically. It assumes you know
nothing about this project, have nobody to ask, and need the site to keep working.

- **Last updated:** 2026-08-15
- **Update this file whenever an account, an owner, or a renewal date changes.** It is the
  only document that goes out of date silently.

`<DOMAIN>` means the registered apex domain. If you still see this placeholder in the
repository, the domain was never registered — see
[ops/cms-runbook.md](ops/cms-runbook.md), step 1.

## What this is

The website for KUASAR, the Koç University Association of Space & Rocketry — a
student-founded, multidisciplinary rocketry team active since 2022, competing at TEKNOFEST
and the Spaceport America Cup.

It is a promotional and archival site, not an application. It exists to do two things:
get sponsors to Connect Us or to the sponsorship PDF, and get prospective members to Join
Us. Everyone else — press, the university, competition judges — is served by the site
being credible.

It is bilingual, Turkish and English, with both languages first-class.

## How it fits together, in one page

There are two deployed pieces and they are deliberately independent.

**The website** is a Next.js app on Vercel. It is *statically generated*: the pages are
built once and served as files. Visitors never wait on a database.

**The CMS** is Strapi, running on Render with a Postgres database on Neon. Editors log in
there to add talks, events, announcements, alumni and sponsors. When they publish, Strapi
pings the website, which rebuilds the affected pages.

**Photographs and files** live in Cloudflare R2, served from `media.<DOMAIN>`, and are
resized on the fly by Cloudflare.

**The single most important consequence:** if the CMS is down, **the website is still
up**. Everything visitors see keeps working. Only editing stops. This was designed in
deliberately, because the CMS runs on a $7 server owned by people who graduate. Do not
panic-fix a CMS outage.

**The one real catch:** deploys read from the CMS at build time, so while Strapi is down
you also cannot ship changes to the website — even changes that have nothing to do with
content. This is written up honestly in [adr/0001-stack.md](adr/0001-stack.md).

Some content does **not** live in the CMS. Missions and the timeline live in the git
repository as files, edited through pull requests. The rule, memorised:

> **Missions and the timeline live in the repository; everything else lives in Strapi.**

## Accounts

**Every one of these must have at least two people with access.** If any row has one name,
fix that before doing anything else — that is exactly how sites are lost.

Never a personal card. Never trial credits: they expire in weeks and bind to one person's
identity.

| Service | What it is for | Owner | Backup owner | Renewal | Cost |
| --- | --- | --- | --- | --- | --- |
Every one of these is held by the **KUASAR club account**, never by an individual. That is
the rule, recorded in [adr/0002-cms.md](adr/0002-cms.md) decision 9.

| Service | What it is for | Owner | Backup owner | Renewal | Cost |
| --- | --- | --- | --- | --- | --- |
| Cloudflare | Domain, DNS, R2 media, image resizing | TBD | TBD | TBD | ~$10/yr domain |
| Render | Runs Strapi | TBD | TBD | TBD | ~$7/mo |
| Neon | Postgres behind Strapi | TBD | TBD | n/a | $0 |
| Vercel | Runs the website | TBD | TBD | n/a | $0 (Hobby) |
| GitHub (`kuasar-website` org) | Code, CI, backups. Repository is **public** | TBD | TBD | n/a | $0 |
| Google Workspace | Media archive Shared Drive **and** the Join Us / Connect Us forms | TBD | TBD | TBD | TBD |

Two of these carry more weight than their row suggests:

- **Google Workspace is not just the forms.** Its Shared Drive is the system of record for
  every original photograph on this site — see [adr/0002-cms.md](adr/0002-cms.md) decision
  6. Losing it is the one media loss this project has no recovery from.
- **Being held by "the club account" is the thing most likely to have quietly drifted.**
  Somebody in a hurry once made an account with their own address. Check each row against
  the actual login rather than against this table.

### Domain and DNS

| | |
| --- | --- |
| Apex domain | `<DOMAIN>` — TBD, not yet registered |
| Registrar | Cloudflare Registrar (see runbook step 1 for why this is not optional) |
| DNS | Cloudflare |
| Media subdomain | `media.<DOMAIN>` → bound to the R2 bucket |
| Auto-renew | **Must be on.** A lapsed domain takes the site, the media and email with it |

### Contact and social

| | |
| --- | --- |
| Club email | TBD |
| Instagram | TBD |
| LinkedIn | TBD |
| Current site maintainer | TBD |
| Faculty or club contact | TBD |

### Brand assets

| | |
| --- | --- |
| Wordmark, shipped | `apps/web/public/brand/kuasar-wordmark.svg` — in this repository |
| Wordmark, **editable source** | **TBD** — which design tool, which account, which file |
| Source file owner | TBD |

**Fill in those two TBDs.** The committed SVG is an export; it can be displayed and
recoloured but it cannot be meaningfully edited back into a source. If the source lives only
in a graduating member's personal Figma or Illustrator account, the club loses the ability to
change its own logo the day that account closes. See
[../design/brand.md](../design/brand.md).

## Running it locally

You need **Node 24 LTS**. Nothing else — npm comes with it.

```bash
git clone https://github.com/kuasar-website/kuasar-site.git
cd kuasar-site
nvm use          # reads .nvmrc; install nvm first if you do not have it
npm install
```

npm workspaces, Node 24 LTS, pinned in `.nvmrc` and in `engines`. If those versions do not
match what Vercel and Render are set to, fix that mismatch before debugging anything else —
it is a recurring source of problems that look like code bugs and are not. Vercel offers
20.x, 22.x and 24.x only, so 24 is both the newest LTS and the newest thing that deploys.

```bash
npm run dev -w apps/web      # website at http://localhost:3000
npm run develop -w apps/cms  # Strapi admin at http://localhost:1337/admin
```

The website needs environment variables to reach Strapi. Copy `apps/web/.env.example` to
`.env.local` and fill it. The secrets are in the Vercel and Render dashboards — they are
not in this repository and must never be committed.

## Deploying

**You do not deploy by hand.** Both targets deploy from git.

- Push to `main` → Vercel builds and deploys the website.
- Push to `main` → Render builds and deploys Strapi.

Pull requests get a Vercel preview URL. Use it; that is what it is for.

`main` is protected by a GitHub ruleset: you cannot push to it directly, a pull request
needs a review, and the CI checks must pass. This works because **the repository is
public** — GitHub does not offer branch protection on private repositories without a paid
plan, and that is the whole reason the repository is public rather than private. See
[adr/0005-repository-visibility.md](adr/0005-repository-visibility.md) before making it
private, because doing so silently switches the protection off rather than warning you.

**Not set up yet as of 2026-08-16.** The repository is still private and there is no
ruleset. Runbook step 0 is the sequence, and it should be done before any application code
lands. If you are reading this and it is still true, do it — it takes ten minutes now and
grows harder every month.

## Where things are

```
apps/web/            Next.js website → Vercel
apps/cms/            Strapi CMS → Render
content/missions/    Mission content (git, one directory per mission)
content/timeline/    Timeline entries (git)
design/              Design system: tokens, motion, content model, i18n, brand
docs/adr/            Architecture decisions and why they were made
docs/ops/            Runbook
openspec/            Spec-driven workflow config; config.yaml is the project constitution
```

### Where the backups are — read this part

Content backups are **not on `main`**. A normal clone will not show them.

They are on a branch called **`content-snapshots`**, written weekly by a GitHub Action. You
can also take one by hand at any time — repository → Actions → the content snapshot
workflow → **Run workflow**. Do that before a Strapi upgrade or a big editing session,
rather than hoping the schedule lands at a convenient moment.

```bash
git fetch origin content-snapshots
git log origin/content-snapshots -1 --format='%ci %s'
```

If that commit is more than two weeks old, **the backup has stopped**. Restart it before
doing anything else; see [ops/cms-runbook.md](ops/cms-runbook.md).

The backups contain **content only, never photographs**. Two things are also left out on
purpose, and both matter if you ever restore:

- **Drafts.** This repository is public and git history cannot be erased, so unpublished
  work stays out of it.
- **Alumni — the entire content type.** If an alumnus asks to be removed, unpublishing in
  Strapi has to actually remove them; a copy sitting in a public branch forever would make
  that promise false. The cost is that **alumni records have no backup at all** and would be
  re-entered by hand. That is accepted deliberately in
  [adr/0002-cms.md](adr/0002-cms.md) — do not add them to the export to make a restore
  easier.

Photographs are in R2 and are deliberately not backed up there. The system of record for
every original photograph is the **KUASAR media archive on a Google Shared Drive**, in the
club Workspace account. Not a folder in anyone's personal My Drive — those are owned by an
individual and vanish when that account closes. R2 has no object versioning of its own, so
if both the bucket and the Drive are gone, the photographs are gone. Verify the Drive
annually; the runbook says exactly what to check.

## Why things are the way they are

Do not undo a decision before reading why it was made. Each of these was written to be
read by you.

| Document | What it decides |
| --- | --- |
| [adr/0001-stack.md](adr/0001-stack.md) | Next.js on Vercel, static rendering, why dates are computed in the browser, repo layout, analytics |
| [adr/0002-cms.md](adr/0002-cms.md) | Strapi on Render, R2 media, backups, what lives in git vs the CMS, KVKK debt |
| [adr/0003-motion-stack.md](adr/0003-motion-stack.md) | Which animations may use a library and which may not, and why |
| [adr/0004-verification.md](adr/0004-verification.md) | What CI checks, and what it deliberately does not |
| [adr/0005-repository-visibility.md](adr/0005-repository-visibility.md) | Why the repository is public, and what that costs |

The three that will look wrong and are not:

- **Dates are computed in the browser, not on the server.** Pages are static, so nothing
  happens when a date passes. If you "fix" this by adding a scheduled rebuild, you will
  break the design. ADR 0001 explains it.
- **Most of the site is not allowed to use the animation library.** This is enforced in
  CI. It is not an accident. ADR 0003 explains it.
- **The repository is public.** That is deliberate: it is what makes branch protection and
  unlimited CI free. Making it private to "tidy up" would silently switch off the protection
  on `main` and put CI back under a monthly minute cap. ADR 0005 explains it.

## If you have just inherited this

In this order:

1. **Get access.** Every account in the table above, for at least two people including
   you. This is the emergency; everything else can wait a week.
2. **Check the backup is alive** with the `git log` command above.
3. **Check the media archive is alive.** Open the Google Shared Drive, confirm it is a
   Shared Drive rather than someone's My Drive, and confirm the originals are actually in
   it. This is the only copy of the photographs that this project does not manage.
4. **Check the domain renewal date** and that auto-renew is on.
5. **Run it locally.** If the instructions above do not work, fix them here — you are the
   last person who will find that easy.
6. **Do a restore drill.** Follow the restore section of the runbook once, on a local
   Strapi. Do it before you need it.
7. **Fix this document.** Every `TBD` you can fill, fill. Every fact that has changed,
   change. Then it is ready for whoever comes after you.

Welcome. The site is designed so that it does not need much from you — but it does need
that list.
