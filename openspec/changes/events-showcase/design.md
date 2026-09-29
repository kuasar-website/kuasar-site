## Context

See proposal.md. Main has cms-platform, client-time-state, localized shell and shared actions. DEV 4's media-pipeline #22 remains unmerged; its proposed shared.image components replace the current raw media fields. Authority: ADRs 0001–0004, design/content-model.md, design/i18n.md, design/motion.md and design/tokens.md.

## Goals / Non-Goals

Goals: prepare the complete static presentation and independent empty states against stable event facts, then connect the final shared media/CMS contracts without redesigning the view.

Non-goals: changing CMS schemas, media processing, deployment, publishing handlers or other owners' branches. This preparation does not publish mock event routes or pretend isolated tests measure production route budgets.

## Decisions

- Use a Server Component with localized presentation records. Render talks as an editorial list with a portrait column, event number, speaker, title, pull-quote and shared text ActionLinks. Render nights as large still photography with a simple wrapping gallery; one photo gets the full available width. A carousel adds no useful capability and is rejected.
- Media arrives in explicit server-rendered slots. The future adapter fills them with DEV 4's MediaImage after toMediaImage validation. This avoids a parallel image loader and avoids importing another author's unmerged code. Native fixture images are test-only.
- Reuse DateTime. Server output retains semantic ISO data and neutral state; browser enhancement uses the existing clock. Missing dates have localized neutral text. Sorting compares supplied ISO values only, never now.
- No new runtime dependency, no new CMS field and no content stored in git. Titles/insights/descriptions are localized by the adapter; speaker names, numbers and film titles come from shared facts. A contentLocale tag supports silent default-English CMS fallback.
- This first implementation introduces no motion tier. The later video preview is an optional L2 media enhancement on the events routes, with no animation library. No video component, src or preload is shipped in the preparation baseline. After baseline review, enforce hover/fine-pointer/desktop/reduced-motion gates before attaching a source, and verify network requests directly.
- The presentation is server-rendered; DateTime and shared ActionLink reuse existing client infrastructure. The actual events route must measure ≤175KB and zero deferred animation-library JS after integration. Do not infer route success from isolated CSS fixtures.

## Risks / Trade-offs

- Unmerged media schema → keep actual adapter/route tasks open; record the inspected #22 interface in the handoff.
- Required night photos → reject a populated night with zero photos instead of inventing imagery or silently losing content.
- Missing optional portrait → render a complete text-led talk, without an empty image frame, matching the actual CMS schema.
- CMS fallback and pagination → integration tests must cover missing Turkish records, published-only filtering and more than one API page before release.
- Video network leakage on mobile → do not attach a video source until eligibility and deliberate hover; test that negative cases issue zero requests before shipping enhancement.

## Migration Plan

Submit preparation as a draft. After media-pipeline lands, wire its types and build-time published CMS loader, then the two localized routes and DEV 2 home handoff. Verify actual route budgets and publish/revalidation. Review and ship the static version before optional video. Revert only the DEV 5 presentation if necessary; no CMS migration is introduced.
