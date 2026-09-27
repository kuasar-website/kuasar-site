## Context

See `proposal.md` — Why. `docs/adr/0001-stack.md` §6 is the governing decision; this
change implements it against the actually-installed package versions (checked against the
npm registry and the installed `node_modules` at implementation time: `@vercel/analytics`
2.0.1, `@vercel/speed-insights` 2.0.0, `next` 16.3.1 already pinned), not assumed from
training data.

`locale-routing` (merged) already owns `robots.ts` and `sitemap.ts` — both are read here
against every requirement `docs/task-assignments.html`'s `seo-analytics` row would
otherwise ask for, and both already pass, so neither file is edited by this change.

## Goals / Non-Goals

**Goals:**
- Web Analytics and Speed Insights live from the moment the site has any traffic, counted
  against the same budget as everything else.
- The root layout's metadata is real KUASAR fallback content, not the `create-next-app`
  placeholder, and does not corrupt any route-specific metadata already written by other
  capabilities.
- The one authorized custom event has a single, named, reusable definition, ready for
  whichever capability builds the interaction it belongs to.

**Non-Goals:**
- Building the Galactic Summit page, its "Become a Partner" action, or any other route.
- Editing `robots.ts` or `sitemap.ts` — both are already correct.
- Adding Google Analytics, Tag Manager, a pixel, or any third-party embed — barred outright
  by `docs/adr/0002-cms.md`'s KVKK debt section.
- Registering the production domain, or replacing the `<DOMAIN>` placeholder — that remains
  unresolved per `CLAUDE.md`, "Unresolved, on purpose," and is not settled by this change.
- Resolving the root `<html lang>` question `site-shell`'s own design.md already deferred
  to a coordinated i18n-hardening change — untouched here.

## Decisions

### Analytics and Speed Insights mount once, in the root layout, via their `/next` entry points

`@vercel/analytics/next` and `@vercel/speed-insights/next` are both pre-built Client
Components (`"use client"` at the top of their own module, confirmed by reading the
installed package's `dist/next/index.mjs`), so importing and rendering them from
`app/layout.tsx` does not require making the root layout itself a Client Component. They
are rendered once, as the last two children of `<body>`, matching Vercel's own documented
placement. No `route`/`basePath` prop is needed: this app has no Next.js `basePath`
configured.

**Budget, deliberately not exempted.** `docs/adr/0001-stack.md` §6 states both wrapper
components count against the JavaScript budget "like anything else. No exemption — an
exemption here becomes the precedent for the next one," and separately notes the limit of
that enforcement: the wrapper components are measured by `check:budgets`; the runtime
scripts they fetch at request time from `/_vercel/insights/...` are not, and this design
does not claim otherwise.

### Root metadata gets a `title.default`, never a `title.template`

`about-and-join` (merged) already sets each page's own `title` as a full string ending in
`" | KUASAR"` (its own `pageMetadata()` helper). Per the installed Next.js 16.3.1 docs
(`node_modules/next/dist/docs/.../generate-metadata.md`, "title.template"): a parent's
`title.template` applies to any child that provides `title` as a plain string, and only a
child's own `title.absolute` opts out. Setting a root `template` here would therefore
silently double-suffix every existing and future route's title
(`"About KUASAR | KUASAR | KUASAR"`). `title.default` alone has no such effect — per the
same doc, "`title.template` has no effect if a route has not defined a title or
title.default" — so it only supplies a fallback for a route with no title of its own
(today: the stock `/` page and `/_not-found`), and leaves every other route's title
untouched. If a route ever wants a shared template, that is a coordinated decision across
every capability that already sets its own title string, not something to introduce
unilaterally here.

### `metadataBase` is added; it resolves relative URLs, it does not add or override any route's own fields

Next.js resolves a relative `alternates.canonical`/`alternates.languages` URL against
`metadataBase` when the parent layout sets one, and otherwise silently falls back to
`http://localhost:3000` in the resolved output. `locale-routing`'s `sectionAlternates()`
(used by `about-and-join` today, and by every future page capability) already returns
root-relative paths for exactly these fields. Setting `metadataBase` here, using the same
`NEXT_PUBLIC_SITE_URL ?? "https://<DOMAIN>"` placeholder pattern `robots.ts`/`sitemap.ts`
already use, means those relative URLs resolve to the real (eventual) site origin without
any change to `sectionAlternates()` itself or to any page's own metadata object.

### The sponsorship-PDF event is a named helper, not wired to anything yet

`design/content-model.md`'s Galactic Summit section names `sponsorshipPdf` as "the one
custom analytics event worth instrumenting," and `docs/adr/0001-stack.md` §6 confirms
custom events are available on the Hobby plan against the same allowance as page views.
But the interaction it belongs to — a "Become a Partner" link or button on a Galactic
Summit page — does not exist anywhere: not on `main`, and not in any of the open PRs
inspected at implementation time (`missions-archive`, `about-and-join`, `media-pipeline`,
`alumni-directory`, `announcements`, `hero-baseline`, `timeline-baseline`). Building that
page, or a placeholder for it, is `galactic-summit`'s job, not this capability's — doing so
here would take ownership of a route this capability does not own, which
`docs/task-assignments.html`'s "one owner per path" convention (already invoked by
`locale-routing` and `site-shell` for the same reason) rules out.

What this change adds instead: `apps/web/lib/analytics/events.ts` exports
`trackSponsorshipPdfOpened()`, a one-line wrapper naming the event exactly once
(`"Sponsorship PDF opened"`), so that whichever capability builds the real interaction
imports and calls this function from its click handler rather than re-typing the event
name inline. `track()` (from `@vercel/analytics`) throws or warns if called outside a
browser, which is why this module is a client boundary (`"use client"`) — the eventual
call site will need to be a Client Component regardless, since a click handler requires
one.

**This does not satisfy the "instrument it" acceptance line from ADR 0001 §6 on its own**,
and this design does not claim that it does — see `tasks.md` for the explicit split between
what is done and what remains blocked.

### No new client-side JS beyond the two analytics wrappers

`apps/web/lib/analytics/events.ts` adds no client bundle weight on its own: nothing in this
change imports it into any route yet (there is no call site). The two analytics wrappers
are the only new first-load JS this change introduces, and they are measured by the
existing budget check, not exempted from it.

## Risks / Trade-offs

- **The sponsorship-PDF event may end up defined here and forgotten** if the Galactic
  Summit capability's author doesn't know this helper exists. Mitigated by naming it
  explicitly in this change's `tasks.md` as a blocked, not skipped, item, and by keeping
  the function itself trivial to find (`apps/web/lib/analytics/**`, matching the existing
  `apps/web/lib/{i18n,time,content}/**` convention).
- **`metadataBase` still points at the `<DOMAIN>` placeholder.** Every resolved canonical/
  hreflang URL will read `https://<DOMAIN>/...` until the domain is registered and
  `NEXT_PUBLIC_SITE_URL` is set — no worse than `robots.ts`/`sitemap.ts`'s existing state,
  and corrected the same way, in one place, once the domain exists
  (`docs/ops/cms-runbook.md`, step 1).
- **No CI gate measures the `/_vercel/insights/...` runtime scripts' weight** — recorded
  explicitly, per `docs/adr/0001-stack.md` §6's own admission that CI "covers most of the
  weight, not all of it."

## Migration Plan

Add the two dependencies, the layout metadata/analytics mount, and the unwired event
helper on `feat/seo-analytics`. Reverting removes only these additions; it does not touch
`robots.ts`, `sitemap.ts`, or any other capability's files. Archive only after the
sponsorship-PDF wiring question in `tasks.md` is either resolved by the Galactic Summit
capability or explicitly re-confirmed as still blocked.

## Open Questions

- Which capability (presumably a not-yet-proposed `galactic-summit` change) will call
  `trackSponsorshipPdfOpened()`, and when. Not decided here — this change only supplies the
  contract.
