# DEV 5 integration handoff — 2026-09-25

This is preparation against inspected contracts, not completed route integration.
Do not merge the upstream PRs on behalf of their owners.

## Available and pending contracts

- Locale helpers are on main: `apps/web/lib/i18n/segments.ts` exports `Locale`,
  `sectionPath`; `metadata.ts` exports `sectionAlternates`.
- PR #16, inspected at `1a9e26260eac367ab1a5e3abbc77fd7839758a2b`, exports
  `loadTimelineEntries()` from `apps/web/lib/content/timeline.ts`. It is not
  merged. Do not introduce a second loader.
- PR #18, inspected at `1989538eb3fee11260a6eb070a58535a86c5a82a`, provides
  `app/[locale]/layout.tsx` and `SiteShell`. It owns `main#main-content`; DEV 5
  page content must not add a nested main or duplicate shell.

## Loader-to-view mapping

| Source in PR #16 | Timeline presentation |
| --- | --- |
| `entry.id` | `id`; stable across locales |
| `entry.facts.date`, `.kind` | `date`, `kind`; never compute now |
| `entry.locales[locale].fields.title` | Validate as a nonempty title before rendering |
| `entry.locales[locale].body` | Trusted git MDX source, **not** already rendered React |
| `entry.facts.image` | A path or null, **not** the required image metadata object |
| `entry.facts.link` | Optional link; omit null |
| `entry.locales[locale].translationStatus` | Visible notice when `incomplete` |

Do not spread the loader result straight into the component.

## Decisions still needed for real content

1. PR #16 deliberately does not compile MDX. Select the repository's approved
   rendering contract before wiring `body: ReactNode`; do not inject the source
   string as HTML or silently strip Markdown/MDX syntax.
2. Image facts contain only a path. Resolve real dimensions and localized alt
   text through the agreed asset/content contract. Do not invent dimensions,
   silently drop a supplied image, or modify DEV 3's schema without coordination.
3. The loader accepts the shared ISO parser, which also accepts datetimes, while
   the presentation's current sorting contract is YYYY-MM-DD. Confirm date-only
   timeline records or extend DEV 5 ordering with explicit mixed-date tests;
   raw lexicographic sorting is not a general timezone-aware datetime sort.
4. Incomplete translation rendering must select the available locale's content
   and label its language. If both are incomplete, do not fabricate an available
   translation link. Retain a visible incomplete notice; this needs adapter tests.

## Route wiring after dependencies merge

Use `sectionPath('timeline', locale)` and
`sectionAlternates('timeline', locale)`; do not duplicate URL segment tables.
For an empty loader result, omit the home section/link and return the route's
localized not-found behaviour. Check sitemap output too: the current locale map
lists possible sections, not evidence that populated routes exist.

Use `<Timeline id="timeline" headingLevel={1} ... />` for the dedicated page;
use the default heading level 2 for the home section. Entry headings follow the
selected level. The shell owns main; the page owns its single h1.

Stable entry targets are provided by `timelineEntryId` and
`timelineEntryFragment`. Link an available translation with:

```
sectionPath('timeline', availableLocale)
  + timelineEntryFragment('timeline', entry.id)
```

Use the same destination instance ID in both locale pages. The fragment helper
encodes the DOM identifier for URL use, including non-ASCII IDs and percent signs.
Do not invent per-entry detail routes from the loader's slug field.

## Verification before marking complete

- Compile against the **merged** loader and locale types, not copied local schemas.
- Zero/one/fifty real-loader fixtures; both locales; incomplete/both-incomplete
  translations; optional images; valid date formats and invalid data errors.
- Correct h1/h2 hierarchy, cross-locale anchors, canonical/hreflang, empty-route
  behaviour and absence of dead sitemap entries.
- Integrated shell keyboard/locale-switcher checks and actual route budgets.
- Home assembly remains DEV 2's change; no navbar Timeline entry is added.

This document adds no production route or content record and does not complete
OpenSpec tasks 2.1–2.3 or 3.1/3.3.
