## Why

Stellar Talk and Nebula Night need a readable bilingual showcase before optional motion. This serves credibility for sponsors and helps prospective members understand the team's conversations and screenings.

## What Changes

- Prepare independent data-driven Stellar Talk and Nebula Night blocks using the existing token and action systems, with zero/one/fifty-entry coverage.
- Present speaker identity, sequential talk number, localized title/insight and optional watch/read links; present nights through one or more photos and an untranslated film title.
- Reuse client-time-state for browser-derived status while keeping dates neutral in server HTML.
- Integrate published Strapi data, shared media, localized events routes and home composition after the upstream contracts land.
- Retain optional hover video as an explicit later release task: baseline first; fine-pointer/hover-capable desktop only, no preload, no mobile/reduced-motion fetch, no library, and no budget exception.

## Capabilities

### New Capabilities
- `events-showcase`: Bilingual talk and screening presentation, independent empty states, shared media integration and performance-gated video enhancement.

### Modified Capabilities
None.

## Impact

DEV 5 components, tests and OpenSpec artifacts. Stellar Talk and Nebula Night remain entirely in Strapi; no records are copied into git and no schema change is requested. No new runtime dependency or animation library. DEV 4's media-pipeline #22 is unmerged and changes these image fields into shared.image components; do not introduce a competing image pipeline. Public route publishing and production CMS integration remain explicit open tasks. No CMS, hosting or other developer's branch is modified.

## Dependency update — 2026-10-01

Media-pipeline #22 has merged. This implementation now consumes its shared media contract and adds the published CMS loader and both static routes. The shared publishing webhook and human review remain release follow-ups; no infrastructure is changed.
