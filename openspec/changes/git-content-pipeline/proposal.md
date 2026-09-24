## Why

Missions and the Timeline are git-resident content (`docs/adr/0002-cms.md` §3;
`design/content-model.md`) — the credibility content, reviewed through pull
requests rather than edited in a CMS. Nothing can load or validate them yet:
there is no typed loader, no frontmatter parsing, and no example content.
`locale-routing` (merged) established that slugs are routes; this change is
what actually reads the files those routes will point at.

## What Changes

- Add a typed content-loading layer under `apps/web/lib/content/` for the two
  git-resident entity types, Mission and Timeline Entry, each read from
  `content/<type>/<entry>/{index.json, en.mdx, tr.mdx}`.
- Add schema validation that throws — failing the build, not the page — on a
  malformed `index.json` fact (e.g. a non-numeric `apogeeMetres`) or a missing
  or malformed frontmatter field, rather than silently coercing or guessing.
- Expose each locale file's `status: "incomplete"` marker as typed data. This
  change surfaces the marker; it does not render the visible bilingual
  notice `design/i18n.md` requires for it — that belongs to whichever page
  renders the entity.
- Add tests (Node's built-in test runner — no new dependency), including one
  that builds a throwaway three-file Mission directory in a temp folder and
  loads it, demonstrating "adding an entry is three files and no code edit"
  without inventing fictional club history under the real `content/`
  directory. Other tests cover a missing locale file, a missing or empty
  slug, a malformed typed fact, and the `status: incomplete` marker
  surfacing correctly.
- Do **not** add real Mission or Timeline Entry content. Nobody has supplied
  KUASAR's actual mission/timeline data yet, and `content/missions/` is a
  real, rendered-in-production directory once a page consumes it — a
  plausible-looking placeholder entry risks shipping as fabricated club
  history. `content/missions/` and `content/timeline/` start empty; the
  loader's own tests prove the zero-entries case handles that correctly.

Out of scope, by design, and owned by other capabilities:
- Rendering Mission/Timeline Entry pages, the archive/timeline UI, and the
  visible incomplete-translation notice — that is `missions-archive` and
  `timeline-baseline` (not yet proposed).
- CMS-backed entities (Announcement, Alumni, Stellar Talk, etc.) — Strapi's
  territory, already shipped separately by `cms-platform`.
- The locale-parity CI check itself (`scripts/checks/locale-parity.mjs`) —
  already shipped by `verification-gates` (Dev 1). This change's content must
  satisfy that check; it does not modify it.

## Capabilities

### New Capabilities
- `git-content-pipeline`: typed loading and schema validation for
  git-resident Mission and Timeline Entry content, with locale-parity-
  compatible frontmatter and example content proving the pipeline works.

### Modified Capabilities
(none — `platform-foundation`, `verification-gates`, and `locale-routing` are
unaffected at the requirement level; this change only adds new files under
directories those changes scaffolded)

## Impact

- **Audience served:** Serves credibility only. `docs/adr/0002-cms.md` §3
  names missions explicitly as "the credibility content" — this change does
  not target sponsors or prospective members directly.
- **New runtime dependency:** none. Frontmatter parsing is hand-rolled,
  mirroring `scripts/checks/locale-parity.mjs`'s own stated precedent ("a
  dependency-free frontmatter scanner, not a general YAML/frontmatter
  library") for the same fail-closed reasoning: a false pass here would let
  a broken route merge.
- **Content storage:** adds git-resident content under `content/missions/`
  and `content/timeline/`, per `docs/adr/0002-cms.md`'s entity-level storage
  split. No Strapi/CMS content is touched, and no entity is split across
  both systems.
- **Affected code:** `apps/web/lib/content/**`. `content/missions/` and
  `content/timeline/` are not created by this change — see "What Changes"
  above; the loader's zero-entries case covers their current absence. One
  line added to root `package.json`'s `scripts`
  (`test:content`), following the precedent already set by `test:budgets`
  and `test:time` — each capability adds its own script entry to that file
  without contention.
- **Reads, does not modify, another capability's file:** `parseISO` from
  `apps/web/lib/time/date.ts` (Dev 5's `client-time-state`) is reused to
  validate ISO date facts (`launchDate`, Timeline Entry's `date`) rather than
  re-implementing date parsing. `lib/time/` is not edited.
- **Dependency satisfied:** `locale-routing` (merged) — slugs are now
  meaningful routes, per `docs/task-assignments.html`'s stated block
  ("Blocked by locale-routing (slugs are routes)").
- **Downstream:** this change blocks `missions-archive` and
  `timeline-baseline` (neither yet proposed); it does not build either.
