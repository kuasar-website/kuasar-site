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

No dedicated timeline browser CI gate is added in this preparation. Before this
change is ready, test both locales with JavaScript disabled: tab to the scroll
region and every card/link, scroll with arrow keys without trapping focus, check
320px/768px/desktop widths, touch swiping, and reduced-motion (no snap or smooth
scroll). Test empty routes after integration. Measure real route budgets then;
passing SSR tests does not establish first-load performance.
