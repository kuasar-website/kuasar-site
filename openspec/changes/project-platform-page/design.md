## Context

- The content model is settled and live: `openspec/specs/project-platform`,
  `design/content-model.md` ("Project Platform and Platform Project"). This change adds no
  field and touches no schema.
- Every CMS-backed section follows the publish-integration conventions in
  `apps/web/lib/strapi/README.md`: published-only `strapiRead`, force-cache, one registry tag,
  no time-based revalidation, `revalidateTag(tag, 'max')` only. News
  (`lib/cms/announcements*.ts`, `components/news/`) and Alumni are the closest precedents: a
  pure mapper, a server-only loader, a static route pair, published-only with no Draft Mode
  branch.
- `apps/web` reads Strapi anonymously through the Public role (`apps/cms/src/index.ts`;
  `STRAPI_API_TOKEN` is optional). The CMS change kept Public read off for both types until
  this page (`project-platform` spec, the requirement this change modifies).
- Project Platform is the repository's first Strapi **single type**. Strapi 5 answers a
  single type with nothing published in that locale with **404 `NotFoundError`**, verified
  for the content snapshot (archived `project-platform-cms` design D7).
- `test:cms` is not part of Tier A (`.github/workflows/tier-a.yml`); each CMS section's unit
  tests run in its own Tier B workflow.

## Goals / Non-Goals

**Goals:**
- The page renders correctly with zero, one or many projects, with or without the single
  type, in both locales, without editing code to add content.
- A record that violates the content model never reaches a visitor; an unsafe optional link
  is hidden instead of failing the page.

**Non-Goals:**
- Editor preview (Draft Mode) for either type: it needs the preview token's scope widened,
  a production setting, and a loader preview branch. Its own change, as for News and Alumni.
- Detail pages per project (no slug exists).
- Any motion. The page is server-rendered markup and CSS only.
- Resources. Its frontend is a separate change.

## Decisions

### D1. Route `projects`/`projeler`; visible name "Project Platform" / "Proje Platformu"
The segment map in `design/i18n.md` already reserves `projects | projeler`; resolving it in
`lib/i18n/segments.ts` gives the switcher, `sectionAlternates` and the registry their paths
with no new mechanism. The visible name is the full product name, like "Galactic Summit",
rather than "Projects / Projeler". "Proje Platformu" is the Turkish product name, so the
Orbitron glyph rule (`design/brand.md`) is not involved: it contains none of `ğ Ğ ş Ş İ`.
`/en/project-platform` was rejected: it would change the authoritative segment table and
leave `projects` unresolved forever.

### D2. One pure mapper, one loader, one view
- `lib/cms/project-platform.ts`: validation and mapping only, no fetching. It throws, naming
  the document and field, on a broken content-model contract, and never throws on an unsafe
  optional link (D4). Ordering, the year label and the locale merge live here so they are
  unit-tested without a server.
- `lib/cms/project-platform-data.ts`: the fetches, following `announcements-data.ts`
  (pagination, `publishedAt` defence, unexpected-locale and duplicate checks, the runbook
  message). Images go through `toMediaImage`, unchanged, with the page locale's alt text.
- `components/project-platform/`: `content.tsx` (server-only, configured check, `cache`d
  loader), `page.tsx` (params, metadata, page), `copy.ts`, and a presentational
  `project-platform-view.tsx`. Like News, every component is a Server Component: **no new
  client JS** on this route, and no import reaches an animation library.

### D3. The single type: 404 means "nothing published"
`GET /api/project-platform?locale=…&status=published&populate[features]=true`. A 404 whose
body is a Strapi `NotFoundError` is "no entry for that locale". Any other non-2xx (401, 403,
5xx), a non-JSON body, or a `data` that is not an object fails the read, like every other
loader. The snapshot's known limit applies: a route that is not deployed also answers 404
`NotFoundError`. Here it cannot pass silently, because the two types ship together and the
projects request has no such exception: a missing `/api/platform-projects` is a 404 that
fails the read.

Rejected: treating a 403 as empty. It would hide a missing Public permission indefinitely and
contradict every other loader.

### D4. Strict on the contract, lenient on optional links
| Input | Result | Precedent |
| --- | --- | --- |
| Missing/blank `title`, `summary`, `intro`, feature `title`/`description`; non-integer or out-of-range years; unknown `projectStatus` | Throw | News, Summit, Events |
| `endYear` before `startYear` (Strapi cannot enforce it, archived D5) | Throw | approved decision for this change |
| Image on the wrong host, without dimensions or alt text | Throw (`toMediaImage`) | media pipeline |
| `whatsappUrl` not an HTTPS WhatsApp link, `applicationUrl` not absolute HTTPS | Drop the button | Alumni `safeLinkedInUrl` |
| Blank `whatsappLabel` | Per-locale default from `copy.ts` | content model ("Empty means the page's default label") |

Throwing is safe for visitors: a failed build leaves the previous deployment live, and a
failed revalidation keeps serving the last generated page (Next.js ISR,
`node_modules/next/dist/docs/01-app/02-guides/incremental-static-regeneration.md`). The cost
is that a broken record holds the page at its last good version until it is fixed, and blocks
the next production deploy. The CMS refuses every case above at publish except the year
order, so a throw signals schema drift, not a normal editing mistake. The WhatsApp check uses
the schema's own pattern so the two cannot drift apart unnoticed.

### D5. Turkish fallback by document, not by field
As in News and Alumni: on `/tr`, a project's or the entry's Turkish version replaces the
English one by `documentId`; without it, the English version is used whole and the block
carries `lang="en"`. Mixing fields across locales (a Turkish title over an English summary)
was rejected: it produces a block in two languages under one `lang`. A blank Turkish
`whatsappLabel` falls back to the Turkish default label, not to the English label, because
the label is UI text in the page's language.

### D6. Order and years in the mapper, with the page locale's collation
`startYear` descending, then `Intl.Collator(locale)` on the title as shown (a fallback title
is compared as displayed), then `documentId`, so equal titles still order identically on
every build. The year label is pure server text; there is no time-relative state, so nothing
is derived in the browser (ADR 0001 rule 3 does not apply to whole years).

### D7. One tag for both types
Registry: `CACHE_TAGS.projectPlatform = "project-platform"`, mapped from
`api::project-platform.project-platform` and `api::platform-project.platform-project`, with
`section: "projects"` and `preview: false`. One page reads both, so one tag revalidates it,
both locales and the sitemap. No webhook, handler or Strapi configuration changes: the
webhook already sends every model's entry events, and media events already revalidate every
registry tag.

### D8. Layout: News's card pattern, Inter headings
Projects use News's article pattern: a cover beside the text from `md` up, shown whole and
never cropped; without a cover, a text-only card with no slot. Cards are separated by the
border rule News uses, so a text-only card reads as deliberate. Functions are a simple
responsive grid. Every heading, including CMS titles, is set in Inter like News, so no
Turkish or editor-supplied title can hit Orbitron's missing glyphs. Orange appears only on
the two primary CTAs (WhatsApp, Apply), as `design/brand.md` requires.

### D9. Sitemap and indexing
The page is indexable (no personal data, unlike Alumni). The sitemap lists a locale's page
only when it has content, like News, so an empty page is not submitted for indexing. The
navigation links to it from launch, like every other section.

### D10. Other sections' synthetic Strapi servers
Every production build now prerenders this page, so every Tier B route check's fake CMS
receives the two new requests. Each one answers the projects list empty and the single type
404, the same one-line change News and Alumni made to the events fixture. No assertion in
those checks changes.

### Rule checks
- **Motion:** none. No L1/L2/L3 animation is introduced on `/en/projects` or `/tr/projeler`.
- **First-load JS:** no client component is added; the route ships only the shared shell's
  JS, within the default 175 KB budget. No import reaches GSAP or any animation library.
- **Strapi fields:** none added; localization is as in `design/content-model.md`.

## Risks / Trade-offs

- [The Vercel Preview builds against production Strapi, which refuses both types until the
  Public grant] → The Preview build fails with the runbook message until a Super Admin grants
  `find` on both types (tasks.md 7.1). Local and synthetic verification come first; the grant
  is the only production change, and it precedes merge so production's first build after
  merge can read the types.
- [A record with `endYear` before `startYear` holds the page at its last good version] → The
  error names the project and the field; the runbook editing notes say so.
- [The single type's 404 can also mean "route missing"] → D3.
- [Tier B is not a required check] → It runs on every pull request that touches `apps/web`;
  the PR states its result.

## Migration Plan

No data migration. Before the Preview review: a Super Admin grants the Public role `find` on
Project Platform and on Platform Project (Settings → Users & Permissions → Roles → Public),
nothing else, then checks anonymous published reads succeed and anonymous `status=draft`
reads are refused. Merge deploys the page. Rollback: revert the merge; the Public `find`
grant can stay (published content was meant to be public) or be removed.
