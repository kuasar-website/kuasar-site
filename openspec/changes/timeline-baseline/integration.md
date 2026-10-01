# DEV 5 timeline integration — 2026-09-28

The git-content pipeline (#16), site shell (#18), interaction primitives (#15)
and locale helpers are merged on main. This branch has been updated from main.

## Implemented

- `components/timeline/content.tsx` adapts the merged loader into presentation
  entries. It compiles caption Markdown on the server, validates title/image
  metadata and labels the actual fallback language when a translation is incomplete.
- `/en/timeline` and `/tr/zaman-cizelgesi` use the shared shell and locale metadata.
  Empty content and cross-locale segments return 404. Literal folders avoid the
  missions PR's dynamic section route. No navigation item is added.
- `TimelineSection({ locale })` is the DEV 2 home handoff: it loads the real data
  and shows the localized view-more link only when records exist.
- Populated timeline sitemap entries use `NEXT_PUBLIC_SITE_URL`; an absent domain
  or empty collection produces no false timeline discovery entries.

See the component README for authoring image alternatives and caption restrictions.
See tasks.md for verification. Temporary test records are never committed.

## Remaining owner handoff

DEV 2 composes `TimelineSection` into the localized home. Its real home budget
remains unmeasured until that page exists. Human bilingual phone/desktop review
and baseline merge precede timeline-signature. No server deployment is changed.
