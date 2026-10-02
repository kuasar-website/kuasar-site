## Purpose

Show KUASAR's forward-looking calendar of published Schedule Events in Turkish and English
as a static page. The month shown and the past/live/upcoming state are always derived from
the visitor's browser clock, never from build time.

## ADDED Requirements

### Requirement: Localized static schedule routes
The system SHALL serve the schedule at `/en/schedule` and `/tr/takvim` as statically
generated pages, with no time-based revalidation and no Strapi request while a page is
served. Each route SHALL render only for its own locale. It SHALL carry the shared shell,
a language switcher that resolves to the other locale's schedule route, self-canonical and
`hreflang` alternates, and a localized page title ("Schedule" / "Takvim"). When the CMS
origin is not configured outside production, neither route SHALL be generated. A
production build without a CMS origin SHALL fail explicitly.

#### Scenario: Both locales resolve
- **WHEN** a visitor opens `/en/schedule` or `/tr/takvim`
- **THEN** the page renders in that locale, and the language switcher links to the other locale's schedule route

#### Scenario: Wrong-locale segment
- **WHEN** a visitor requests `/en/takvim` or `/tr/schedule`
- **THEN** the response is the locale's not-found page

#### Scenario: No request-time CMS dependency
- **WHEN** built schedule pages are served in either locale while the CMS is unreachable
- **THEN** they render from the build output, and no request reaches the CMS

### Requirement: Published Schedule Event data with locale fallback
The system SHALL load only published Schedule Event documents at build or revalidation
time, following every pagination page. It SHALL consume exactly the existing fields
`startsAt`, `endsAt`, `type`, `title`, `location`, `description` and `url`, and add
none. On the Turkish route, a document's Turkish publication SHALL replace its English
one by `documentId`. A document published only in English SHALL appear on the Turkish
route in English, marked with `lang="en"`. The English route SHALL show English
publications only.

#### Scenario: Draft never shown
- **WHEN** a Schedule Event exists only as a draft
- **THEN** it appears on neither locale's route

#### Scenario: Missing Turkish translation
- **WHEN** an event is published in English but not in Turkish
- **THEN** `/tr/takvim` shows the English title, location and description with `lang="en"`, and the date, time and type label are still in Turkish

#### Scenario: Many pages of results
- **WHEN** more events exist than one CMS page holds
- **THEN** every published event appears exactly once in each locale

### Requirement: Malformed and missing data behaviour
The system SHALL fail the build with an error that names Strapi and points to
`docs/ops/cms-runbook.md` when the CMS is unreachable or unauthorised, or returns a
malformed response, or when an event has:
- a missing or non-ISO `startsAt`,
- a non-ISO `endsAt`,
- an `endsAt` earlier than its `startsAt` (an invalid interval),
- a `type` outside `talk | screening | summit | workshop | other`,
- a missing title,
- or a `url` that is not an absolute HTTP(S) URL without credentials.

It SHALL NOT treat any of these as an empty calendar. It SHALL NOT skip the offending
event, and it SHALL NOT render it in a degraded form (for example placed on its start day
without a state marker). An `endsAt` equal to `startsAt` is valid and denotes an instant.

#### Scenario: Unreachable CMS
- **WHEN** the CMS cannot be reached during a build
- **THEN** the build fails with a message naming Strapi and the runbook, not a raw network error

#### Scenario: Contract violation
- **WHEN** a published event arrives without a valid `startsAt` or with an unknown `type`
- **THEN** the build fails, naming the event's `documentId` and the field

#### Scenario: Editor enters an end before the start
- **WHEN** a published event's `endsAt` is earlier than its `startsAt`
- **THEN** the build fails, naming the event's `documentId`, both fields and the runbook, and no schedule page in either locale is produced from that data

### Requirement: Neutral server-rendered baseline
The server-rendered page and the first client render SHALL contain every loaded event in
one chronological list, grouped under month headings and ordered by `startsAt`, with ties
in a stable source order. Each event SHALL show:
- its localized date, plus a time for timed events (formatted per locale in
  Europe/Istanbul) and an end date or time when present,
- its visible type label,
- its title,
- its location and description when present,
- and its `url` as a link when present.

The baseline SHALL contain no past/live/upcoming text, attribute or styling. It SHALL
NOT select a "current" month. Each date SHALL carry its raw ISO value in a `datetime`
attribute. The page SHALL show the timezone note from the bilingual copy table in its locale.

#### Scenario: JavaScript disabled
- **WHEN** a visitor opens either locale without JavaScript
- **THEN** every published event is readable in the list, with no state markers and no month grid

#### Scenario: Zero events
- **WHEN** no Schedule Event is published
- **THEN** both routes exist and show an explicit localized empty message from the bilingual copy table, never a blank page

#### Scenario: One event
- **WHEN** exactly one event is published
- **THEN** both locales show one month heading containing that single event

#### Scenario: Fifty events
- **WHEN** fifty events across several months are published
- **THEN** both locales list all fifty under their months, in chronological order, without horizontal page scroll at 320px

### Requirement: Istanbul calendar-day placement
The system SHALL assign events to calendar days and months in the Europe/Istanbul time
zone, whatever the visitor's device zone. Each event SHALL occupy every Istanbul day that
its interval `[startsAt, endsAt)` overlaps. An event without `endsAt`, or with `endsAt`
equal to `startsAt`, SHALL occupy only its start day. An event ending exactly at an
Istanbul midnight SHALL NOT occupy the following day. An event spanning a month boundary
SHALL appear in each month it overlaps.

#### Scenario: Late-evening UTC instant
- **WHEN** an event starts at `2026-11-30T22:30:00Z` (01:30 on 1 December in Istanbul)
- **THEN** both locales place it on 1 December and show the time 01:30, whether the device zone is UTC, Europe/Istanbul or America/New_York

#### Scenario: Multi-day event
- **WHEN** an event runs from 10:00 on 6 November to 18:00 on 8 November, Istanbul time
- **THEN** the grid shows it on 6, 7 and 8 November, and the agenda lists it once with its full range

### Requirement: Client-derived visible month
After mount, the system SHALL show a month grid that opens on the Europe/Istanbul month
containing the browser's current time, computed only in the browser. When the browser
clock crosses an Istanbul month boundary, the grid SHALL follow it to the new month,
unless the visitor has already navigated to another month. The agenda below the grid
SHALL list the events that overlap the visible month. If there are none, it SHALL show a
localized empty message for that month.

#### Scenario: Old build opened months later
- **WHEN** HTML built in August is opened in December, in either locale
- **THEN** hydration matches the neutral HTML, and the grid then opens on December without any rebuild or revalidation

#### Scenario: Zero events after mount
- **WHEN** no events are published and JavaScript runs
- **THEN** the grid shows the current month and the explicit empty message, not a blank calendar

### Requirement: Month navigation
The system SHALL provide previous-month, next-month and today controls with localized
accessible names. Navigation SHALL be client-local: it SHALL NOT change the URL and SHALL
make no network request. "Today" SHALL return to the browser's current Istanbul month.
Every month change SHALL be announced through a polite live region that names the month
and year in the page locale.

#### Scenario: Navigate forward and back
- **WHEN** a visitor activates "next month" and then "today", in either locale
- **THEN** the grid shows the following month, then returns to the current month, and the localized month name is announced each time

### Requirement: Browser-derived event state, not by colour alone
After mount, the system SHALL classify each event against the browser clock:
- upcoming before `startsAt`;
- live from `startsAt` (inclusive) to `endsAt` (exclusive);
- past at `endsAt`, or at `startsAt` when there is no end.

Updates SHALL happen while the page is open, without a reload. Live and upcoming SHALL use
the existing state tokens, and past SHALL use the past token. Each state SHALL also be
conveyed as text: a visible "Live now" / "Şimdi" badge for live events, and an
accessible state label for upcoming and past events. Event-type colours SHALL never be
used to signal state.

#### Scenario: Event goes live while open
- **WHEN** the browser clock passes an event's start while the page is open, in either locale
- **THEN** within about a second the event shows the live badge and live styling, and later shows as past once its end passes

#### Scenario: Colour removed
- **WHEN** the page is viewed with colours unavailable, such as forced colours or greyscale
- **THEN** each event's type and live state remain identifiable from text

### Requirement: Event-type legend and non-colour type cues
After mount, the system SHALL show a legend beside or above the grid that pairs each of
the five types with its existing `--color-event-*` swatch and a localized label. Each
event in the grid SHALL carry its type both visibly as text and in its accessible name.
No raw colour value SHALL be introduced, and no event-type colour SHALL alias an orange
state or CTA token. Type labels SHALL be exactly these (approved):

| type | en | tr |
| --- | --- | --- |
| talk | Talk | Söyleşi |
| screening | Screening | Gösterim |
| summit | Summit | Zirve |
| workshop | Workshop | Atölye |
| other | Other | Diğer |

#### Scenario: Legend in both locales
- **WHEN** the grid has mounted in either locale
- **THEN** the legend lists all five types with their localized labels, whether or not the visible month contains each type

### Requirement: Bilingual interface copy
The schedule's fixed interface strings SHALL be exactly the following in each locale.
`{month}` SHALL be the visible month and year formatted by `Intl.DateTimeFormat` with
`{ month: "long", year: "numeric", timeZone: "Europe/Istanbul" }` in the page locale,
for example "November 2026" or "Kasım 2026". The Turkish forms avoid case suffixes on the
interpolated month, so no vowel-harmony logic is needed.

| Purpose | en | tr |
| --- | --- | --- |
| Page heading | Schedule | Takvim |
| Timezone note | All times are shown in Istanbul time (GMT+3). | Tüm saatler İstanbul saatiyle (GMT+3) gösterilir. |
| No events at all | No events are scheduled yet. | Henüz planlanmış etkinlik yok. |
| Empty visible month | No events in {month}. | {month} ayında etkinlik yok. |
| Previous-month control (accessible name) | Previous month | Önceki ay |
| Next-month control (accessible name) | Next month | Sonraki ay |
| Today control (visible label and name) | Today | Bugün |
| Month-change live-region message | Showing {month} | {month} gösteriliyor |
| Grid caption | {month} | {month} |
| Live badge | Live now | Şimdi |

#### Scenario: Turkish month change announced
- **WHEN** a Turkish visitor moves from October to November 2026
- **THEN** the live region reads "Kasım 2026 gösteriliyor", and if November has no events the agenda reads "Kasım 2026 ayında etkinlik yok."

#### Scenario: English empty month
- **WHEN** an English visitor views a month with no events
- **THEN** the agenda reads "No events in November 2026." (for November 2026), and the timezone note remains visible

### Requirement: Keyboard and screen-reader access
The grid SHALL be exposed with table or grid semantics: a caption naming the visible
month and year, column headers giving full localized weekday names starting Monday, and
each day cell naming its full localized date and its event count. The grid SHALL be a
single Tab stop. Arrow keys SHALL move between days; Home and End SHALL move to the start
and end of the week; Page Up and Page Down SHALL move by month. Enter or Space on a day
that has events SHALL move focus to that day's first entry in the agenda. Focus SHALL
always be visible. The reading order SHALL be: heading, timezone note, controls, legend,
grid, agenda.

#### Scenario: Keyboard-only month walk
- **WHEN** a keyboard user tabs into the grid in either locale, presses an arrow key past the last day of the month, and then presses Enter on a day with events
- **THEN** the visible month advances with focus on the corresponding day, and Enter moves focus to that day's first agenda entry

#### Scenario: Screen reader day cell
- **WHEN** a screen reader reaches a day cell containing two events
- **THEN** it announces the full localized date and "2 events" / "2 etkinlik"

### Requirement: Responsive layout
The page SHALL have no horizontal page scroll from 320px upward in either locale. Below
the `md` breakpoint (48rem), grid cells SHALL show the day number and a count of events
by type, not titles, and the agenda SHALL carry the event detail. At `md` and above,
cells SHALL show event titles with their type label. Overflow SHALL be summarised as
"+N more" / "+N daha", localized. Turkish strings, which are longer, SHALL NOT be
truncated in controls or legend labels.

#### Scenario: Phone width
- **WHEN** a month with fifty events is shown at 320px in Turkish
- **THEN** the grid fits the viewport, every day remains reachable by keyboard, and all events are readable in the agenda

### Requirement: No motion
The schedule SHALL introduce no animation or transition beyond the existing L3 interface
primitives. Month changes, state changes and the move from baseline to grid SHALL be
instantaneous.

#### Scenario: Reduced motion
- **WHEN** a visitor with `prefers-reduced-motion: reduce` changes month in either locale
- **THEN** the new month appears immediately with no movement, just as without the preference

#### Scenario: Mobile fallback
- **WHEN** a visitor below `md` changes month in either locale
- **THEN** the compact grid and agenda update immediately with no motion, because there is no animated variant to fall back from

### Requirement: Schedule verification
A path-filtered Tier B check on pull requests to `main` SHALL:
- run unit tests for parsing, validation, Istanbul day placement, month matrices and
  state derivation;
- run controlled-clock browser tests in both locales, covering the neutral no-JS HTML,
  hydration, an old build opened in a later month, state changes as time passes,
  navigation, keyboard use and phone/desktop widths;
- run axe on the schedule fixture in both locales, before and after mount;
- run real production builds against a synthetic CMS, with zero and fifty events, that
  assert both routes are prerendered with no revalidation and that serving them makes no
  CMS request.

#### Scenario: Server-frozen month regression
- **WHEN** a change makes the visible month or any state depend on build time
- **THEN** the controlled-clock check fails

#### Scenario: Accessibility regression
- **WHEN** a change introduces an axe violation on the schedule in either locale
- **THEN** the check fails
