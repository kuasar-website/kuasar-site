# Shared time state

DEV 5 primitive for Schedule, Timeline, Galactic Summit and Missions; see ADR 0001 §3.
No consumer routes or CMS fields are added by this change.

```tsx
import { DateTime } from "@/components/time/date-time";

<DateTime startsAt="2026-11-07T10:00:00+03:00"
  endsAt="2026-11-07T12:00:00+03:00" locale="tr" timeZone="Europe/Istanbul" />
// Use locale="en" for English. Keep dates as the same raw facts in both locales.
```

The HTML contains the raw `datetime` and a neutral localized date. After mount,
`data-time-state` and the design state color appear. No animation or status text is
introduced. With JavaScript disabled the neutral date remains useful permanently.
Missing starts render nothing; malformed strings render verbatim without a datetime
attribute or status. Invalid end dates also suppress status.

In a client component use `useTimeState({ startsAt, endsAt })` for custom presentation,
or `useTimeCollection(records, { state: "upcoming", sort: "ascending" })` for a view.
The hooks live in `./use-time`. Records retain their extra fields. Pass the **full**
dataset, not a server-filtered subset. The collection preserves source order and all
records before mount, then filters and stably sorts a copy. Omit state for all records;
omit sort for source order. Invalid start dates sort last in either direction.

`null` means neutral, never past. Render no state attributes or styles for null.
Do not call `Date.now()` in a server component or use a clock default in a helper.
The shared clock starts on subscription, updates every second and on focus/visibility,
and stops when the final subscriber unmounts.

## Date contract

- ISO datetimes require `Z` or an offset. Impossible dates and ambiguous local times
  are rejected. Starts are inclusive and ends exclusive.
- A datetime without an end becomes past at its start; no duration is invented.
- A `YYYY-MM-DD` date without an end spans that UTC calendar day.
- Display timezone defaults to UTC for deterministic server/client output. Date-only
  labels always preserve their calendar date; timed records may request an IANA zone.
- A reversed or malformed interval stays neutral. Equal start/end is an instant.
- Browser time is authoritative; no cron, fetch or revalidation occurs as dates pass.

## Verification

Run `npm run test:time` from the repo root after `npm ci`, `npm ci --prefix tests/time`
and `npm exec --prefix tests/time -- playwright install chromium firefox`.
Test tools have their own lockfile and do not change production dependencies.
Tests build a static React fixture once,
then hydrate it under controlled browser clocks in both locales. Test pages stay
outside the Next app and are never deployed. Tier B time-state runs this on relevant
PRs to main. It does not replace future consumer route, Lighthouse or axe checks.
Existing routes import none of this code, so their first-load bundle is unchanged.
