# CMS and media runbook

**Audience: someone who has never seen this system before.** No prior context is assumed.
If a step does not make sense, that is a bug in this document — fix it while you are here.

- **Last verified:** 2026-08-16
- **Related:** [../adr/0002-cms.md](../adr/0002-cms.md),
  [../adr/0001-stack.md](../adr/0001-stack.md),
  [../adr/0005-repository-visibility.md](../adr/0005-repository-visibility.md),
  [../HANDOVER.md](../HANDOVER.md)

`<DOMAIN>` throughout means the registered apex domain. It is not registered yet — that is
step 1. Once it exists, replace every occurrence in this repository.

## What runs where

| Piece | Provider | Plan | Cost | What it does |
| --- | --- | --- | --- | --- |
| Website | Vercel | Hobby | $0 | Serves the public site. Static, rebuilt on demand |
| CMS | Render | Starter | ~$7/mo | Strapi admin panel. Editors log in here |
| Database | Neon | Free | $0 | Postgres behind Strapi |
| Media | Cloudflare R2 | Free tier | ~$0 | Photographs and files. No egress charges |
| Image resizing | Cloudflare | Free tier | ~$0 | 5,000 unique transformations/mo free |
| Domain + DNS | Cloudflare | Registrar | ~$10/yr | `<DOMAIN>` and `media.<DOMAIN>` |
| Code + CI | GitHub | Free, **public** (step 0 — not done yet) | $0 | Unlimited Actions minutes; branch protection |
| Media archive | Google Workspace | Club account | TBD | Shared Drive holding the original photography |

**Total: roughly $7/month plus the domain.** Budget ceiling is ~$15/month — see
[../adr/0001-stack.md](../adr/0001-stack.md) before adding anything paid.

**The most important thing in this document:** if Strapi is down, *the website stays up*.
Visitors see everything normally. Only editing stops. Do not treat a Strapi outage as an
emergency — see [../adr/0002-cms.md](../adr/0002-cms.md), rule 1. The one real
consequence is that **deploys also stop**, because the build reads from Strapi.

## First-time setup

Do these in order. Later steps depend on earlier ones.

Two people should be present for every account creation, and both should have access
afterwards. This is not ceremony — it is the entire reason this document exists.

### 0. Make the repository public and protect `main`

**Do this first, and do it now** — before `apps/cms` exists. Auditing a documentation-only
history for secrets takes minutes; auditing it after the CMS lands, with its environment
handling and its config files, is real work. The cheapest moment to become public is the one
where there is nothing in the history yet. That is why this is step 0 and not the last item
on the list, which is where it would naturally have ended up.

Why public at all: GitHub does not offer branch protection on private repositories without a
paid plan, and private repositories are capped at 2,000 Actions minutes a month. Public gives
both, free. The full argument, and its costs, are in
[../adr/0005-repository-visibility.md](../adr/0005-repository-visibility.md).

In order:

1. **Audit the history for secrets.** `git log -p | grep -iE 'secret|token|password|key='`
   is a crude first pass; read anything it flags. There should be nothing — secrets live in
   the Vercel and Render dashboards — but confirm rather than assume.
2. **Settings → General → Danger Zone → Change visibility → Public.**
3. **Settings → Advanced Security:** switch on **secret scanning** and **push protection**.
   Both are free on public repositories, and push protection is the one that stops the
   mistake rather than reporting it after the fact.
4. **Settings → Rules → Rulesets → New branch ruleset** targeting `main`: require a pull
   request with one approving review, require the Tier A and Tier B status checks, and block
   force pushes. Use a ruleset rather than a legacy branch protection rule — rulesets are
   visible to contributors without admin rights, which matters when the person hitting the
   rule is rarely the person who configured it.

The status checks in point 4 cannot be required until they have run at least once, so expect
to come back and add them after CI exists. Note that down somewhere; it is the step people
forget, and a ruleset requiring nothing looks identical to one requiring everything.

If a secret ever does land after this, **rotate it, do not delete the commit.** The commit is
already cloned. Rotation order is under *Rotating credentials* below.

### 1. Register the domain

Register `<DOMAIN>` **at Cloudflare Registrar**, from the KUASAR club account.

Not a preference. R2's custom domain binding requires the zone to be on Cloudflare, so it
ends up there regardless; registering elsewhere means two accounts to hand over instead of
one, and a nameserver migration to perform. Cloudflare Registrar also sells at cost, with
no cheap-first-year-then-expensive renewal.

Record the renewal date in [../HANDOVER.md](../HANDOVER.md). **Enable auto-renew.** A
lapsed domain takes the site, the media and the email addresses with it.

Then replace `<DOMAIN>` everywhere in this repository:

```bash
grep -rl '<DOMAIN>' --exclude-dir=.git . | xargs sed -i 's/<DOMAIN>/your-domain.example/g'
```

### 2. Create the Neon database

Neon free tier, club account. Create a project and a database for Strapi.

**Do not use Render's free Postgres.** Free databases there are capped and deleted a fixed
period after creation — you will lose everything on a schedule you did not notice.

Copy the pooled connection string. Neon's free tier includes connection pooling; use the
pooled endpoint, not the direct one, because Strapi opens more connections than the direct
endpoint is comfortable with.

### 3. Create the R2 bucket

In the Cloudflare account:

1. Create an R2 bucket for media.
2. Bind a **custom domain**: `media.<DOMAIN>`. Do **not** use the default `r2.dev` URL —
   it is rate-limited and explicitly not for production.
3. Create an R2 API token scoped to that bucket. Save the access key ID and secret.

Note the account ID; the S3 endpoint is
`https://<account-id>.r2.cloudflarestorage.com`.

**Do not go looking for object versioning — R2 does not have it.** `GetBucketVersioning`
and `PutBucketVersioning` are unimplemented and there is no `ListObjectVersions`. R2's
lifecycle rules expire and transition objects by age, which is a retention policy and the
opposite of what you would want here. There is no way to recover an asset an editor
overwrote. That is why the durable copy lives off-provider — see step 3a.

### 3a. Confirm the media archive Shared Drive

This is a five-minute step that carries more of the media design than anything else in this
document. [../adr/0002-cms.md](../adr/0002-cms.md) decision 6 says media is not backed up by
this project, and that is only safe because the originals live somewhere else.

In the club Google Workspace account, confirm there is a **Shared Drive** holding the
original photography, and record its name and owner in [../HANDOVER.md](../HANDOVER.md).

**Shared Drive, not My Drive.** A folder in an individual's My Drive is owned by that
person's account and goes away when the account is closed — which, on a team with annual
turnover, is a scheduled event rather than an accident. If what exists today is a personal
folder, move it into a Shared Drive now, while somebody still has the access to do it.

If there is no such Drive at all, stop and say so. Decision 6 in ADR 0002 is void without
it, and an off-provider copy of the R2 bucket becomes necessary instead.

### 4. Deploy Strapi to Render

Create a Render **Starter** web service pointing at this repository, root directory
`apps/cms`.

Environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (step 2) |
| `R2_ACCESS_KEY_ID` | From step 3 |
| `R2_ACCESS_SECRET` | From step 3 |
| `R2_BUCKET` | Bucket name |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `CLIENT_URL` | `https://<DOMAIN>` |
| `PREVIEW_SECRET` | Generate a long random string; also set it in Vercel |
| `REVALIDATE_SECRET` | Generate a long random string; also set it in Vercel |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT` | Strapi secrets — generate fresh, never reuse across environments |

**Watch the first build.** Strapi's admin-panel build is memory-hungry and out-of-memory
during build is the single most common Strapi deployment failure. If it fails on Starter's
512 MB:

- **Do not** immediately upgrade the instance. The spike is at build time, not run time —
  a bigger instance would be paid for year-round to solve a problem that exists for two
  minutes.
- Build the admin panel in GitHub Actions and deploy the artifact instead.

Create the first admin user through the Render URL as soon as the service is live, before
anyone else finds it.

### 5. Configure the upload provider

In `apps/cms/config/plugins.js`, the `aws-s3` provider with R2 settings. Two details that
cause the usual failed first attempt:

- **Omit `ACL` entirely.** R2 does not support ACLs. Nearly every S3 example on the
  internet sets it, and it fails.
- `region: 'auto'`.

Upload a test image through the Strapi Media Library and confirm it appears at
`https://media.<DOMAIN>/...`. If the URL works but the image is missing from the admin
panel, the bucket binding is right and the provider config is wrong; if the reverse, the
opposite.

### 6. Wire the publish webhook

In Strapi → Settings → Webhooks, create a webhook to
`https://<DOMAIN>/api/revalidate?secret=<REVALIDATE_SECRET>` firing on publish,
unpublish, update and delete.

Confirm end to end: publish a change, wait a few seconds, reload the public page. If the
page does not change, the webhook is not reaching Vercel — check the webhook's delivery
log in Strapi first, before touching any code.

### 7. Configure preview

Strapi's `admin.preview` config points at `https://<DOMAIN>/api/preview`, with
`allowedOrigins` listing the frontend URL and the shared `PREVIEW_SECRET`.

If preview shows a blank frame, it is almost always the iframe: `apps/web` must permit
framing from the Strapi origin on the preview route. See
[../adr/0002-cms.md](../adr/0002-cms.md), decision 8, which also records that Strapi's own
documentation example calls `draftMode()` without awaiting it — that is the pre-Next-15
API and will not work here.

### 8. Enable the snapshot export

The workflow lives on `main` at `.github/workflows/content-snapshot.yml` and commits dumps
to the **`content-snapshots` branch**, never to `main`.

Both halves matter. GitHub only fires `schedule` triggers from the default branch, so the
file must be on `main`. Committing the dumps to `main` would trigger a production deploy
on every export, turning the backup into a scheduled site rebuild — which
[../adr/0001-stack.md](../adr/0001-stack.md) forbids.

It runs on two triggers:

- `schedule`, **weekly**. Bounds the worst case at six days of lost editing, and the weekly
  commit resets GitHub's 60-day scheduled-workflow timer by itself.
- `workflow_dispatch`, so anyone can run it by hand from the Actions tab. Use it before a
  content-model migration, a Strapi upgrade, or a heavy editing session. The schedule covers
  the days nobody is thinking about backups; the manual run is for the day you already know
  you are about to do something risky.

**Two things must be true before this workflow ever runs, because the repository is
public** (see [../adr/0005-repository-visibility.md](../adr/0005-repository-visibility.md)):

- **Alumni are excluded from the export entirely** — the whole content type, not just its
  consent fields. Git history cannot be erased once it is public, so an alumnus asking to be
  removed could be honoured on the site and not in the backup. Keeping them out of the dump
  is what makes that request answerable.
- **The export is restricted to published entries.** An unfiltered Strapi export includes
  drafts, and a draft committed to a public branch is public permanently — a force-push is
  not a redaction once anyone has cloned or GitHub has cached it.

Both are argued in [../adr/0002-cms.md](../adr/0002-cms.md), *Known debt: KVKK*. Neither may
be relaxed to make restores easier; the cost of the first one is recorded there as an
accepted consequence.

**Trigger the workflow by hand once and open the dump before trusting the schedule.** Search
it for an alumnus's name and for a known draft. Finding either means the filters are not
working, and the time to discover that is while the repository is still private. Then confirm
it landed:

```bash
git fetch origin content-snapshots
git log origin/content-snapshots --oneline -5
```

## Routine operations

### Adding an editor

Strapi → Settings → Administration Panel → Users. Invite by email, assign the **Editor**
role, not Super Admin. Super Admin is for the two people named in
[../HANDOVER.md](../HANDOVER.md) and nobody else — an editor who can change the content
model can break the build.

### Monthly: confirm the backup is still running

Takes thirty seconds. Do not skip it; a backup that stopped silently is worse than no
backup, because you will believe you have one.

```bash
git fetch origin content-snapshots
git log origin/content-snapshots -1 --format='%ci %s'
```

If the newest commit is more than two weeks old, the scheduled workflow has stopped. The
likeliest cause is GitHub disabling it after 60 days of repository inactivity. Re-enable
it under the repository's Actions tab, then investigate why the repository went quiet.

### Annually: verify the media system of record

[../adr/0002-cms.md](../adr/0002-cms.md) decides that **R2 is a CDN, not a system of
record** — losing the bucket costs re-upload effort, not data. That decision is only valid
while the original photography genuinely lives somewhere durable, and R2 itself offers
nothing here: it has no object versioning, so it cannot even recover a single overwritten
file.

The named system of record is the **KUASAR media archive Shared Drive** in the club Google
Workspace account. Once a year, confirm all four of these in writing in
[../HANDOVER.md](../HANDOVER.md):

1. The Shared Drive still exists and you can open it.
2. It is a **Shared Drive**, not a folder in some individual's My Drive. Check this every
   time — it is the one that silently regresses, because moving files is easy and moving
   them back is nobody's job.
3. A current member is named as its owner, and a second has access.
4. Recent launches and events are actually in it. An archive that stopped being filled two
   years ago is a stale archive, and it will pass questions 1 to 3 while doing so.

**If any answer is no,** the decision in ADR 0002 is void and you need an off-provider copy
of the R2 bucket. Do not leave it unresolved; it is the one part of the media design that
does not verify itself.

### Rotating credentials

When someone with access leaves, rotate in this order: Strapi admin users first (remove
theirs), then `PREVIEW_SECRET` and `REVALIDATE_SECRET` in both Render and Vercel, then the
R2 API token, then the Neon connection string. Update
[../HANDOVER.md](../HANDOVER.md) as you go.

## Restoring from a backup

The dumps are on the `content-snapshots` branch, **not on `main`**. Someone cloning this
repository normally will not see them, which is the known weakness of this backup design.

```bash
git fetch origin content-snapshots
git checkout origin/content-snapshots -- content/_snapshots/
ls content/_snapshots/
```

Then import into Strapi with its transfer/import tooling, pointing at the chosen dump.
Verify the Strapi major version matches the one the dump was taken from before importing —
a dump from a different major is not guaranteed to import cleanly.

**The dumps contain data only — never media, never drafts, and never Alumni.**

Two of those will bite you during a restore, so know them before you start:

- **Media** is not in the backup by design. If the bucket is also gone, see the annual
  verification above.
- **Alumni will be missing entirely, and no dump anywhere has them.** You will have to
  re-enter the records by hand from the club's own membership records; the portraits are in
  the media Shared Drive. This is deliberate and is explained in
  [../adr/0002-cms.md](../adr/0002-cms.md) — do not "fix" it by adding Alumni to the export.

  **Do not re-publish a portrait you cannot evidence consent for.** The `consentSource` and
  `consentRecordedAt` fields are lost with everything else, and they are records of a past
  event rather than facts you can look up. Re-enter the alumnus without the photograph and
  the LinkedIn URL until consent is obtained again. The content model is designed so the
  card still renders without them.

## Troubleshooting

| Symptom | Most likely cause |
| --- | --- |
| Strapi build fails on Render | Admin-panel build OOM in 512 MB. Build the admin in CI; do not upsize first |
| Upload fails with an ACL error | `ACL` is set in the provider config. R2 does not support it — remove it |
| Images 404 at `media.<DOMAIN>` | Custom domain not bound to the bucket, or DNS not propagated |
| Every image suddenly unoptimised | Transformation allowance exceeded. Check Cloudflare usage; 5,000 unique/mo are free |
| Published change does not appear | Webhook not reaching Vercel. Check Strapi's webhook delivery log first |
| Preview shows a blank frame | Frontend is refusing to be framed by the Strapi origin |
| Preview 401s | `PREVIEW_SECRET` differs between Render and Vercel |
| Site builds fail, frontend unchanged | Strapi is down. The build reads from Strapi — see ADR 0001, Consequences |
| Dates show the wrong "upcoming" state | Something computed time on the server. All time-relative state is client-derived — ADR 0001, rule 3 |

## Handover checklist

Before the person who set this up leaves:

- [ ] Every account in [../HANDOVER.md](../HANDOVER.md) has **two** people with access
- [ ] No account is on a personal card, and no account depends on trial credits
- [ ] Domain auto-renew is on, renewal date recorded
- [ ] Two Strapi Super Admins exist, both still active members
- [ ] A restore from `content-snapshots` has been performed at least once, by someone
      other than the person who set up the export
- [ ] The export filters are verified: a dump has been opened and searched, and it contains
      **no Alumni record and no draft**
- [ ] The media system-of-record questions above are answered in writing, and the archive
      is a Shared Drive rather than an individual's My Drive
- [ ] `main` is protected by a ruleset, and the repository is still public — the two are
      the same fact, per [../adr/0005-repository-visibility.md](../adr/0005-repository-visibility.md)
- [ ] Secret scanning and push protection are on
- [ ] The successor has read this file and [../HANDOVER.md](../HANDOVER.md) and has
      corrected anything that was wrong
