## Context

See `proposal.md` for why, and for the table of what `cms-platform` already did. The provider config in `apps/cms/config/plugins.ts` stays as it is, except for the upload-settings addition below. Media storage and edge transformation are decided in `docs/adr/0002-cms.md` §5–6, and the operator steps are in `docs/ops/cms-runbook.md` steps 1, 3 and 5. This document records only how the missing pieces are built.

Documentation checked on 2026-09-27, rather than relying on memory:

- **Next.js 16** (`nextjs.org/docs/app/api-reference/components/image`, doc version 16.3.6): `images.loader: 'custom'` + `images.loaderFile` applies a loader to every `next/image` without a prop. The loader receives `{ src, width, quality }`. **`images.qualities` is required from Next 16** (default `[75]`), and a `quality` outside the list is coerced to the nearest allowed entry. `priority` is deprecated in favour of `preload`, and the docs recommend `loading="eager"` / `fetchPriority="high"` in most cases. The repo pins `next@16.3.1`, so re-check at apply time.
- **Cloudflare Images pricing** (`developers.cloudflare.com/images/pricing/`): for images outside Cloudflare Images, "up to 5,000 unique transformations each month for free", then "$0.50 / 1,000" **on the Paid plan**. Each distinct parameter set is one unique transformation, and a repeat within the month counts once. On the Free plan, past the allowance, "existing transformations in cache will continue to be served as expected. New transformations will return a `9422` error", and "you will not be charged".
- **Cloudflare transform-via-URL**: the URL shape is `https://<ZONE>/cdn-cgi/image/<OPTIONS>/<SOURCE>`, and it requires transformations to be enabled on the zone. Same-zone sources are always allowed. `onerror=redirect` "redirects the end-user to the URL of the original source image when a fatal error prevents the image from being transformed", and it "works only if the image is in the same zone".
- **R2 custom domains** (`developers.cloudflare.com/r2/buckets/public-buckets/`): the domain must be "a zone in the same account as the R2 bucket". `r2.dev` "is rate-limited and should only be used for development purposes", and it can be disabled.
- **Strapi 5 Media Library** (`docs.strapi.io/cms/features/media-library`): "Responsive friendly upload" (default **on**) generates small/medium/large formats. "Size optimization" (default **on**) re-encodes. "Auto orientation" (default **off**). All three can be set in the admin panel or through the upload plugin config.

**Motion: none.** No animation is introduced on any route, and no import reaches an animation library.

**Per-route first-load JS:** effectively zero. `next/image` is already in the client graph (`apps/web/app/page.tsx` imports it). The custom loader adds a function of a few hundred bytes, which replaces Vercel's default loader logic. `check:budgets` in Tier A enforces this regardless.

## Goals / Non-Goals

**Goals:**
- Every image URL the site emits is a `media.kuasar.org` URL, and the build fails otherwise.
- The number of unique transformations is bounded by a fixed width set, so the free allowance is predictable.
- Alt text is required in `en` and `tr` for every image, while the image itself is chosen once.
- Space is reserved for every image before it loads.

**Non-Goals:** everything the proposal lists as out of scope. Also not in scope: blur placeholders (`placeholder="blur"` needs a `blurDataURL` per image, which is a second pipeline), art direction (`<picture>` with differently cropped sources per breakpoint), and a Lighthouse CI workflow (ADR 0004 specifies it, so it is its own change).

## Decisions

### 1. Edge loader via `images.loaderFile`, not a per-call `loader` prop

`apps/web/next.config.ts` sets `images: { loader: 'custom', loaderFile: './lib/media/cloudflare-loader.ts', deviceSizes, imageSizes, qualities: [75] }`. The loader returns:

```
https://media.kuasar.org/cdn-cgi/image/width=<w>,quality=75,format=auto,onerror=redirect/<key>
```

`<key>` is the object path, taken from the stored URL after stripping the origin. The source is therefore same-zone, which `onerror=redirect` requires.

A config-level loader means nobody can forget it. A `next/image` without the prop would silently fall back to Vercel's optimiser, which is the exact failure decision 5 of ADR 0002 exists to prevent. The alternative, a plain `<img srcset>` without `next/image`, was rejected. `next/image` already computes `srcset`/`sizes`, sets `width`/`height` and lazy-loads, and re-implementing that invites the CLS bugs this change is meant to prevent.

### 2. A fixed width set bounds the transformation count

`deviceSizes: [640, 1080, 1600, 2048]`, `imageSizes: [256, 480]`. That is **six widths**, and `next/image` only ever requests widths from this list, so it is the cap on transformations per image. Next's defaults (8 device + 8 image sizes) would allow up to 16 per image, so trimming them is what keeps the estimate below honest. The widths cover phone (1× and 2×), laptop and large desktop. Portraits and logos use the two small sizes. One quality (`75`) means quality never multiplies the count.

**Volume estimate.** This is a worst case, because it assumes every image is requested at every width in the same month:

| | Images | × widths | Unique/month worst case |
| --- | --- | --- | --- |
| Year 1 (≈ 8 Nebula Nights × 10 photos, 10 talk portraits, 1 Summit × 40 + speakers, 20 announcement covers, ≈ 40 alumni) | ≈ 200 | 6 | ≈ 1,200 |
| Year 3, all archive pages crawled | ≈ 600 | 6 | ≈ 3,600 |

Both sit inside 5,000. Real traffic requests far fewer widths per image than six, and a transformation cached earlier in the month is not recounted. The sensitive assumption is `format=auto`. If Cloudflare counts each negotiated output format (AVIF, WebP) as a separate unique transformation, the year-3 worst case roughly doubles, to ≈ 7,200. Tasks verify this against the Cloudflare dashboard once transformations are live, and the PR records the observed number.

**If the dashboard shows AVIF and WebP are counted separately**, the response is set in advance so that nobody has to re-derive it under pressure:

| Case | Images × widths × formats | Worst case/month |
| --- | --- | --- |
| Year 1 | 200 × 6 × 2 | ≈ 2,400 — still inside, no action |
| Year 3 | 600 × 6 × 2 | ≈ 7,200 — over |

1. **Trigger.** Act when the observed monthly count reaches **4,000** (80 % of the allowance), or when the image count makes the worst case above cross 5,000 — whichever comes first. The number is on the Cloudflare dashboard. The runbook's monthly backup check gains one line to read it.
2. **First lever: a single format.** Replace `format=auto` with `format=webp` in the loader. WebP is supported by every browser the site targets, so one output per width halves the count back to the table above (≈ 3,600 in the year-3 worst case). The cost is losing AVIF's smaller files for browsers that support it. That is a byte cost, not a visual or layout one. This lever is chosen first because it is a one-line change in `cloudflare-loader.ts`, leaves every `srcset` the same, and does not affect how sharp images look on any screen.
3. **Second lever, only if still over: fewer widths.** Drop `2048` from `deviceSizes` and `256` from `imageSizes`, going from six widths to four (600 × 4 × 1 = 2,400). The cost is softer images on very large and high-DPI displays, and slightly larger downloads for small portraits. It comes second because it changes what visitors actually see.
4. **Not a lever: a paid plan.** Decision 3's reasoning stands. Even when over the limit, `onerror=redirect` keeps every image visible, so exceeding the allowance is a performance cost and never a reason to put a club card on file.

Either lever is a code change to `apps/web/lib/media/cloudflare-loader.ts` or `next.config.ts`. It goes through a normal PR that updates this table with the observed numbers. The Tier A `test:media` assertions on URL shape and the width set are updated in the same PR, so the test stays the record of what the loader emits.

### 3. Past 5,000: `onerror=redirect`, no paid plan

On the Free plan, new transformations return error 9422 and cached ones keep working. With `onerror=redirect`, the visitor gets the original from `media.kuasar.org/<key>` instead of a broken image. Because every image has declared `width`/`height` (decision 5), the original is displayed at the right size with **no layout shift**. What the visitor loses is bytes: a multi-megabyte original instead of a ~100 KB derivative. The allowance resets monthly, and there is no charge.

Rejected alternatives: letting new sizes fail (a broken photograph reads as a broken site, the failure ADR 0002 names), and the paid plan ($0.50/1,000 needs a club card, and ADR 0001 sets a ~$15/month ceiling for a failure that sits inside the free allowance). The PR records this whole paragraph. `docs/adr/0002-cms.md` §5 gets one sentence stating the overflow behaviour, and the runbook troubleshooting row changes from "every image suddenly unoptimised" to "images suddenly slow/heavy → transformation allowance".

### 4. A host guard at the data boundary fails the build

`apps/web/lib/media/` exports a pure function that turns a Strapi `shared.image` value plus a locale into `{ src, width, height, alt }`. It **throws** during build when any of these hold, naming the collection, entry and field:

- the URL host is not `media.kuasar.org` (this catches `*.r2.dev`, `*.r2.cloudflarestorage.com`, the Render host, and relative `/uploads/...` paths);
- `width` or `height` is missing;
- the alt text for the requested locale is empty.

Throwing is deliberate. `cms-platform` lets `R2_PUBLIC_URL` be omitted until the domain is bound, and uploads made in that window get endpoint URLs stored in the database. The guard makes those loud at the next build instead of shipping them. The fix is to re-upload once `R2_PUBLIC_URL` is set.

The media origin is one constant, `https://media.kuasar.org`, in `lib/media`. It is not an environment variable, because a per-environment origin is how a preview build ends up blessing `r2.dev`. In `next dev` only, a non-media host is passed through **unoptimised** with a console warning, so local work against Strapi's local provider still renders. `next build` never takes that path.

This guard lives in the web app, not the CMS, because the site is what visitors see, and because `platform-foundation` requires `apps/web` to build without a reachable CMS. With no content, the guard has nothing to check and passes.

### 5. `<MediaImage>`: one component, declared dimensions, no unsized render

`apps/web/components/media/MediaImage.tsx` is a server component wrapping `next/image`. It takes the guarded value from decision 4 and passes `width`/`height` from the stored asset, plus `sizes` from the caller. When a layout needs a fixed crop, the caller passes an `aspectRatio`. The component then renders `fill` inside a box with CSS `aspect-ratio` and `object-fit: cover`, so space is still reserved. There is no path that renders an image without either real dimensions or a declared box.

The background shown while an image loads is the surface colour token from `design/tokens.md`, not a new token. Above-the-fold use takes `loading="eager"` / `fetchPriority="high"` per the Next 16 guidance, and never the deprecated `priority`.

### 6. Alt text: a non-localized `shared.image` component with `altEn` / `altTr`

New component `apps/cms/src/components/shared/image.json`:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `image` | media, `allowedTypes: ["images"]`, single | yes | |
| `altEn` | string | yes | |
| `altTr` | string | yes | |

On each content type the attribute is **`localized: false`**. In Strapi 5, non-localized attributes are shared across locales, so the photo is chosen once, and an editor on either locale sees and fills both alts. Replacing every image media field:

| Type | Field | Becomes |
| --- | --- | --- |
| Stellar Talk | `speakerPortrait` | `shared.image` |
| Nebula Night | `photos` | `shared.image`, repeatable |
| Galactic Summit | `photos` | `shared.image`, repeatable |
| Galactic Summit | `backgroundImage` | `shared.image`, optional |
| `summit.speaker` (component) | `portrait` | nested `shared.image` |
| Announcement | `coverImage` | `shared.image`, optional |
| Alumni | `photo` | `shared.image`, optional (consent rule unchanged) |
| Sponsor | `logo`, `logoLight` | `shared.image` (`logoLight` optional) |

Unchanged: `hoverVideo` (video) and `sponsorshipPdf` (file). These are not images, so alt text does not apply.

Required fields inside an **optional** component are enforced only when the component is present. Under Draft & Publish, `required` blocks publish, not draft save (the same behaviour `cms-platform` relies on for Alumni consent). That produces exactly the spec's behaviour.

**Content-model rule answered** (the config.yaml design rule): new Strapi fields are needed. The component is locale-*independent* as an attribute, but it carries per-locale text in explicit `altEn`/`altTr` columns.

Alternatives considered:
- **Localized `<field>Alt` sibling string:** fails for galleries (one alt for many photos) unless galleries are localized, which means picking each photo twice.
- **Localized component:** Strapi localizes a component all-or-nothing, so the image is duplicated per locale. That breaks "facts live once", the same reasoning `cms-platform` recorded for `speakers`.
- **Extending Strapi's file entity with `alternativeTextTr`:** keeps alt on the asset, but the Media Library UI cannot show custom file fields without an admin customisation that breaks on upgrades. It also cannot be made "required" without a custom publish hook.

The cost of the chosen option is recorded honestly: a third locale would be a schema change. `design/i18n.md` fixes the locales at exactly `en`/`tr`, so that cost is accepted.

Strapi's built-in file `alternativeText` is ignored by the site. The PR notes this, so an editor who fills it is not surprised when it has no effect.

### 7. Strapi stops making derivatives, but keeps auto-orientation

`src/index.ts` `bootstrap` writes the upload plugin settings on every boot: `responsiveDimensions: false`, `sizeOptimization: false`, `autoOrientation: true`. Apply confirms the exact settings API against current Strapi 5 docs; the fallback is the upload plugin config key. Enforcing on boot, rather than trusting the admin toggle, means a Super Admin flipping the switch is corrected at the next deploy. The code comment explains why.

**Auto-orientation stays on, deliberately.** It is the one image operation left on the instance. A phone photo is stored landscape with an EXIF "rotate 90°" tag, so without auto-orientation Strapi records swapped `width`/`height`, the browser displays the image rotated, and the reserved box has the wrong aspect ratio. That is a guaranteed layout shift on exactly the "real photographs" the acceptance criterion names. The cost is one `sharp` pass per upload. To bound its memory on the 512 MB instance, the upload `sizeLimit` is set to **25 MB**, which is more than a full-resolution launch JPEG and the matching `strapi::body` limit. A larger file is rejected at upload with Strapi's size error.

**Honest limit on "never touches disk":** Strapi's multipart parser buffers an upload in the OS temp directory for the length of the request before streaming it to R2, then deletes it. Nothing *persists* on the instance, which is what the ephemeral-disk argument in ADR 0002 is about. The spec states "persist", not "touch", for this reason.

### 8. CI: one new Tier A step, and no pretending about the rest

A root `test:media` script covers the loader and the host guard. It checks URL shape, that widths come only from the set, that `r2.dev`, the S3 endpoint and a relative `/uploads` path each throw, and that missing dimensions or a missing locale alt throw. The script is `node --test apps/web/lib/media/*.test.ts`, the same convention (Node 24 type stripping, tests beside the module) as `git-content-pipeline`'s `test:content`. `tier-a.yml` gets a "Media pipeline tests" step for it, placed after "Content pipeline tests".

**Relationship to PR #20's "Content pipeline tests" step** (checked against `main` at `c794ada`, 2026-09-27): PR #20 added `npm run test:content --if-present` to Tier A ahead of its script. The script is defined only on the unmerged `change/git-content-pipeline` branch, as `node --test apps/web/lib/content/*.test.ts`. On `main` the step currently runs nothing, and it becomes live when that branch merges. The media tests do **not** ride on it, for three reasons:

- **Scope.** Its glob is `lib/content/`, owned by `git-content-pipeline`. Widening it to `lib/media/` would make one change's script depend on another's directory layout.
- **Legibility.** A failing "Media pipeline tests" step names the broken pipeline. A failure buried inside "Content pipeline tests" sends Dev 3 looking at the wrong code.
- **No `--if-present`.** `test:media` is defined in this change, so its step calls it plainly. If the script is ever renamed or deleted, Tier A fails instead of passing silently. `--if-present` suited PR #20's situation, wiring a step before its script existed, and does not suit this one.

**Merge coordination:** this change, `change/git-content-pipeline` and `change/announcements` (which adds an unwired `test:cms`) each add a line to root `package.json` `scripts`, and the first two touch the same region of `tier-a.yml`. The conflicts are trivial, but whoever merges second resolves them. None of these steps replaces another.

**Not covered by any CI gate:**
- CLS < 0.1: ADR 0004's Lighthouse gate does not exist as a workflow yet.
- The actual R2 upload.
- `media.kuasar.org` resolution.
- The allowance.
- The CMS schema.

These are verified by hand once the blockers clear.

### 9. Operator steps land in the runbook, not in code

- **Runbook step 3:** leave `r2.dev` public access **disabled**. Enable **Images → Transformations** on the `kuasar.org` zone, allowing only same-zone sources, which is the default. Add a cache rule giving `media.kuasar.org` a long edge TTL.
- **Runbook step 5:** state that responsive formats and size optimisation are enforced off at boot.
- **Troubleshooting:** the 9422 / slow-images row.
- **ADR 0002 §5:** gains the overflow sentence and a pointer to this design.

The global `<DOMAIN>` → `kuasar.org` replacement is runbook step 1, owned by flight-ops when the transfer completes. It is **not** done here, so that the docs do not claim a zone exists before it does.

## Risks / Trade-offs

- **[Blocker] `kuasar.org` is not on Cloudflare yet; the plan is to transfer it to Cloudflare Registrar.** Registrar transfers are refused within 60 days of registration or of a previous transfer (the ICANN lock). If that applies, change nameservers to Cloudflare first (Free full setup, zone in the club account), then transfer when eligible. The R2 custom domain needs only the zone. → Recorded in tasks as a flight-ops prerequisite, not done here.
- **[Blocker] No R2 bucket.** → All live verification tasks are marked owed until runbook step 3 is done.
- **[Risk] `format=auto` may count once per negotiated format.** → The observed count is checked on the dashboard after the first month. If formats count separately, decision 2 fixes the response: switch to a single format (`format=webp`) first, cut to four widths only if that is not enough, and never a paid plan.
- **[Risk] Uploads made before `R2_PUBLIC_URL` is set carry S3-endpoint URLs.** → The host guard fails the build, and the fix is re-upload. The runbook step 5 wording already says to set it once the domain is bound. This change adds "do not upload real content before it is set".
- **[Risk] R2 has no versioning, and the edge cache hides overwrites.** Strapi's "replace media" can keep the same URL, so the edge may serve the old bytes until the TTL expires, and the previous file is unrecoverable from R2. → The durable copy is the Shared Drive (ADR 0002 §6). The runbook tells editors to upload a new asset rather than replace one when the change must be visible immediately. Nothing in R2 can undo an overwrite, and the runbook says so plainly.
- **[Risk] A Super Admin re-enables responsive formats.** → Bootstrap resets them on the next boot. Derivatives created in between are harmless extra objects.
- **[Trade-off] Past the allowance, visitors download originals.** This is slower, but nothing is broken and nothing is charged. It is chosen over broken images and over a paid plan.
- **[Trade-off] Sponsor logos:** `content-model.md` says "prefer SVG", but `plugins.ts` denies `image/svg+xml`, and Cloudflare does not resize SVG anyway. This change does not resolve that contradiction. The sponsor showcase is deferred, and it is flagged for that change.
- **[Trade-off] CLS is only fully measurable once a section renders real photographs.** → This change owes one local Lighthouse run on a throwaway, uncommitted page rendering real uploads in `/en` and `/tr`, recorded on the PR. The first consuming section repeats it on its real route.

## Migration Plan

Pre-production, with no content, so there is no data migration. The CMS schema change must merge **before** any editor enters real content. Order:

1. `cms-platform` merged (and archived before this one).
2. This change's CMS schema and upload settings.
3. Web loader, guard and component.
4. Flight-ops: zone on Cloudflare, bucket, custom domain, transformations enabled, `R2_PUBLIC_URL` set.
5. Live verification.

Rollback: revert the web commit. `next/image` then falls back to Vercel's default loader. That works, but it is exactly the coupling ADR 0002 rejects, so it is a temporary state only.

## Open Questions

None that change the specs or tasks. The observed `format=auto` counting and the exact Strapi settings API are verified during apply, and neither changes the approach.
