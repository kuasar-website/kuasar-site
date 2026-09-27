## 0. Prerequisites — blockers, NOT done by this change

Record their state on the PR. Do not tick any of these on assumption.

- [ ] 0.1 **Domain:** `kuasar.org` transferred to Cloudflare Registrar in the club account (runbook step 1). If the 60-day ICANN transfer lock applies, move nameservers to Cloudflare first and transfer later. The zone is what R2 needs. Owned by flight-ops.
- [ ] 0.2 **R2 bucket** exists in the same Cloudflare account, `r2.dev` public access left **disabled**, custom domain `media.kuasar.org` bound, API token scoped to the bucket (runbook step 3). Owned by flight-ops.
- [ ] 0.3 **Images → Transformations enabled** on the `kuasar.org` zone, with sources restricted to the same zone. Owned by flight-ops.
- [ ] 0.4 **Media archive Shared Drive** confirmed (runbook 3a). R2 has no versioning, so this is the only durable copy.
- [ ] 0.5 `cms-platform` merged. This change is archived after it.

## 1. Re-check current docs before writing code

- [x] 1.1 Re-fetch the Next.js 16 `next/image` reference for the pinned `next` version: `loaderFile`, `qualities` (required), `deviceSizes`/`imageSizes`, `preload` vs `loading="eager"`. Note anything that changed since design.md.
- [x] 1.2 Re-fetch the Cloudflare transform-via-URL and pricing pages: `onerror=redirect`, `format=auto` in URL mode, the Free-plan 9422 behaviour.
- [x] 1.3 Confirm against current Strapi 5 docs how to set upload settings (`responsiveDimensions`, `sizeOptimization`, `autoOrientation`) from code, and how to set `sizeLimit` together with the `strapi::body` limit.

## 2. CMS: alt text in both locales (schema)

- [x] 2.1 Add `apps/cms/src/components/shared/image.json` with `image` (single media, images only, required), `altEn` (string, required) and `altTr` (string, required).
- [x] 2.2 Replace every image media field with `shared.image`, `localized: false`, keeping each field's optionality. Stellar Talk `speakerPortrait`; Nebula Night `photos` (repeatable); Galactic Summit `photos` (repeatable) and `backgroundImage` (optional); `summit.speaker` `portrait` (nested); Announcement `coverImage` (optional); Alumni `photo` (optional); Sponsor `logo` and `logoLight` (optional). Leave `hoverVideo` and `sponsorshipPdf` unchanged.
- [x] 2.3 Run `strapi ts:generate-types` and `npm run build -w apps/cms`. Both must pass.
- [x] 2.4 Update `design/content-model.md`. Every image field's type becomes the `shared.image` component, and add one short section stating the alt rule: alts required in both locales, image chosen once, Strapi's own file `alternativeText` not used by the site. Update the "Last updated" date.

## 3. CMS: untouched original, display dimensions

- [x] 3.1 In `src/index.ts` `bootstrap`, enforce `responsiveDimensions: false`, `sizeOptimization: false` and `autoOrientation: false` on every boot, writing the upload plugin store directly and preserving other keys. Add a comment giving the reason: edge resizing, the original stored unmodified, the 512 MB instance. The admin thumbnail is allowed (design.md decision 7).
- [x] 3.1a Add `src/extensions/upload/strapi-server.ts`, wrapping `image-manipulation.getDimensions` so that EXIF orientation 5–8 swaps the stored width and height. Use `@strapi/upload`'s own `sharp` via `createRequire`, add no new dependency, and throw at registration if the wrapped service or function is missing.
- [x] 3.1b Test the width/height swap: `apps/cms/src/extensions/upload/exif-dimensions.test.ts`, against the real `sharp` and the real installed Strapi `image-manipulation` service. It covers all eight orientations, file-path and stream input, and asserts that Strapi alone still records stored dimensions, so an upgrade that changes this fails Tier A. It runs in `test:media`. Record in design.md decision 7 and the runbook ("Upgrading Strapi") that the extension is re-checked on every Strapi upgrade.
- [x] 3.2 Set the upload `sizeLimit` and the matching `strapi::body` limit to 25 MB.
- [x] 3.3 Do **not** touch the existing R2 provider block (`region: 'auto'`, no `ACL`, fail-closed). Confirm it with `git diff` on the PR.

## 4. Web: loader, guard, component (un-animated, no motion anywhere)

- [x] 4.1 Add `apps/web/lib/media/origin.ts` with the single constant `https://media.kuasar.org`.
- [x] 4.2 Add `apps/web/lib/media/cloudflare-loader.ts`, which emits `/cdn-cgi/image/width=<w>,quality=75,format=auto,onerror=redirect/<key>` on the media origin.
- [x] 4.3 Configure `apps/web/next.config.ts` with `loader: 'custom'`, `loaderFile`, `deviceSizes: [640, 1080, 1600, 2048]`, `imageSizes: [256, 480]` and `qualities: [75]`.
- [x] 4.4 Add the host/dimension/alt guard in `apps/web/lib/media/`. It maps a `shared.image` plus a locale to `{ src, width, height, alt }`, and throws at build naming the collection, entry and field for: non-media host (`r2.dev`, S3 endpoint, CMS host, relative path), missing dimensions, or empty alt for that locale. In `next dev` only, a non-media host passes through unoptimised with a warning.
- [x] 4.5 Add `apps/web/components/media/media-image.tsx` (kebab-case, matching `components/shell/`). It always passes `width`/`height` or renders `fill` inside a declared `aspect-ratio` box, uses the surface token as the loading background, uses `loading="eager"`/`fetchPriority` for above-the-fold images (never `priority`), and has no animation.
- [x] 4.6 Check that `apps/web` sends no CSP header that would block `img-src` for `media.kuasar.org`. If it does, add that host only.
- [x] 4.7 Confirm the existing `apps/web/app/page.tsx` `next/image` usage still builds under the custom loader. It uses local `/public` assets, so either give it `unoptimized` or route it through the loader and document the choice. No emitted URL may point at `/_next/image`.

## 5. Tests and CI

- [x] 5.1 Add `apps/web/lib/media/*.test.ts` (`node --test`, same convention as `git-content-pipeline`'s `lib/content/*.test.ts`) covering: loader URL shape; only set widths are emitted; `r2.dev`, the `r2.cloudflarestorage.com` endpoint, the CMS host and `/uploads/...` each throw; missing width/height throws; empty `altEn` and empty `altTr` each throw for their locale; a Turkish alt with `ş ğ İ ı` survives unchanged.
- [x] 5.2 Add a root `test:media` script (`node --test apps/web/lib/media/*.test.ts apps/cms/src/extensions/upload/*.test.ts`) and a `Media pipeline tests` step in `.github/workflows/tier-a.yml`, immediately after PR #20's `Content pipeline tests` step. Call it **without** `--if-present`, so a missing script fails Tier A. Do not fold it into `test:content`, whose script and `lib/content/` glob belong to the unmerged `change/git-content-pipeline` (see design.md decision 8). Before opening the PR, rebase on `main`. If `git-content-pipeline` or `announcements` has merged, resolve the `package.json` `scripts` / `tier-a.yml` conflict so that every step survives.
- [x] 5.3 Run the full Tier A locally (typecheck, lint, stylelint, reduced-motion, locale parity, budgets, build, `check:budgets`). All must pass, and first-load JS must stay within `apps/web/budgets.json`.

## 6. Documents

- [x] 6.1 `docs/adr/0002-cms.md` §5: add one sentence on overflow. Past 5,000 on the Free plan, new transformations return 9422, `onerror=redirect` serves the original, cached sizes keep working, and there is no charge. Point to this change's design.
- [x] 6.2 `docs/ops/cms-runbook.md`:
  - Step 3: keep `r2.dev` disabled, enable Transformations (same-zone sources), add a cache rule for `media.kuasar.org`.
  - Step 5: responsive formats and size optimisation are enforced off at boot; do not upload real content until `R2_PUBLIC_URL` is set; prefer uploading a new asset over "replace", because R2 has no versioning and the edge caches.
  - Monthly check: add one line — read the unique-transformation count on the Cloudflare dashboard. At 4,000 or more, apply design.md decision 2's contingency (single format first, then fewer widths).
  - Troubleshooting: replace "Every image suddenly unoptimised" with "Images suddenly slow/heavy → transformation allowance exhausted, originals served via `onerror=redirect`; resets monthly". Add a row for the build failing with a non-media image host → re-upload after `R2_PUBLIC_URL` is set.
- [x] 6.3 Do **not** run the global `<DOMAIN>` replacement. That is runbook step 1, done by flight-ops when the zone exists (task 0.1).

## 7. Verification — which gate covers what

- [ ] 7.1 **CI coverage, stated on the PR:** Tier A's "Content pipeline tests" step (PR #20) does not cover this change: it runs `test:content`, which is for git content and, until `git-content-pipeline` merges, is not defined on `main`. Tier A's new "Media pipeline tests" step (`test:media`) covers loader URL shape, the width set, and rejection of `r2.dev`, the endpoint and relative hosts, plus missing dimensions and missing alts. **No CI gate covers:** CLS (ADR 0004's Lighthouse gate has no workflow yet), the R2 upload, `media.kuasar.org` resolution, the transformation allowance, or the CMS schema (`cms-platform` is `no gate` too).
- [ ] 7.2 **Owed until 0.1–0.3 are done:** upload a photo in the Media Library; confirm R2 holds the original byte-for-byte plus at most the admin thumbnail, no small/medium/large formats on the file record, an EXIF-rotated phone photo recorded with display (swapped) width/height, and a stored URL under `https://media.kuasar.org/`. Confirm the `r2.dev` URL does not serve it.
- [ ] 7.3 **Owed:** fetch a `/cdn-cgi/image/width=640,…/<key>` URL and confirm a resized image. Confirm the Cloudflare dashboard counts it. Record whether `format=auto` counts once or per output format. If per format, update design.md's estimate and follow its decision 2 contingency. No action is needed while the projected worst case stays under 5,000 and the observed count under 4,000. Otherwise, switch to `format=webp` first and drop to four widths only if still over.
- [ ] 7.4 **Owed (live instance):** walk the admin in `en` and `tr`. Publish is blocked with `altEn` empty and with `altTr` empty. An image picked in `en` is present in `tr` without re-picking. An Alumni entry with no photo publishes. A Nebula Night with one, and then many, photos requires both alts on each.
- [ ] 7.5 **Owed:** measure CLS with Lighthouse locally (`next build && next start`) on a throwaway, uncommitted page rendering real uploaded photographs of mixed orientation, including an EXIF-rotated phone photo, in `/en` and `/tr`. Both must be below 0.1. Record the numbers on the PR, and note that the first consuming section must repeat this on its real route.
- [ ] 7.6 **Record on the PR:** the volume estimate (≈ 1,200 unique/month in year 1, ≈ 3,600 in the year-3 worst case, both under 5,000) and what happens past it (9422 → `onerror=redirect` → original served, cached sizes unaffected, no charge on Free; $0.50/1,000 only on a paid plan, which was deliberately not adopted).
- [ ] 7.7 Before archive: `openspec validate media-pipeline --strict` passes. Grep `docs design openspec` for `ASSUMPTION:`; this change resolves none.
