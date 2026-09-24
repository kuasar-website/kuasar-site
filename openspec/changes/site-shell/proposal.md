## Why

Locale routing now supplies the `en`/`tr` route contract, but no shared page frame consumes it: there is no locale layout, navigation, language-switcher UI, skip link, wordmark component, or footer for downstream sections to render inside. The shell must land before page capabilities so sponsors and prospective members receive the same predictable, keyboard-accessible routes in both locales.

## What Changes

- Add a statically generated `app/[locale]/layout.tsx` for exactly `en` and `tr`, using the locale-routing exports and rejecting any other first segment.
- Add a reusable site shell with a skip link, semantic header/navigation/main/footer landmarks, the committed KUASAR wordmark, and responsive Turkish/English navigation set in Inter.
- Add a visible `TR / EN` switcher that maps home and section routes through the locale-routing contract and uses page discovery metadata for exact entity-detail alternates; an unavailable equivalent falls back to the target-locale home with a visible notice contract rather than a 404.
- Keep Timeline and the unresolved Projects entry out of the navbar, keep every internal target locale-prefixed, and preserve the wordmark's one-colour `currentColor` geometry and required clear space.
- Verify keyboard order, long Turkish labels, narrow/mobile layouts, route preservation, static generation, axe/manual accessibility behavior, and first-load budgets on a temporary proof surface that is removed before commit.

## Capabilities

### New Capabilities

- `site-shell`: The observable bilingual layout, navigation, wordmark, locale switcher, landmarks, focus order, responsive behavior, and footer shared by locale-prefixed routes.

### Modified Capabilities

None. This change consumes the existing `localization` contract without changing its requirements.

## Impact

- Writes only `apps/web/components/shell/**`, `apps/web/app/[locale]/layout.tsx`, and this OpenSpec change. A temporary local proof page will not be committed.
- Serves sponsors and prospective members equally by making every downstream route navigable and by keeping Join/Connect destinations available to later page capabilities without privileging either audience in the shell.
- Adds no content entity, CMS field, Strapi request, analytics, embed, animation, runtime dependency, or route-specific page content. No entity is split across git and Strapi.
- Leaves `apps/web/public/brand/kuasar-wordmark.svg`, `apps/web/app/page.tsx`, `apps/web/app/layout.tsx`, `apps/web/next.config.ts`, the locale-routing library, and all other developers' file zones untouched.
