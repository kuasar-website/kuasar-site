# CMS and media runbook

**Audience: someone who has never seen this system before.** No prior context is assumed.
If a step does not make sense, that is a bug in this document — fix it while you are here.

- **Last verified:** 2026-08-16 (media steps 3 and 5 revised 2026-09-27, not yet run against a live bucket)
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
| CMS | DigitalOcean | App Platform, 512 MB container | ~$5/mo | Strapi admin panel. Editors log in here |
| Database | Neon | Free | $0 | Postgres behind Strapi |
| Media | Cloudflare R2 | Free tier | ~$0 | Photographs and files. No egress charges |
| Image resizing | Cloudflare | Free tier | ~$0 | 5,000 unique transformations/mo free |
| Domain + DNS | Cloudflare | Registrar | ~$10/yr | `<DOMAIN>` and `media.<DOMAIN>` |
| Code + CI | GitHub | Free, **public** (step 0 — not done yet) | $0 | Unlimited Actions minutes; branch protection |
| Media archive | Google Workspace | Club account | TBD | Shared Drive holding the original photography |

**Total: roughly $5/month plus the domain.** Budget ceiling is ~$15/month — see
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
   the Vercel and DigitalOcean dashboards — but confirm rather than assume.
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

Copy the pooled connection string. Neon's free tier includes connection pooling; use the
pooled endpoint, not the direct one, because Strapi opens more connections than the direct
endpoint is comfortable with.

### 3. Create the R2 bucket

In the Cloudflare account:

1. Create an R2 bucket for media.
2. Bind a **custom domain**: `media.<DOMAIN>`. Do **not** use the default `r2.dev` URL —
   it is rate-limited and explicitly not for production.
3. Create an R2 API token scoped to that bucket. Save the access key ID and secret.
4. Leave the bucket's **`r2.dev` public access disabled** (the default). The custom domain
   is the only public route to the media; the site's build refuses any `r2.dev` URL anyway.
5. On the `<DOMAIN>` zone, **enable Images → Transformations**, keeping accepted sources at
   the default (same zone only). Without it every `/cdn-cgi/image/...` URL fails and
   visitors get the full-size originals.
6. Add a **cache rule** for `media.<DOMAIN>` with a long edge TTL. Uploaded files get a
   unique name, so they never change in place.

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

### 4. Deploy Strapi to DigitalOcean App Platform

Create the DigitalOcean account under the club (decision 9 of ADR 0002). If a card is
declined, add **PayPal** as the payment method instead — that is why DigitalOcean was
chosen over Render.

Create an App Platform app from a **container image** (not from a GitHub repository — a
source build OOMs). It does **not** build from source; it pulls a prebuilt image:

- **Image:** registry type **GitHub Container Registry**, repository
  `kuasar-website/kuasar-site/cms`. Create the app with tag `latest`; from the first
  workflow deploy on, the workflow **pins the service to an immutable image digest**, and
  that digest is the deployment's source of truth. Published by
  `.github/workflows/cms-deploy.yml` on every push to `main` that touches `apps/cms/**`,
  and on a manual run from `main`. The admin panel is compiled in that workflow, never on the
  instance — this is the fix for the 512 MB OOM below, applied ahead of time rather than
  after a failed deploy.
- **GHCR package visibility: public.** In the `kuasar-website` org, Packages → `cms` →
  Package settings → Change visibility → Public. Leave App Platform's registry
  credentials empty. A private package would need a personal GitHub token that breaks
  when its owner leaves — see ADR 0002 decision 4.
- **Size and region:** the $5/month 512 MB container, region Frankfurt (`fra`). HTTP port
  `1337`.
- **Deploy trigger:** App Platform does not redeploy by itself when a GHCR image changes.
  So the workflow's `deploy` job uses DigitalOcean's official deploy action (pinned to a
  commit) to set the service `kuasar-website-kuasar-site-cms` to **the exact digest that
  run built**. It then waits for the deployment. Only the image reference changes; every
  environment variable and secret is carried over. Repository settings:
  - **Actions variable** `DIGITALOCEAN_APP_NAME` = `kuasar-cms`, the app's name.
  - **Actions secret** `DIGITALOCEAN_ACCESS_TOKEN`: API → Tokens → Generate, **custom
    scopes limited to `app`** (read and update), not full access. Record its expiry in
    [../HANDOVER.md](../HANDOVER.md).

  If the service is ever renamed, change `COMPONENT` and the `IMAGE_DIGEST_…` key in the
  workflow to match. Without the variable or token, the deploy job fails before touching
  production.
- **What a green CMS deploy means.** The run is green only if **all** of these held, and
  each value is listed in the run's summary:
  1. App Platform reached **Active**;
  2. the active deployment runs **the digest this run built**;
  3. the live CMS reports **this run's commit** at `GET /_version`, which proves what is
     actually serving traffic;
  4. `GET /_health` returns 204;
  5. an unauthenticated `?status=draft` request still returns 403 (the draft guard).

  The image carries its commit in `/app/BUILD_COMMIT`, a file and not an environment
  variable, so App Platform settings can't fake it. `/_version` returns only
  `{"commit": …}`, which is a public commit in a public repository. A red run means
  production may **not** be running the merged CMS; see Troubleshooting.
- **Only `main` deploys.** A manual run from another branch only builds the image and checks
  its baked commit; it pushes and deploys nothing.
- **Manual Force Rebuild and Deploy** (App → Actions) is an **emergency fallback**, not the
  deployment path. It redeploys the **pinned digest**, not `latest`. Afterwards, check
  `/_version`, `/_health` and `?status=draft` by hand.
- **Do not** create the app from the GitHub repository "to try it first" — that is a
  source build, and it OOMs. Container image from the start.

Environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (step 2) |
| `R2_ACCESS_KEY_ID` | From step 3 |
| `R2_ACCESS_SECRET` | From step 3 |
| `R2_BUCKET` | Bucket name |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | `https://media.<DOMAIN>` — the bound custom domain (step 3). Omit until it is bound; uploads still work, URLs just point at the endpoint |
| `CLIENT_URL` | `https://<DOMAIN>` |
| `PREVIEW_SECRET` | Generate a long random string; also set it in Vercel |
| `REVALIDATE_SECRET` | Generate a long random string; also set it in Vercel |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT` | Strapi secrets — generate fresh, never reuse across environments |

**The admin OOM is already handled.** Strapi's admin-panel build is memory-hungry and
out-of-memory during build is the single most common Strapi deployment failure. Because the
App Platform app runs a prebuilt image (step 4) and only ever calls `strapi start`, that
build never runs on the 512 MB instance. If you ever see an OOM on App Platform, something
has reverted the app to a source build — fix that, do **not** upsize the instance. The
spike is at build time, not run time.

Create the first admin user by hand through the App Platform URL (`/admin`) as soon as the
app is live, before anyone else finds it. No Super Admin is created in code.

### 5. Configure the upload provider

`apps/cms/config/plugins.ts` already wires the `aws-s3` provider for R2. In production it
throws on startup if the `R2_*` variables are missing, so there is no silent fall back to
local disk. Two details that cause the usual failed first attempt are already applied:

- **`ACL` is omitted entirely.** R2 does not support ACLs. Nearly every S3 example on the
  internet sets it, and it fails.
- `region: 'auto'`.

Your job here is just to set the `R2_*` variables (step 4 table) and, once
`media.<DOMAIN>` is bound, `R2_PUBLIC_URL`.

**Do not upload real content before `R2_PUBLIC_URL` is set.** Strapi stores each file's URL
at upload time; without it the URL points at the raw R2 endpoint, and the site's build
refuses such images. The fix is to re-upload them after setting the variable.

Also already applied, so do not "fix" them in Settings → Media Library:

- **Responsive formats, size optimisation and auto-orientation are forced off on every
  boot** (`apps/cms/src/index.ts`). Resizing happens at Cloudflare's edge, and the original
  is kept byte-for-byte. Strapi still makes one small admin thumbnail; the site never uses it.
- **Rotated phone photos** get their displayed width and height recorded by
  `apps/cms/src/extensions/upload/strapi-server.ts`, so pages do not shift when they load.
- **Alt text lives on the entry, not on the file.** Each image field asks for an English and
  a Turkish alt, both required to publish. Strapi's own "Alternative text" field on the file
  is not used by the site.
- **Uploads are capped at 25 MB.**

**Prefer uploading a new file over "Replace media".** R2 has no versioning, so the replaced
file is gone for good (the original should still be in the Shared Drive, step 3a), and the
edge cache can keep serving the old image under the same URL until its TTL expires.

Upload a test image through the Strapi Media Library and confirm it appears at
`https://media.<DOMAIN>/...`. If the URL works but the image is missing from the admin
panel, the bucket binding is right and the provider config is wrong; if the reverse, the
opposite.

### 6. Wire the publish webhook

In Strapi → Settings → Webhooks, create a webhook:

- **URL:** `https://<DOMAIN>/api/revalidate`. Never put the secret in the URL; it would
  be written to request logs.
- **Headers:** `Authorization` = `Bearer <REVALIDATE_SECRET>`. The same value is set as
  `REVALIDATE_SECRET` in Vercel (Production and Preview).
- **Events:** Entry create, update, delete, publish and unpublish; Media update and delete.

The handler (`apps/web/app/api/revalidate/route.ts`) calls `revalidateTag(tag, 'max')` for
the tags mapped to that content type in `apps/web/lib/strapi/registry.ts`. That covers
both locales and the sitemap. It rejects calls without the header (401) and with a query
secret.

**Known open gap (publish-integration task 6.4):** with `'max'`, the **first** page view
after a publish can still show the old content while the page regenerates, and the next
view shows the change. `revalidatePath` is deliberately **not** used: on the current
localized routes, it made pages 404 until the next deploy.

Confirm end to end: publish a change, wait a few seconds, reload the public page (once
more if the first view is still old; see above). If the page still doesn't change, check
the webhook's delivery log in Strapi first, before touching any code.

### 7. Configure preview

Environment variables (names only; values are never written down anywhere else):

| Where | Variable | What |
| --- | --- | --- |
| Vercel | `PREVIEW_SECRET` | Shared preview secret, the same value as in App Platform |
| Vercel | `STRAPI_PREVIEW_TOKEN` | A Strapi **custom** API token with `find`/`findOne` on Stellar Talk, Nebula Night, Schedule Event and Galactic Summit. It reads drafts for preview only. Never Alumni |
| App Platform | `CLIENT_URL` | The frontend origin, e.g. `https://<DOMAIN>` |
| App Platform | `PREVIEW_SECRET` | The same value as in Vercel |

`apps/cms/config/admin.ts` enables Strapi's preview only when `CLIENT_URL` and
`PREVIEW_SECRET` are both set. It lists `CLIENT_URL` in `allowedOrigins`, and builds
`<CLIENT_URL>/api/preview?…` from the content type, document, locale and status only.
`/api/preview` derives the page itself (never from the URL), turns on Next.js Draft Mode
(`const draft = await draftMode()`), and redirects there. Draft Mode pages read drafts
with `STRAPI_PREVIEW_TOKEN`, are `noindex`, and may be framed only by the Strapi origin.
Public pages are unaffected. `POST /api/preview/exit` leaves Draft Mode.

Drafts are readable only with an API token. The Public role gets 403 for `?status=draft`
(`apps/cms/src/draft-guard.ts`), so preview **needs** `STRAPI_PREVIEW_TOKEN`.

If preview shows a blank frame, it's almost always the iframe: check `CLIENT_URL` and the
`STRAPI_URL` the frontend was built with. See
[../adr/0002-cms.md](../adr/0002-cms.md), decision 8, which also records that Strapi's own
documentation example calls `draftMode()` without awaiting it. That's the pre-Next-15 API
and won't work here.

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

**How it exports, and why that mechanism:** the workflow is a plain HTTP client
(`scripts/content-snapshot/export.mjs`) calling the production Strapi REST Content API with a
dedicated, scoped API token — **not** a direct database connection, and not Strapi's own
`export` CLI. It never boots Strapi and needs no database credential of any kind. Two GitHub
Actions secrets make it work:

| Secret | What it is |
| --- | --- |
| `CONTENT_BACKUP_API_TOKEN` | A Strapi **custom**-type API token (Settings → API Tokens), granted `find`/`findOne` on exactly the six exported content types below — no other action, no other content type, and explicitly **never** Alumni |
| `CMS_BASE_URL` | The production Strapi host |

Neither secret exists yet as of this writing — create the token and add both secrets before
the first run (manual or scheduled) can succeed. See
[openspec/changes/content-backup/design.md](../../openspec/changes/content-backup/design.md),
"Mechanism," for the full reasoning (in short: a direct database connection, even scoped,
risks a write/migration path this read-only job has no need for).

**Two things must be true before this workflow's output can be trusted, because the
repository is public** (see
[../adr/0005-repository-visibility.md](../adr/0005-repository-visibility.md)):

- **Alumni are excluded from the export entirely** — the whole content type, not just its
  consent fields. Git history cannot be erased once it is public, so an alumnus asking to be
  removed could be honoured on the site and not in the backup. Keeping them out of the dump
  is what makes that request answerable. This export never queries Alumni at all, and the API
  token above is never granted permission on it either — two independent layers, not one.
- **The export is restricted to published entries.** Every request explicitly asks for
  `status=published`; nothing in the workflow, the script, or its configuration can ask for
  drafts instead. An unfiltered export would include drafts, and a draft committed to a
  public branch is public permanently — a force-push is not a redaction once anyone has
  cloned or GitHub has cached it.

Both are argued in [../adr/0002-cms.md](../adr/0002-cms.md), *Known debt: KVKK*. Neither may
be relaxed to make restores easier.

**Exactly six content types are exported** — Stellar Talk, Nebula Night, Galactic Summit,
Schedule Event, Announcement, Sponsor — in both `en` and `tr`. Alumni is the seventh and is
not among them.

**Trigger the workflow by hand once and open the dump before trusting the schedule.** Search
it for an alumnus's name and for a known draft. Finding either means the filters are not
working. Then confirm it landed:

```bash
git fetch origin content-snapshots
git log origin/content-snapshots --oneline -5
```

**Restoring** is a manual, human-run procedure, and is only ever rehearsed against a
disposable, non-production Strapi instance (the same local-Postgres pattern used to verify
`cms-platform` — never directly against production). See
[openspec/changes/content-backup/design.md](../../openspec/changes/content-backup/design.md),
"Restore procedure," for the exact steps, including the one field (Announcement's `slug`)
that must be set explicitly from the snapshot rather than regenerated.

**As of this writing, none of the above has actually run yet.** The workflow and script are
implemented; the token has not been created, no manual run has happened, `content-snapshots`
does not exist yet, and no restore drill has been performed. Treat this section as accurate
about *how it works* and not yet as evidence that it *has* worked — the live walkthrough
above is still owed.

## Routine operations

### Adding an editor

Strapi → Settings → Administration Panel → Users. Invite by email, assign the **Editor**
role, not Super Admin. Super Admin is for the two people named in
[../HANDOVER.md](../HANDOVER.md) and nobody else — an editor who can change the content
model can break the build.

**Then check Settings → Administration Panel → Roles → Editor's Delete and Publish
permissions are actually on.** Confirmed live, 2026-09-30: the built-in Editor role does not
reliably ship with Delete and Publish enabled by default — Read/Create/Update were on,
Delete/Publish were not, and had to be turned on by hand. `apps/cms`'s bootstrap code only
asserts the Editor role exists; it does not set or verify its action permissions, on purpose
(see `openspec/changes/cms-platform/design.md`, Risks). Verify this once per environment
(a fresh App Platform deploy or a new database both count), not once per new editor invited
to an already-configured environment.

### Monthly: confirm the backup is still running

Takes thirty seconds. Do not skip it; a backup that stopped silently is worse than no
backup, because you will believe you have one.

**Who:** whichever Super Admin performs the monthly CMS check (see
[../HANDOVER.md](../HANDOVER.md)'s accounts section for who that currently is). This is a
documented operational check, not an automated alert — nothing pages anyone if it lapses.

```bash
git fetch origin content-snapshots
git log origin/content-snapshots -1 --format='%ci %s'
```

If the newest commit is more than two weeks old, the scheduled workflow has stopped. The
likeliest cause is GitHub disabling it after 60 days of repository inactivity. Re-enable
it under the repository's Actions tab, then investigate why the repository went quiet.

While you are here, read this month's **unique transformations** count on the Cloudflare
dashboard (Images → Transformations). At **4,000 or more**, the site is approaching the free
5,000: switch the image loader to a single output format first, and cut the width set only
if that is not enough — the media-pipeline change's design, decision 2, has the numbers.

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

### Upgrading Strapi

Upgrade with `npm run upgrade -w apps/cms` (Strapi's own upgrade tool), never by editing one
`@strapi/*` version by hand — a partial upgrade splits the packages and the CMS stops booting.
Take a snapshot first (step 8, manual run).

**Then re-check the upload extension, every time — patch releases included.**
`apps/cms/src/extensions/upload/strapi-server.ts` wraps a Strapi internal (the upload
plugin's `image-manipulation.getDimensions`) so that phone photos rotated by EXIF are
recorded with their displayed width and height. Strapi does not promise to keep that
internal stable, so an upgrade can break it in two ways:

1. **Strapi renamed or removed it.** The CMS refuses to start with an error naming
   `strapi-server.ts`. Find where the new version records image dimensions and re-point the
   extension; do not just delete it, or rotated photos will shift pages again.
2. **Strapi started recording displayed dimensions itself.** Then the extension would swap
   them back. Nothing crashes — photos just get the wrong shape.

Both are caught by the same tests, which also run in Tier A:

```bash
npm run test:media
```

If the test *"Strapi alone still records STORED dimensions"* fails, case 2 has happened:
delete the extension (and `exif-dimensions.ts` and its test) rather than "fixing" the test.
Any other failure in `exif-dimensions.test.ts` means case 1.

Finally, by hand: upload a portrait photo taken on a phone and confirm the Media Library shows
it taller than wide. While you are in Settings → Media Library, confirm the three toggles
`apps/cms/src/index.ts` forces off still exist under the same names; if Strapi renamed them,
update `UPLOAD_SETTINGS` there.

**After every upgrade, re-check that drafts stay private.** Strapi 5's Content API honours
`?status=draft` for any caller with `find`, Public role included. `apps/cms/src/draft-guard.ts`
restricts draft reads on `/api/*` to API tokens. Run `node tests/cms-drafts/check.mjs` with
`DATABASE_URL` pointing at a **throwaway** Postgres database (never production). It boots
this CMS and must report public draft reads refused (403), and API-token draft reads
allowed. CI runs it as *Tier B CMS drafts* on any `apps/cms` change.


### Rotating credentials

When someone with access leaves, rotate in this order: Strapi admin users first (remove
theirs), then `PREVIEW_SECRET` and `REVALIDATE_SECRET` in both App Platform and Vercel, then the
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
| A Content API call returns 403 "Draft content requires an API token." | A caller without an API token asked for `status=draft`. That's the intended refusal (`apps/cms/src/draft-guard.ts`). Public callers only ever get published content; preview and backups use API tokens |
| Strapi build fails on App Platform | The component is doing a source build. It must be a container-image component running the GHCR image from `cms-deploy.yml` (step 4) — the admin is built in CI. Do not upsize |
| `cms-deploy.yml` deploy job fails at "Check deploy configuration" | `DIGITALOCEAN_ACCESS_TOKEN` secret or `DIGITALOCEAN_APP_NAME` variable missing. A 401/403 from DigitalOcean means the token is expired or lacks the `app` scope. See step 4 |
| CMS deploy red: deployment not Active (Error, Canceled, Superseded or timeout) | Open App → Activity → that deployment's logs. Superseded means someone deployed during the run; re-run the workflow from `main`. Otherwise fix forward on `main`. The app may now pin the failed digest: to restore service fast, set the image to the last good digest from an earlier green run's summary (GHCR keeps `sha-<commit>` tags) |
| CMS deploy red: digest mismatch | The service name in the workflow (`COMPONENT`, `IMAGE_DIGEST_…`) no longer matches App Platform. Fix the workflow and re-run from `main` |
| CMS deploy red: `/_version` commit mismatch, 404 or malformed | Production isn't serving the image this run built (the old revision is still live). Check Activity. Re-run the workflow from `main`; use Force Rebuild and Deploy only as an emergency fallback, then check `/_version` by hand |
| CMS deploy red: `/_health` not 204, or `?status=draft` not 403 | The new revision is unhealthy, or the draft guard regressed. Treat a draft 200 as a security incident: roll back to the last good digest and investigate |
| App Platform cannot pull the image | The GHCR package was made private. Set it back to public (step 4) |
| Upload fails with an ACL error | `ACL` is set in the provider config. R2 does not support it — remove it |
| Images 404 at `media.<DOMAIN>` | Custom domain not bound to the bucket, or DNS not propagated |
| Images suddenly slow or heavy (full-size files) | Transformation allowance exhausted: new sizes return 9422 and `onerror=redirect` serves the originals. Nothing is broken and nothing is charged; it resets next month. Check the count on the Cloudflare dashboard (see *Monthly*) |
| Every image broken or full-size from the first deploy, never resized | Transformations not enabled on the zone (step 3, item 5). A `Cf-Resized` response header on a `/cdn-cgi/image/` URL shows whether resizing was attempted |
| Site build fails with `[media] ... is not on https://media.<DOMAIN>` | Images uploaded before `R2_PUBLIC_URL` was set (step 5). Set it, re-upload the named image |
| Site build fails with `[media] ... alt text is empty` | The named entry's image lacks its English or Turkish alt. Fill both in Strapi and republish |
| Published change does not appear | First, reload once more: the first view after a publish can still be stale (`'max'`; known gap, step 6). Then check Strapi's webhook delivery log: a 401 means the `Authorization` header or `REVALIDATE_SECRET` is wrong or missing |
| Preview shows a blank frame | Framing refused (the frontend only allows the Strapi origin it was built with, from `STRAPI_URL`), or the browser blocks third-party cookies in the iframe. Use Strapi's "open in new tab" preview |
| Preview 401s | `PREVIEW_SECRET` differs between App Platform and Vercel |
| Preview page errors with "STRAPI_PREVIEW_TOKEN is not set" | Set `STRAPI_PREVIEW_TOKEN` in Vercel (step 7) and redeploy |
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
