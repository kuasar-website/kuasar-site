# DEV 5 hero baseline

A server-rendered permanent fallback for the future home hero. No client boundary,
animation, runtime dependency, external logo request or content fetch.

Use `Hero` once inside the home page's main element. It owns the page h1. Supply
`locale`, `sponsorAction` and `joinAction`. Both actions are required and must be
server-renderable shared site-shell links/buttons with localized labels and real
URLs. Do not pass an action hidden behind client state. The hero controls only
composition; it does not introduce another button variant. Suggested labels:
“Contact us” / “İletişime geç” and “Join us” / “Bize katıl”. Final styling and route
contracts come from site-shell. No production destinations are invented here.

The team name stays exactly “Koç University Association of Space & Rocketry”,
marked as English in both locales. Audience context uses Inter and localized copy.
The inline wordmark uses semantic ink colour, canonical path geometry and 0.28×
clear space. Regenerate its JSX copy after an approved artwork update with:

```
node tests/hero/generate-wordmark.mjs
node --test tests/hero/baseline.test.mjs
```

The source remains `public/brand/kuasar-wordmark.svg`. Tests compare the generated
paths and viewBox to it, including the SVG's unfilled root. Never re-typeset or
hand-edit the generated artwork.

## Verification

After root `npm ci`, run the SSR tests above and the web TypeScript, ESLint and
Stylelint checks. For the isolated Chromium/Firefox fixture:

```
npm ci --prefix tests/hero
npm exec --prefix tests/hero -- playwright install chromium firefox
npm --prefix tests/hero test
```

Tier B hero baseline runs these checks on GitHub. Its fixture uses the production
hero and token stylesheet, JavaScript disabled, and plain test-only action links.
It checks both languages, 320/390/1280px layouts, clear space, logo minimum width,
keyboard actions and static reduced motion. It does not verify the future shared
buttons, real destination URLs or site-shell.

## Still required

Site-shell/home integration by the owning teams, actual `/en` and `/tr` first-load
JS measurements (≤160KB), real-phone LCP (<2.5s), and bilingual visual review.
Fixture checks cannot replace these. Keep the change draft until the tasks in
`openspec/changes/hero-baseline/tasks.md` are complete. Hero-signature is separate.

## Shared integration (2026-09-28)

`HomeHero({ locale, sponsorHref })` composes the real shared `ActionLink` variants
with the existing Hero. Join URLs come from `sectionPath`, not a second route map.
The home owner supplies the approved Connect Us/PDF destination. No placeholder
is a default. The #24 about-and-join PR contains the club's verified `FORM_LINKS`
contract; consume that once merged rather than copying its URL into DEV 5.

The browser fixture now renders the actual `SiteShell`, `HomeHero`, shared button
CSS and language contexts. Destination endpoints in the fixture remain test-only.
This covers shell composition and keyboard interaction without publishing a new
home route or taking over DEV 2's home-composition task.
