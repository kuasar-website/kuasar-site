# Content model

Every entity, its fields, and where it is stored.

- **Last updated:** 2026-10-17
- **Related:** [../docs/adr/0002-cms.md](../docs/adr/0002-cms.md), [i18n.md](i18n.md)

Model for the **shape**, not for a known volume. Real content, counts and image assets are
supplied during development. **Every collection must render sensibly when it holds zero,
one, or fifty entries** — that is a requirement on every component built against this
file, not an aspiration.

## The storage rule

> **Missions and the timeline live in the repository; everything else lives in Strapi.**

Memorise that sentence. It is the whole boundary, and
[ADR 0002](../docs/adr/0002-cms.md) explains why it is drawn at the **entity** level and
never at the field level: a half-in-git, half-in-Strapi entity spares perhaps one pull
request a year and costs every future editor an inexplicable half-empty record.

| Storage | Entities | Edited by |
| --- | --- | --- |
| **Git** | Mission, Timeline Entry | Developers, through pull requests |
| **Strapi** | Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Alumni, Sponsor, Platform Project, Project Platform, Resource | Editors, in the admin panel |

## Locale conventions

Applies to every entity below.

- **Locale-independent facts live once.** A launch date and an apogee in metres are not
  translations of each other; duplicating them into both locales guarantees they diverge.
- **Locale-specific fields** are prose, titles, and slugs.
- **Slugs are locale-specific**, because [i18n.md](i18n.md) uses fully localized URL
  segments. A missing Turkish slug is a broken route, not a missing translation — CI
  asserts both.
- **Event brand names stay English in both locales**: Galactic Summit, Stellar Talk,
  Nebula Night. Generic section names translate. See [brand.md](brand.md).

In tables below: **F** = locale-independent fact, **L** = localized.

---

# Git-resident entities

One directory per entity:

```
content/missions/apogee-1/
├── index.json     # locale-independent facts
├── en.mdx         # English prose, English slug in frontmatter
└── tr.mdx         # Turkish prose, Turkish slug in frontmatter
```

Timeline entries use the identical layout under `content/timeline/`, so the CI parity
check is one rule covering all git content.

## Mission

Presented as a **NASA-style mission archive** rather than as classic cards. Adding a
mission generates its card automatically — no layout edit, ever.

Missions are the credibility content. They stop changing once a mission ends, and an error
in a stated apogee is what a competition judge notices. That is why they are in git under
review rather than in a CMS.

`index.json`:

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `id` | string | F | Directory name; the stable identifier |
| `year` | number | F | |
| `type` | enum | F | `competition` \| `research` \| `test` |
| `competition` | string? | F | e.g. TEKNOFEST, Spaceport America Cup |
| `status` | enum | F | `planned` \| `active` \| `flown` \| `retired` |
| `launchDate` | ISO date? | F | Ships raw; any "upcoming" styling is client-derived |
| `apogeeMetres` | number? | F | Null until confirmed. Never guess this field |
| `patch` | image path | F | The mission patch. Clicking it opens the detail page |
| `gallery` | image path[] | F | |
| `links` | `{label, url}[]` | F | Flight reports, videos, papers |
| `team` | `{name, role}[]` | F | Roles are short labels, not prose |

`en.mdx` / `tr.mdx` frontmatter: `slug` (L), `name` (L), `summary` (L, one or two
sentences for the card). Body: objective, technical summary, and results as prose.

**Zero:** the Missions section is hidden rather than showing an empty archive.
**One:** the archive layout must not assume a grid — one mission centred is a valid state.

## Timeline Entry

KUASAR's accomplishments and major events. **Backward-looking, and distinct from Schedule
— do not merge them.**

`index.json`:

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `date` | ISO date | F | Sort key. Runs rightward from present to past |
| `kind` | enum | F | `founding` \| `competition` \| `launch` \| `milestone` \| `recognition` |
| `image` | image path? | F | Optional; entries must read well without one |
| `link` | url? | F | Usually to a mission detail page |

`en.mdx` / `tr.mdx`: `title` (L) and a short body (L). Keep bodies to one or two
sentences — a timeline entry is a caption, not an article.

**Zero:** hide the Timeline section and its route. **One:** the "now" marker and axis label
must still make the direction legible ([motion.md](motion.md)).

---

# Strapi-resident entities

All are locale-enabled via Strapi 5's built-in i18n. Missing translations fall back
**silently** to the default locale — see [i18n.md](i18n.md).

## Images and alt text

Every field typed **`image`** below (`image?` optional, `image[]` a gallery) is the
`shared.image` component, not a bare media field:

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `image` | media | F | Images only. The original is stored unmodified; the site never uses Strapi's resized formats |
| `altEn` | string | — | **Required.** English alt text |
| `altTr` | string | — | **Required.** Turkish alt text |

**Alt text is required in both locales, and the image is chosen once.** The component is
non-localized, so an editor picks the photo once and fills both alts together, whichever
locale they are editing in. Publishing is blocked while an attached image lacks either alt.
An optional image left empty needs no alt; a gallery with no photos needs none either.

This is the one place where per-locale text lives in explicit `…En` / `…Tr` fields rather
than in Strapi's locale switcher. It is deliberate: a localized component would duplicate
the image per locale and break "facts live once" above. The cost is that a third locale
would be a schema change, which [i18n.md](i18n.md) already rules out.

**Strapi's own "Alternative text" field on the uploaded file is not used by the site.**
Filling it in the Media Library does nothing. Fill `altEn` / `altTr` on the entry.

Galactic Summit speaker portraits (inside the `speakers` component) follow the same rule.
Video (`hoverVideo`) and document (`sponsorshipPdf`) fields are not images and carry no alt
text. How images reach visitors, including edge resizing, is in
[ADR 0002](../docs/adr/0002-cms.md), decision 5.

## Stellar Talk

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `speakerName` | string | F | A person's name is not translated |
| `speakerPortrait` | image | F | |
| `eventNumber` | number | F | Sequential; "Stellar Talk #7" |
| `date` | datetime | F | |
| `title` | string | L | |
| `insight` | text | L | Short pull-quote |
| `watchUrl` | url? | F | |
| `readUrl` | url? | F | |
| `hoverVideo` | media? | F | Optional and **performance-gated** — see below |

`hoverVideo` is optional by design. It must be gated behind
`@media (hover: hover) and (pointer: fine)`, must never load on mobile, must not preload,
and must be absent under `prefers-reduced-motion`. If it cannot meet the route's weight
budget, it does not ship — a hover video is not worth a budget exception.

## Nebula Night

Cinematic photo layout — film or event screenings.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `date` | datetime | F | |
| `photos` | image[] | F | The layout is photography-led; one photo is the minimum |
| `title` | string | L | |
| `description` | text | L | Short |
| `filmTitle` | string? | F | Film titles are not translated |

## Galactic Summit

One entry per year. **A new year must be addable without touching layout.**

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `year` | number | F | Unique |
| `date` | datetime | F | 2026 edition: 7 November 2026 |
| `location` | string | F | 2026: SGKM |
| `isCurrent` | boolean | F | Exactly one true. Past editions archive to the side |
| `purpose` | text | L | |
| `programme` | component[] | L | `{time, title, description}` |
| `speakers` | component[] | F | `{speakerName, role?, portrait?}` — repeatable `summit.speaker` |
| `sponsors` | relation → Sponsor | F | |
| `photos` | image[] | F | Past editions |
| `contactAddress` | text | L | |
| `sponsorshipPdf` | media | F | The "Become a Partner" target |
| `registrationUrl` | url? | F | Null disables the Register CTA |
| `accentToken` | **enum** | F | `aurora` \| `ion` \| `violet` \| `ember` |
| `heroTreatment` | **enum** | F | `still` \| `wash` \| `gradient` — treatments of the one Summit hero layout: a static image, an accent wash over `backgroundImage`, or an accent gradient with an optional image. Never a new layout. |
| `backgroundImage` | image? | F | |

The last three are the **only** place in this project where a CMS field selects a design
token ([ADR 0002](../docs/adr/0002-cms.md), decision 7). Choosing among existing values is
a data operation; adding a new value is a code change, because the values are defined in
[tokens.md](tokens.md). Never new components, never a new layout — unbounded, this clause
forks the codebase by the third year.

`sponsorshipPdf` is a Strapi media field rather than a file in the repository, so a
non-technical member can replace it each season without a pull request. Opening it is the
one custom analytics event worth instrumenting
([ADR 0001](../docs/adr/0001-stack.md)).

**"Register / Join the Summit" is unavailable while `registrationUrl` is null**, and becomes
active the moment a URL is set. When active it links to a Google Form in the club account —
**linked, never embedded** ([ADR 0002](../docs/adr/0002-cms.md), KVKK).

Render it as a **non-interactive label, not a greyed-out button.** "Kayıtlar yakında /
Registration opens soon" tells a visitor the state of the world; a dead button that does
nothing when clicked reads as broken, and a disabled control is skipped by some screen
readers, so the information disappears entirely for the people with the least context. The
distinction is small and it is the difference between "not yet" and "broken".

## Schedule Event

Google-Calendar-style month view. **Forward-looking**, and distinct from Timeline.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `startsAt` | datetime | F | |
| `endsAt` | datetime? | F | |
| `type` | enum | F | `talk` \| `screening` \| `summit` \| `workshop` \| `other`. Drives colour; the legend sits beside the calendar. Frontend colour mapping is a later change. |
| `location` | string? | L | |
| `title` | string | L | |
| `description` | text? | L | |
| `url` | url? | F | |

**All past/upcoming state is derived client-side** ([ADR 0001](../docs/adr/0001-stack.md),
rule 3). The server renders the neutral form with raw ISO dates; a client component applies
`--color-state-live` and `--color-state-upcoming` after mount. A calendar that computed
"this month" on the server would freeze at build time and be wrong within weeks — this is
the entity where that mistake is most tempting and most visible.

**Zero:** show the month grid with an explicit empty message, not a blank calendar.

## Announcement / News

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `publishedAt` | datetime | F | Strapi's own field |
| `pinned` | boolean | F | |
| `title` | string | L | |
| `slug` | uid | L | Localized — see [i18n.md](i18n.md) |
| `excerpt` | text | L | |
| `body` | rich text | L | |
| `coverImage` | image? | F | |

## Alumni

Styled slightly apart from its navbar siblings.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `name` | string | F | |
| `yearJoined` | number | F | |
| `yearLeft` | number? | F | |
| `subTeam` | enum | F | Propulsion \| Avionics \| Structures \| Software |
| `roleHeld` | string | L | Their role at KUASAR |
| `photo` | image? | F | **Requires consent** |
| `linkedinUrl` | url? | F | **Requires consent** |
| `consentRecordedAt` | date | F | **Required** |
| `consentSource` | string | F | **Required.** Where consent came from |

**The consent fields are required, and that is deliberate design rather than
bureaucracy.** Alumni are people who have left and cannot easily be re-consented, and
their photograph and LinkedIn URL are personal data. Making the fields required means an
editor **physically cannot** publish a portrait without recording where consent came from.

A policy in a document nobody reads does not survive turnover. A required field does.
[ADR 0002](../docs/adr/0002-cms.md) records this as the one part of the KVKK position that
is **not** deferred.

**Alumni are excluded from the content snapshots — the whole entity.** The repository is
public ([ADR 0005](../docs/adr/0005-repository-visibility.md)) and git history cannot be
erased, so an alumnus asking to be removed could be honoured on the site and never in the
backup. Keeping them out of the dump is what makes that request answerable.

Two consequences for anyone changing this entity: **alumni records have no backup**, so a
lost database means re-entering them by hand; and adding a field here adds nothing to any
dump, so do not reason about a new field's recoverability from how the other entities
behave. Both are argued in [ADR 0002](../docs/adr/0002-cms.md).

If consent cannot be obtained, the record still works: name, years, sub-team and role
render fine without a photo. Design the card so the photo is genuinely optional rather
than leaving a hole.

## Sponsor

| Field | Type | | Notes |
| --- | --- | --- | --- |
**Not built yet — deferred deliberately.** See *Deferred* below before implementing this.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `name` | string | F | |
| `logo` | image | F | Prefer SVG; logos sit on a dark canvas |
| `logoLight` | image? | F | For sponsors whose mark is unreadable on dark |
| `url` | url | F | |
| `since` | number? | F | |
| `isCurrent` | boolean | F | Past sponsors still deserve credit |
| `blurb` | text? | L | Usually empty |

**There are no sponsorship tiers, and this is a decision rather than an omission.** No
`platinum | gold | silver` enum, no tier-driven logo sizing, no tier-driven ordering.
KUASAR does not rank its sponsors publicly.

Adding tiers later is not a schema change — it is a **conversation with every existing
sponsor**, because a tier is a promise about how prominently someone appears. That is why
the absence is written down here rather than left as a gap someone helpfully fills in.

So the display is flat: **logos only.** Group by `isCurrent`, sort alphabetically within the
group, render every logo at the same optical weight. Alphabetical is the ordering that
cannot be read as a ranking — any other default invites the question "why is that one
first?"

`logoLight` exists because a sponsor logo designed for white backgrounds will disappear on
`--color-canvas`, and the fix cannot be "ask the sponsor for a new logo."

**Zero:** hide the sponsors section entirely. An empty sponsors section on a site seeking
sponsors is worse than no section — and given the deferral below, zero is the expected
state at launch rather than an edge case.

### Deferred: the sponsor showcase ships later

Displaying a company's logo is using their trademark on a public website, and the sponsors
have not been asked yet. **Do not ship this section until permission has been collected**
per sponsor and recorded somewhere durable.

This is the same shape as the Alumni consent rule and for the same reason — the difference
is only that alumni are people and sponsors are organisations, so the request goes to a
marketing contact rather than an individual. Neither is a formality that can be assumed
because a logo is "already public."

The site launches without a sponsors section. Adding it is a later change proposal, gated
on the permissions existing, not on the components being ready.

## Project Platform and Platform Project

The Project Platform page is where KUASAR shows **non-rocket space and aerospace projects**
and invites members into them. It has two Strapi entities: the page's own content (one
single type) and the projects (a collection). OpenSpec:
`openspec/changes/project-platform-cms/` (the types) and
`openspec/changes/project-platform-page/` (the page).

**The Mission boundary.** KUASAR's rocket Missions stay in git as Missions (the storage rule
above). A rocket Mission is **never** also entered as a Platform Project, and the Project
Platform does not replace the Missions archive. If a project is a KUASAR rocket flight, it is
a Mission.

**The page is `/en/projects` and `/tr/projeler`**, titled Project Platform / Proje
Platformu (`apps/web/components/project-platform/`). It reads both types published-only, so
the Public role has `find` on each and nothing else. The content is in the weekly content
snapshot from the start.

### Project Platform (single type)

One entry per locale: the page intro and hero, the WhatsApp call to action and the
platform's functions. The page heading comes from code, like every section heading.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `intro` | rich text | L | **Required.** What the Project Platform is |
| `whatsappUrl` | url? | F | HTTPS on `chat.whatsapp.com`, `whatsapp.com` (or one subdomain of it, e.g. `www.`) or `wa.me`, with a non-empty path. Null hides the button |
| `whatsappLabel` | string? | L | The button text. Empty means the page's default label |
| `features` | component[] | L | Repeatable `platform.feature`: `{title, description}`, both required. Each locale keeps its own items in its own order |

`features` are the platform's functions (at the time of writing: Project Sharing, Team
Formation, Project Development, Project Support). Their text, count and order are content,
so nothing in the schema fixes them to four.

### Platform Project

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `title` | string | L | |
| `summary` | text | L | Short description |
| `coverImage` | image? | F | |
| `startYear` | number | F | **Required**, 1900–2100. The sort key within each section |
| `endYear` | number? | F | 1900–2100, and not before `startYear`: Strapi cannot check that, so the page's build refuses it |
| `projectStatus` | **enum** | F | `current` \| `past`, required, no default |
| `applicationUrl` | url? | F | HTTPS. When set, the page shows Apply / Başvur; when empty, no application button |

**`projectStatus` is an editorial classification, never derived from the years.** A
current project may be recruiting or may have no open application. A past project belongs in
the past-projects section. The field is not called `status` because Strapi 5 reserves that
name on every type with draft/publish.

**Deliberately absent:** a slug, a long body, a manual display order, and any
application-state field (open/closed, deadline, form type). The suggested page order is
current projects first, then past, each newest `startYear` first, then title. Adding any of
the absent fields later is additive; removing a field deletes its data, so the model starts
small.

**Zero, one, many:** the CMS accepts zero, one or many Platform Projects, and the page handles
each: a section with none shows its own empty message.

## Resource

A downloadable resource on the Resources page: training material, a guide, a document.
The file is uploaded through the Media Library; no resource is a hard-coded file or an
external link. The page's heading and intro are page copy in code, like every section's, so
there is no page-level type. OpenSpec: `openspec/changes/resources-cms/`.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `title` | string | L | |
| `description` | text | L | Short |
| `file` | media | **L** | **Required.** One file, `allowedTypes: files`: the document types the upload configuration allows (PDF, Word and other Office documents, plain text, CSV), never an image, video or audio |

**The entry's locale is the language of its file.** That is why `file` is localized, unlike
every image in this model: a document's language is its content, not a fact about it. A
resource in both languages has its English file in `en` and its Turkish file in `tr`. An
English-only document is created in `en` only and reaches `/tr` through the usual silent
fallback, marked `lang="en"`. A Turkish-only document is created in `tr` only and does not
appear on `/en`.

**Uploaded files are public from the moment they are uploaded,** at their `media.<DOMAIN>`
URL, even while the entry is a draft. The snapshot stores the file's URL, original name and
type, never the file itself, so the original must also be kept in the media archive
([ADR 0002](../docs/adr/0002-cms.md), decision 6).

**Deliberately absent:** a category (no agreed taxonomy yet; an enum is the additive path), a
cover image, a year or date, a manual order, an external URL, a slug and a body. The page
sorts by the localized title. **No frontend reads Resource yet**, and the Public role has no
read permission on it until the page ships.

**Zero, one, many:** the CMS accepts zero, one or many Resources, in either or both locales.

---

## What this model deliberately does not contain

- **No form entities.** Join Us, Connect Us and Summit registration are **links** to
  Google Forms in the club account. No submissions are stored by this site, which keeps
  the KVKK surface as small as it can be while the position is unresolved.
- **No user accounts, no comments, no search index.** This is a promotional and archival
  site, not an application.
- **No per-year Summit components.** Only the enum fields above.
- **No sponsorship tiers.** Sponsors are not ranked; logos render at one weight, grouped by
  `isCurrent` and sorted alphabetically. Adding tiers later means renegotiating with every
  sponsor already listed, so it is a conversation before it is a schema change.
