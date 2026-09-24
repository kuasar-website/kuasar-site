## Why

KUASAR's missions are the site's primary credibility evidence, but the repository has no
public archive or detail route that can turn git-resident mission records into a usable
bilingual history. Once `git-content-pipeline` and `site-shell` land, this is Dev 2's next
surface and the first page capability that can exercise both contracts together.

## What Changes

- Add statically generated `/en/missions` and `/tr/gorevler` archive routes plus localized
  mission-detail routes, sourced entirely from the git mission loader.
- Present missions as a chronological archive rather than generic cards; each mission
  patch is the detail-page affordance, and adding content never requires a layout edit.
- Render mission facts honestly: a null apogee remains visibly unconfirmed, launch dates
  are neutral on the server, and any upcoming state is delegated to `client-time-state`.
- Add bilingual detail views for objective, technical summary, results, gallery, links,
  and team roles, including the visible `status: incomplete` contract for git content.
- Make zero, one, and fifty mission states deliberate, with localized descriptive image
  alternatives and no hidden/truncated evidence at narrow widths.
- Generate canonical and `hreflang` discovery metadata from each mission's per-locale
  slug so `site-shell` can preserve the exact entity when switching language.

## Capabilities

### New Capabilities

- `missions-archive`: The observable bilingual mission archive, mission-detail pages,
  zero/one/many behavior, mission fact presentation, imagery, and locale switching
  metadata.

### Modified Capabilities

None. The change consumes the existing localization, git-content, site-shell, and
client-time-state contracts without changing their requirements.

## Impact

- Serves credibility directly for sponsors and judges, and shows prospective members the
  real technical work and team roles behind each flight; neither audience is ranked.
- Writes only `apps/web/app/[locale]/(missions)/**`,
  `apps/web/components/missions/**`, and this OpenSpec change. Mission content remains
  owned by Dev 3 under `content/missions/**`.
- Mission is a git-resident entity and stays wholly in git. No Mission field is read from
  or duplicated into Strapi, and no new content entity is introduced.
- Adds no runtime dependency, CMS request, analytics, embed, animation library, or
  time-based/cron revalidation.
- Implementation remains blocked until PR #16 (`git-content-pipeline`) and PR #18
  (`site-shell`) merge. This branch deliberately contains neither PR's code and will be
  updated from `main` only after both land.
