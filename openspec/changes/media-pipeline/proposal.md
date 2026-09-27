## Why

`cms-platform` gets uploads into R2, and nothing else: no page can show a photograph yet. As things stand, `next/image` would route every image through Vercel's optimiser, the very coupling `docs/adr/0002-cms.md` decision 5 rejects. Strapi still resizes every upload on the 512 MB Render instance. And no image has alt text in either locale. Every photography-led section (Stellar Talk, Nebula Night, Galactic Summit, Announcements, Alumni) is blocked on this change.

## Already done vs. still missing

`cms-platform` is not archived yet, but its R2 work is implemented and is **not redone here**:

| Task requirement | State |
| --- | --- |
| S3 provider against R2, `region: 'auto'`, endpoint `https://<account-id>.r2.cloudflarestorage.com`, `ACL` omitted | **Done** — `apps/cms/config/plugins.ts` |
| Production refuses to start without `R2_*` (no silent fallback to disk) | **Done** — `cms-platform` task 6.2 |
| `R2_PUBLIC_URL` → provider `baseUrl`; admin CSP allows the media hosts | **Done** — `plugins.ts`, `middlewares.ts` |
| Uploads never touch the instance disk | **Partly done.** Nothing is *stored* on disk, but Strapi's default "responsive friendly upload" and "size optimisation" still run `sharp` on the instance and write derived formats. That duplicates edge resizing and spends Starter memory. **Missing.** |
| Resize at Cloudflare's edge, not `next/image` on Vercel | **Missing.** `apps/web/next.config.ts` is empty, so `next/image` uses Vercel's optimiser |
| Alt text required in both locales | **Missing.** No image field in `design/content-model.md` has alt text. Strapi's file `alternativeText` is a single, non-localized, optional value |
| Image resolves at `media.kuasar.org`, never `r2.dev` | **Missing.** Nothing asserts it, and the domain is not on Cloudflare yet (blocker below) |
| 5,000 free transformations: expected volume inside, overflow behaviour recorded | **Missing** |
| CLS < 0.1 with real photographs | **Missing.** There is no image component and no rule that dimensions must be declared |

## What Changes

- **Edge transformation.** `apps/web` gets a Cloudflare loader for `next/image`, so every image URL becomes `https://media.kuasar.org/cdn-cgi/image/<options>/<key>`. Vercel's optimiser is never used. The loader uses `onerror=redirect`: past the free allowance, new sizes fall back to the original image rather than breaking.
- **One image component** that every section uses. It always renders with the width and height of the stored asset (or inside a box whose aspect ratio is declared), renders the alt text for the current locale, and accepts only media-host URLs.
- **The build refuses a non-media host.** An image URL on `*.r2.dev`, on the raw `r2.cloudflarestorage.com` endpoint, or on any host other than `media.kuasar.org` fails the build, naming the offending field. It never ships silently.
- **Strapi stops resizing.** Responsive formats and size optimisation are switched off, so the instance stores the original unmodified (plus the admin-only thumbnail Strapi always makes, which the site never uses). A small upload extension records the displayed width and height of EXIF-rotated photos, so the reserved box matches.
- **BREAKING (CMS schema, pre-production):** every **image** media field in the seven Strapi types becomes a non-localized `shared.image` component `{ image, altEn, altTr }`, with both alts required. Galleries become repeatable components. Video (`hoverVideo`) and file (`sponsorshipPdf`) fields are unchanged. No production content exists yet, so no data migration is needed.
- **Documents:** `design/content-model.md` records the image component and alt rule. `docs/adr/0002-cms.md` §5 and the runbook record the overflow behaviour, the transformations toggle, and the domain transfer. The runbook's troubleshooting row for "every image suddenly unoptimised" is corrected to match `onerror=redirect`.

**Explicitly out of scope:**
- **Images for Mission and Timeline entries** (git-resident `image path` fields). This change neither decides where those files live nor puts media in git. See *Open Questions*.
- Registering, transferring, or configuring accounts. That work is flight-ops; see Blockers.
- Any section that *consumes* the component (talks, events, summit). Those changes adopt it.
- The sponsor showcase (still gated on trademark permission).

## Blockers — recorded, not assumed done

1. **`kuasar.org` is not on Cloudflare.** R2 custom domains require the zone to be in the *same* Cloudflare account. The partial (CNAME) setup is not an option on the Free plan. The decision is to **transfer the registration to Cloudflare Registrar**, as `docs/adr/0002-cms.md` and runbook step 1 already say. Until then, nothing can resolve at `media.kuasar.org`, and the first acceptance criterion cannot be verified.
2. **No R2 bucket exists** (runbook step 3). Until it does, upload-to-R2 and edge transformation can only be verified structurally.
3. **Image Transformations must be enabled on the `kuasar.org` zone**, which cannot happen before blocker 1.
4. **R2 has no object versioning, and it cannot be turned on.** An overwritten asset is gone. The durable copy is the Google Shared Drive (ADR 0002 §6, runbook 3a). This change adds no in-R2 backup and does not pretend to.

## Open Questions

**Where do git-resident images live, and where is their alt text? Owner: `git-content-pipeline` (Dev 3).**

Mission (`patch`, `gallery`) and Timeline Entry (`image`) declare `image path` fields in `design/content-model.md`. ADR 0002 §6 forbids media in git, so those paths cannot point at files in the repository. Nothing currently says where they do point, or how their alt text is made to exist in both locales. This change deliberately leaves the question open: the entity is git-resident, so the decision belongs to the change that owns the git content pipeline, not to the Strapi media path.

**Suggestion passed along, not decided here:**
- Git content references `media.kuasar.org` paths. The originals are uploaded to the same R2 bucket (and archived in the Shared Drive like all other media).
- Alt text lives in `en.mdx` / `tr.mdx` frontmatter, keyed to each image field.

That would let git images reuse this change's loader, host guard and `<MediaImage>` component unchanged. The bilingual-alt requirement would then fit the existing Tier A locale-parity check, which already asserts both locale files carry a slug.

If `git-content-pipeline` adopts it, that change specifies the frontmatter shape and extends the parity check. Nothing in `media-pipeline` needs to change for either answer.

## Capabilities

### New Capabilities
- `media-pipeline`: how an uploaded image gets from Strapi to a visitor. It covers R2 as the only store, the original stored unmodified with display dimensions recorded, delivery from the custom media domain only, edge resizing with a defined overflow fallback, alt text required in `en` and `tr`, and layout-stable rendering with declared dimensions.

### Modified Capabilities
- (none in `openspec/specs/`.) `cms-platform` is not archived, so its media-field shape cannot be delta'd yet. The alt-text and image-component requirements are specified in `media-pipeline`, and this change must be archived **after** `cms-platform`.

## Impact

- **Audience served:** neither directly. It serves credibility: on a photography-led site, broken or shifting images read as a broken site. It indirectly serves every section built on it.
- **Content:** no new entity. Storage stays Strapi for all seven types. The alt fields sit on the same Strapi entity as their image, so no entity is split across git and Strapi.
- **New runtime dependencies:** none. No new npm package in `apps/web` (the loader is a local file), and none in `apps/cms`. Cloudflare Image Transformations is a new *service* on the existing Cloudflare account. It is free up to 5,000 unique transformations a month, then new sizes fall back to the originals, with no charge on the Free plan.
- **Affected paths:** `apps/web/next.config.ts`, `apps/web/lib/media/*`, `apps/web/components/media/*`, `apps/cms/src/components/shared/image.json`, the seven content-type schemas plus `summit/speaker.json`, `apps/cms/src/index.ts` (upload settings), root `package.json` + `.github/workflows/tier-a.yml` (one new test step), and the documents above.
- **CI — honestly:** the assignment tags this `lighthouse`, but **no Lighthouse workflow exists**. ADR 0004 specifies one, and `.github/workflows/` has only `tier-a.yml`, `tier-b-time.yml` and `cms-deploy.yml`. Tier A's "Content pipeline tests" step (added by PR #20, `fix/tier-a-content-tests`, merged 2026-09-24) runs `npm run test:content --if-present`. It was wired in ahead of its script: `test:content` (`node --test apps/web/lib/content/*.test.ts`) is defined on the unmerged `change/git-content-pipeline` branch, not on `main`. So on `main` today the step exits clean without running a test, and becomes real when `git-content-pipeline` merges. Either way it covers git content, not media. This change adds its own Tier A unit test step for the loader and host guard. That covers URL shape, the rejection of `r2.dev`, and the build-time refusal. **No CI gate covers CLS, R2 upload, the custom domain, or the transformation allowance.** Those are verified by hand once the blockers clear, and the PR must say so.
