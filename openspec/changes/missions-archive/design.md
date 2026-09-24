## Context

See `proposal.md` — Why and `specs/missions-archive/spec.md` for behavior. This design is
prepared while its two implementation blockers remain open: PR #16 supplies
`loadMissions()` and typed mission/locale records; PR #18 supplies the locale shell. No
code from either PR is copied into this branch.

The git-content loader deliberately returns the MDX body as an opaque string and leaves
compilation to the rendering capability. The repository has no Markdown/MDX runtime
dependency, and Dev 2 does not own the root package manifest. Next.js behavior below was
checked against the installed 16.3.1 documentation under `node_modules/next/dist/docs/`:
page `params` are promises, child `generateStaticParams` receives resolved parent params,
and returning all slug params produces static detail routes.

## Goals / Non-Goals

**Goals:**
- Keep archive/detail rendering a pure projection of `loadMissions()` so adding a mission
  never edits layout code.
- Make one shared model layer own sorting, localized path creation, lookup, prose parsing,
  gallery validation, and metadata inputs rather than repeating them across pages.
- Fail the build when a mission cannot satisfy a route or accessibility contract.
- Keep the collection useful at zero, one, and fifty records without turning it into a
  generic card grid.

**Non-Goals:**
- Creating or editing real mission content or image assets; Dev 3 owns
  `content/missions/**` and the club must supply factual history and descriptions.
- Changing the git loader, site shell, locale router, client-time-state, global tokens,
  sitemap, or root package manifest.
- Supporting arbitrary executable MDX/JSX, adding a Markdown dependency, fetching Strapi,
  or rendering mission data from any non-git source.
- Adding a home-page missions section to `app/[locale]/page.tsx`; `home-composition` owns
  that file. This change exports a zero-safe section component for it to consume later.

## Decisions

### Dynamic localized segment folders generate a closed static route set

Routes live under the assigned route group as
`app/[locale]/(missions)/[section]/page.tsx` and
`app/[locale]/(missions)/[section]/[slug]/page.tsx`. The `[section]` generator receives
the parent locale and returns only `resolveSegment("missions", locale)`; the detail
generator returns every loader-provided slug for that locale. Both segments set
`dynamicParams = false`, and pages call `notFound()` defensively if a supplied segment or
slug does not resolve.

Alternatives rejected: hard-coding parallel `missions/` and `gorevler/` directories
duplicates page code; a catch-all dispatcher couples every future section into one file;
request-time resolution violates the static architecture.

### A server-only view model normalizes data once

`components/missions/model.ts` consumes `loadMissions()` and exposes newest-first sorting,
locale content selection, localized archive/detail paths, and lookup by localized slug.
Equal years use the stable mission id as a deterministic tie-breaker. Route pages and
components receive normalized view models, not raw loader records, keeping fact/localized
field boundaries explicit.

The archive route always exists. With zero entries it shows one localized, honest empty
message. The export intended for home composition returns `null` for zero entries, centres
one, and uses a vertical archive rhythm for many; it never selects a fixed card count.

### Mission prose uses a safe, dependency-free Markdown subset

The loader's raw MDX is parsed at build time as Markdown-only content: level-two/three
headings, paragraphs, unordered lists, inline emphasis/links, and Markdown images. Raw
HTML, imports, exports, and JSX are rejected with a build error rather than executed. This
is enough for objective, technical summary, results, and gallery prose while preserving
the no-new-dependency and public-repository safety constraints.

Alternatives rejected: rendering the body as plain text exposes Markdown syntax; executing
arbitrary MDX adds a compiler dependency and a larger trusted-code surface for content;
hand-authored JSX would make each mission a code change.

### Gallery alternatives are authored in each locale body and validated against facts

Inside a `## Gallery` / `## Galeri` section, each image uses ordinary Markdown image
syntax. The URL must match one path in `facts.gallery`, and the alt text is the localized,
human-authored description. At build time the parser requires exactly one non-empty image
alternative per fact path in each locale, rejects extra/unmatched paths, and removes those
declarations from the prose flow before the gallery component renders them in fact order.
This preserves the three-file mission format, keeps image paths locale-independent, and
puts descriptions in the appropriate locale file without changing PR #16's loader API.

The patch alternative combines the locale's human-authored mission name with localized
“mission patch” wording; unlike a photograph, the patch's identity is exactly the mission
it represents. File names are never exposed as alternatives.

Alternatives rejected: automatic gallery descriptions are not useful alt text; putting
localized descriptions in `index.json` duplicates locale data into the facts file; adding
fourth/fifth files breaks the settled three-file data operation.

### Facts use semantic definition lists and absence stays visible

Archive entries and detail pages render the same localized labels around the single facts
object. `apogeeMetres` uses `Intl.NumberFormat(locale)` and the literal unit “m”; null maps
to an explicit localized “Not yet confirmed / Henüz doğrulanmadı” value. Optional
competition, gallery, links, and team sections disappear only when absent; required fact
labels do not.

`DateTime` receives the raw `launchDate`, locale, and UTC display zone. Its server snapshot
is already neutral and its browser store applies state tokens after mount. Mission
components do not compute time, add a second client clock, or add animation.

### Entity metadata is generated from both locale records

Archive metadata uses the existing `sectionAlternates("missions", locale)`. Detail
metadata is assembled from the matched mission's two locale slugs: canonical is the
current detail path, `en`/`tr` point to the same id's localized routes, and `x-default`
points to English. This also supplies PR #18's hydrated detail switcher with the exact
target `hreflang`; no slug is guessed.

### Interaction and motion remain below L1

The archive itself has no reveal or narrative motion. A fine-pointer patch hover may use
one L3 CSS `transform`/border response with `--duration-fast` and `--ease-out`; touch has
no hover transform, and `prefers-reduced-motion` removes movement while retaining focus
and border feedback. No import reaches an animation library from either mission route.

Route JavaScript impact is limited to the already-shipped `DateTime` client island and
PR #18's shared switcher/notice. Archive, prose, gallery, and fact rendering stay Server
Components. Both route patterns must pass the 175 KB default first-load budget with 0 KB
deferred animation.

### CMS field and locale specificity

None. Mission remains wholly git-resident. Locale-independent facts come only from
`index.json`; name, summary, prose, slugs, and gallery alternatives come only from the
matching locale MDX file. No Strapi field or request exists.

## Risks / Trade-offs

- **PR #16 or #18 may change before merge** → implementation does not begin until both are
  on `main`; then re-read their final exported types and revalidate this plan before code.
- **A deliberately small Markdown subset rejects otherwise-valid MDX** → errors name the
  mission, locale, and unsupported construct; expanding the subset later is a renderer
  change, not permission to execute arbitrary JSX.
- **Gallery paths are declared once as facts and referenced once per locale for alt text**
  → build validation requires an exact one-to-one set, turning drift into a loud error.
- **Fifty missions produce a long server-rendered page** → use a simple vertical archive,
  responsive images, and native document navigation; do not add client pagination or
  virtualization until real measured content proves it necessary.
- **No real content means visual evidence must use temporary fixtures** → tests generate
  zero/one/fifty and incomplete-translation fixtures locally and remove them before commit;
  fictional history is never committed.

## Migration Plan

After PR #16 and PR #18 merge, update this branch from `origin/main` without importing
their feature branches. Implement and verify against temporary mission fixtures, remove
all fixtures, then open one missions-only PR. Rollback removes the mission route group and
components; git content and upstream contracts remain untouched.
