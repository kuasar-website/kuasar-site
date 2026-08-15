# Content model

Every entity, its fields, and where it is stored.

- **Last updated:** 2026-08-15
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
| **Strapi** | Stellar Talk, Nebula Night, Galactic Summit, Schedule Event, Announcement, Alumni, Sponsor | Editors, in the admin panel |

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

## Stellar Talk

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `speakerName` | string | F | A person's name is not translated |
| `speakerPortrait` | media | F | |
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
| `photos` | media[] | F | The layout is photography-led; one photo is the minimum |
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
| `speakers` | relation[] | F | |
| `sponsors` | relation → Sponsor | F | |
| `photos` | media[] | F | Past editions |
| `contactAddress` | text | L | |
| `sponsorshipPdf` | media | F | The "Become a Partner" target |
| `registrationUrl` | url? | F | Null disables the Register CTA |
| `accentToken` | **enum** | F | `aurora` \| `ion` \| `violet` \| `ember` |
| `heroTreatment` | **enum** | F | Fixed set, defined in code |
| `backgroundImage` | media? | F | |

The last three are the **only** place in this project where a CMS field selects a design
token ([ADR 0002](../docs/adr/0002-cms.md), decision 7). Choosing among existing values is
a data operation; adding a new value is a code change, because the values are defined in
[tokens.md](tokens.md). Never new components, never a new layout — unbounded, this clause
forks the codebase by the third year.

`sponsorshipPdf` is a Strapi media field rather than a file in the repository, so a
non-technical member can replace it each season without a pull request. Opening it is the
one custom analytics event worth instrumenting
([ADR 0001](../docs/adr/0001-stack.md)).

`ASSUMPTION:` "Register / Join the Summit" is disabled while `registrationUrl` is null.
When enabled it links to a Google Form in the club account — **linked, never embedded**.

## Schedule Event

Google-Calendar-style month view. **Forward-looking**, and distinct from Timeline.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `startsAt` | datetime | F | |
| `endsAt` | datetime? | F | |
| `type` | enum | F | Drives colour; the legend sits beside the calendar |
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
| `coverImage` | media? | F | |

## Alumni

Styled slightly apart from its navbar siblings.

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `name` | string | F | |
| `yearJoined` | number | F | |
| `yearLeft` | number? | F | |
| `subTeam` | enum | F | Propulsion \| Avionics \| Structures \| Software |
| `roleHeld` | string | L | Their role at KUASAR |
| `photo` | media? | F | **Requires consent** |
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

If consent cannot be obtained, the record still works: name, years, sub-team and role
render fine without a photo. Design the card so the photo is genuinely optional rather
than leaving a hole.

## Sponsor

| Field | Type | | Notes |
| --- | --- | --- | --- |
| `name` | string | F | |
| `logo` | media | F | Prefer SVG; logos sit on a dark canvas |
| `logoLight` | media? | F | For sponsors whose mark is unreadable on dark |
| `url` | url | F | |
| `tier` | enum | F | See below |
| `since` | number? | F | |
| `isCurrent` | boolean | F | Past sponsors still deserve credit |
| `blurb` | text? | L | Usually empty |

`ASSUMPTION:` tiers are needed, as `platinum | gold | silver | supporter | in-kind`, driving
logo size and ordering. Confirm — if the team would rather not rank sponsors publicly,
replace the enum with a single `isCurrent` grouping and sort alphabetically. **Decide this
before the first sponsor is added**, because changing it later means renegotiating with
people who were promised a tier.

`logoLight` exists because a sponsor logo designed for white backgrounds will disappear on
`--color-canvas`, and the fix cannot be "ask the sponsor for a new logo."

**Zero:** hide the sponsors section entirely. An empty sponsors section on a site seeking
sponsors is worse than no section.

---

## What this model deliberately does not contain

- **No form entities.** Join Us, Connect Us and Summit registration are **links** to
  Google Forms in the club account. No submissions are stored by this site, which keeps
  the KVKK surface as small as it can be while the position is unresolved.
- **No user accounts, no comments, no search index.** This is a promotional and archival
  site, not an application.
- **No per-year Summit components.** Only the enum fields above.
