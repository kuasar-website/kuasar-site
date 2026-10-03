# Alumni directory

The public pages are `/en/alumni` and `/tr/mezunlar`, inside the shared shell, with
canonical and hreflang metadata. The navigation already links here. OpenSpec:
`openspec/changes/alumni-directory/`. Personal data: read `docs/adr/0002-cms.md`,
"Known debt: KVKK", before changing anything here.

## Privacy: the consent fields never leave the CMS

`consentRecordedAt` and `consentSource` are `required` (no publish without recorded consent)
**and `private`** in `apps/cms/src/api/alumnus/content-types/alumnus/schema.json`:

- the admin sees and edits them;
- the Content API never returns them, to anyone, Public role or API token;
- a `fields`, `filters` or `sort` on them is refused with 400, so they can't be inferred by
  guessing either.

`tests/cms-drafts/check.mjs` proves all of this against a real Strapi.

The loader (`lib/cms/alumni-data.ts`) is a **canary**: if a response ever contains either
field again, the build fails with a message naming the field (never its value).

**Consequence: portraits are not shown.** `mapAlumnus` exposes a photo only with consent
evidence it can check itself, and the API never sends that evidence. So every card renders
without a photo, which the content model allows ("design the card so the photo is genuinely
optional"). Showing portraits needs its own change that preserves the guarantee above, for
example a server-only read token plus a non-private, derived "portrait consent" flag. See
`openspec/changes/alumni-directory/design.md`, "launch/alumni".

## Environment and publishing handoff

- `STRAPI_URL`: server-only CMS origin. A Vercel production build without it fails
  explicitly; an unconfigured local or preview build exposes no Alumni page.
- `STRAPI_API_TOKEN`: optional server-only read token, as for the other sections. It
  doesn't change what's returned: the consent fields are private for tokens too.

The loader reads **published** alumni only, every pagination page. A Turkish record
supplies the localized `roleHeld`; without one, the English record is shown silently, with
`lang="en"` on the role. The fetch uses force-cache, indefinite revalidation and the tag
**alumni-directory** (`CACHE_TAGS.alumni`). Publish, unpublish and delete reach the page
through `/api/revalidate`, so an unpublished person disappears without a deploy (with the
known first-reload gap, publish-integration task 6.4).

There's **no Draft Mode branch**: Alumni preview is off, and the preview token is never
scoped to Alumni.

## Rendering and indexing

- Groups by the year each person left, newest first, alphabetical within a year, unknown
  year last. Each card shows name, localized role, sub-team, years, and a LinkedIn link.
- The LinkedIn link renders only for an HTTPS `linkedin.com` URL (`safeLinkedInUrl`);
  anything else is dropped silently, never shown.
- Zero alumni: an explicit empty message, never a 404.
- **Never indexed: out of the sitemap AND page-level `noindex`.** Both pages emit
  `<meta name="robots" content="noindex, nofollow"/>` (`robots` in `alumniMetadata`).
  - **Why both:** sitemap exclusion alone doesn't stop indexing, because the navigation
    links here and crawlers find it anyway. ADR 0002's erasure promise is "unpublish; gone
    within one revalidation", and an index of named former members works against that.
  - **`nofollow`:** the page's only own links are personal LinkedIn profiles. The
    navigation links are on every other page, so discovery loses nothing.
  - **`robots.txt` must never block `/en/alumni` or `/tr/mezunlar`.** A crawler that can't
    fetch the page can't read the `noindex`, and may still index the bare URL from links.
  - Unpublishing a person removes them from the live directory at the next revalidation.
    `noindex` applies from launch. It can't guarantee immediate removal from a search
    engine's cache if anything was already indexed.
  - The page stays reachable from the navigation.

## Tests

- `lib/cms/alumni.test.ts` and `lib/cms/alumni-data.test.ts` (Tier A `test:cms`).
- `tests/alumni/check-routes.mjs` (Tier B alumni).
- `tests/cms-drafts/check.mjs` (Tier B CMS drafts; real Strapi): consent fields private.
