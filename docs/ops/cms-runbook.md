# CMS and media runbook

**Audience: someone who has never seen this system before.** No prior context is assumed.
If a step does not make sense, that is a bug in this document — fix it while you are here.

- **Last verified:** 2026-08-15
- **Related:** [../adr/0002-cms.md](../adr/0002-cms.md),
  [../adr/0001-stack.md](../adr/0001-stack.md), [../HANDOVER.md](../HANDOVER.md)

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
| Code + CI | GitHub | Free, private | $0 | 2,000 Actions minutes/month |

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
4. Enable **object versioning** on the bucket. This protects against an editor
   overwriting or deleting the wrong asset, which is the likeliest real incident.

Note the account ID; the S3 endpoint is
`https://<account-id>.r2.cloudflarestorage.com`.

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

After the first scheduled run, confirm a dump landed:

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
while the original photography genuinely lives somewhere durable.

So, once a year, answer these three questions in writing in
[../HANDOVER.md](../HANDOVER.md):

1. Where do the original photographs live?
2. Who owns that location?
3. Is it a club-owned archive, or is it one member's laptop or personal Drive?

**If the answer to 3 is "one member's",** the decision in ADR 0002 is void and you need an
off-provider copy of the R2 bucket. Do not leave this unresolved; it is the one assumption
in the whole media design that is not self-verifying.

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

**The dumps contain data only, never media.** Media is not in the backup by design; if the
bucket is also gone, see the annual verification above.

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
- [ ] The media system-of-record questions above are answered in writing
- [ ] The successor has read this file and [../HANDOVER.md](../HANDOVER.md) and has
      corrected anything that was wrong
