# Events showcase — static presentation

`EventsShowcase` is a Server Component. Give it `locale`, `talks` and `nights`;
empty collections disappear independently. Dates sort newest first without reading
the server clock; missing dates follow dated entries. `DateTime` supplies neutral
HTML and derives relative state in the browser after hydration.

Stellar Talk accepts optional portrait, insight, watch and read links. Speaker names,
film titles and the two event brands are preserved. A Nebula Night requires at least
one photo. Supply a unique stable CMS document identity for each event and photo.
Use a unique `id` prop if rendering more than one showcase on a page.

Media slots are server-rendered React elements, not raw CMS URLs. After media-pipeline
#22 merges, the server adapter must construct these with its `toMediaImage` validator
and `MediaImage` component (localized alt text, intrinsic dimensions and approved
host). The adapter must also validate outgoing HTTP(S) links and project published
localized CMS data. If Turkish content is missing, provide English text and
`contentLocale="en"`; controls remain Turkish and no fallback notice is shown.
Do not split event records between Strapi and git. Synthetic entries live only in tests.

This draft contains no CMS fetcher, public events route, home composition or hover
video. These remain explicit tasks in `openspec/changes/events-showcase/tasks.md`.
The final CMS image shape is being changed in #22; do not copy its unmerged schema.
DEV 2 owns home composition. Static baseline review/shipping precedes video enhancement.

## Verification

From the repository root, after `npm ci` and `npm ci --prefix tests/events`:

- `node --test tests/events/baseline.test.mjs`: server HTML, collections, optional
  content, sorting and fallback-language contract.
- `npm --prefix tests/events test`: Chromium and Firefox with JavaScript disabled,
  phone/tablet/desktop widths, keyboard links and reduced motion.
- `node tests/events/serve.mjs`: isolated bilingual fixture at port 4177.

The fixture uses the real component, ActionLink, DateTime and production token CSS.
It has no hydration script. Shared time-state CI covers the clock separately.
Passing fixture checks does not establish the eventual production events route's
175KB budget, real CMS publishing or human visual acceptance.
