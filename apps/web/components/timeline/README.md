# Native timeline baseline — DEV 5

`Timeline` is a server-compatible presentation component. Import it from a Server
Component and provide validated entries from the git-content pipeline once that
pipeline lands. It does not fetch content, compute today's date or install a
client carousel. It has no runtime dependency beyond the existing React workspace.

Use a unique `id` per instance, `locale: "tr" | "en"`, and `entries`. Dates must be
validated ISO date-only values from the loader. The component copies and sorts the
input, newest first. The `body` is already-localized, trusted rendered content;
it is not an HTML string. The adapter owns MDX compilation and incomplete locale
resolution. Supply `availableTranslationHref` for incomplete content so the
required notice appears. Images require intrinsic dimensions and meaningful alt
text (or empty alt for decorative imagery).

Pass `viewMoreHref` for the home variant only when the matching timeline route
exists. Omit it on the full route. Empty entries return `null`. The eventual route
must additionally return its localized not-found response for empty content.

## Current delivery boundary

The component is preparation, not a completed production route. The upstream git
loader and locale routes are absent on this base. Do not work around that by
adding mock production content, a second loader, or an independent locale router.
The remaining integration steps are in
`openspec/changes/timeline-baseline/tasks.md`. Home composition belongs to DEV 2;
git-content-pipeline and locale-routing belong to DEV 3. No CMS or hosting edits
are needed for this preparation.

## Verification

From the repository root, after `npm ci`:

```
node --test tests/timeline/baseline.test.mjs
npm run typecheck --workspace web
npm run lint --workspace web
npm run stylelint
```

The eight SSR tests check zero/one/fifty records, stable descending order without
mutating input, raw neutral dates, bilingual notices and optional imagery. They do
not prove visual layout or keyboard scrolling. They use the existing TypeScript
compiler and the web workspace's React version, so the CMS React version cannot
contaminate rendering.

The `Tier B timeline baseline` workflow runs the SSR tests and isolated browser
fixture against the actual component and production token stylesheet. Run it locally:

```
npm ci --prefix tests/timeline
npm exec --prefix tests/timeline -- playwright install chromium firefox
npm --prefix tests/timeline test
```

Browser scenarios cover both locales with JavaScript disabled, zero/one/fifty
entries, arrow-key scrolling, tab access to every card/link and escape from the
region, 320px/768px/1280px widths, and reduced-motion (no snap or smooth scroll).
Chromium additionally checks a native touch gesture; that CDP-only case is skipped
in Firefox. Fixture content is synthetic and is never used by production routes.
Test empty production routes after integration. Measure real route budgets then;
passing fixture tests does not establish route performance or complete integration.
A real-device visual/copy review remains required.
