## Why

`docs/adr/0001-stack.md` §6 requires Vercel Web Analytics and Speed Insights, both, from
launch, and names the sponsorship-PDF open as the one custom event worth instrumenting. The
root layout still ships neither: it has no analytics wrapper, and its `metadata` export is
still the unmodified `create-next-app` placeholder (`title: "Create Next App"`). Discovery
metadata (`robots.ts`, `sitemap.ts`) already exists from `locale-routing`, correctly, and is
verified rather than rebuilt here.

## What Changes

- Add `@vercel/analytics` and `@vercel/speed-insights` to `apps/web`, mounted once in the
  root layout via their `/next` entry points. Both count against the route's first-load JS
  budget like any other import — no exemption is requested or granted.
- Replace the root layout's `create-next-app` placeholder `metadata` with a site-wide
  fallback: a `title.default` (no `template`, so it cannot double-suffix a route's own
  title string) and a factual description, plus `metadataBase` so the relative
  canonical/hreflang URLs `locale-routing`'s `sectionAlternates()` already emits resolve
  against the real site origin instead of `next`'s `localhost` default.
- Add a reusable, currently-unwired analytics-event helper,
  `trackSponsorshipPdfOpened()`, for the one authorized custom event. It is not called from
  anywhere in this change: no Galactic Summit route or "Become a Partner" interaction
  exists on `main` or in any open PR to call it from.
- Verify, rather than modify, `apps/web/app/robots.ts` and `apps/web/app/sitemap.ts`:
  both already satisfy every requirement this capability would otherwise add (sitemap
  reference, neither locale prefix disallowed, an empty sitemap while no route is
  published, the preview-route `noindex` deferral to `publish-integration`).

## Capabilities

### New Capabilities

- `seo-analytics`: Vercel Web Analytics and Speed Insights, the root layout's fallback
  metadata, and the sponsorship-PDF custom-event contract.

### Modified Capabilities

None. `robots.ts` and `sitemap.ts` are read and confirmed compliant, not changed. No
`locale-routing`, `site-shell`, or any page capability's requirement is altered.

## Impact

- Serves sponsors indirectly (the sponsorship-PDF event is "the one commercially
  interesting question this site can answer," per the ADR) and serves neither audience
  directly otherwise — this is measurement infrastructure, not a page.
- New runtime dependency: `@vercel/analytics` and `@vercel/speed-insights`, both explicitly
  required by `docs/adr/0001-stack.md` §6, not a new decision. Both are first-party Vercel
  packages, not third-party analytics, and do not conflict with the KVKK rule in
  `docs/adr/0002-cms.md` (which bars third-party analytics, embeds, pixels, and tag
  managers — Web Analytics is explicitly named as the lower-KVKK-exposure choice `because`
  it is cookieless).
- No content entity, CMS field, or Strapi request is added. No entity is split across git
  and Strapi.
- Affected code: `apps/web/app/layout.tsx` (metadata + analytics wrappers),
  `apps/web/lib/analytics/**` (the new event helper), `apps/web/package.json` /
  `package-lock.json` (the two new dependencies). `apps/web/app/robots.ts` and
  `apps/web/app/sitemap.ts` are unmodified.
- Explicitly deferred, not claimed complete: wiring `trackSponsorshipPdfOpened()` into a
  real "Become a Partner" interaction. That belongs to the Galactic Summit page capability,
  which does not exist yet on `main` or in any open PR — see `tasks.md` and `design.md`,
  Open Questions.
