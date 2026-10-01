import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addMonths, daysOccupied, formatDay, formatMonth, formatTime, istanbulDayKey, monthMatrix,
  monthOf, overlapsMonth, weekdayIndex, weekdayNames,
} from './calendar.ts';

// The suite is run under TZ=UTC and TZ=America/New_York by the Tier B workflow;
// every expectation below must hold identically in both.
const at = (iso: string) => Date.parse(iso);

test(`device zone ${process.env.TZ ?? '(default)'}: 22:30Z belongs to the next Istanbul day`, () => {
  assert.equal(istanbulDayKey(at('2026-11-30T22:30:00Z')), '2026-12-01');
  assert.deepEqual(monthOf(at('2026-11-30T22:30:00Z')), { year: 2026, month: 12 });
  assert.equal(formatTime(at('2026-11-30T22:30:00Z'), 'en'), '01:30');
  assert.equal(formatTime(at('2026-11-30T22:30:00Z'), 'tr'), '01:30');
  assert.equal(istanbulDayKey(at('2026-11-30T20:59:59Z')), '2026-11-30');
});

test('multi-day event occupies every Istanbul day it overlaps', () => {
  const start = at('2026-11-06T10:00:00+03:00');
  const end = at('2026-11-08T18:00:00+03:00');
  assert.deepEqual(daysOccupied(start, end), ['2026-11-06', '2026-11-07', '2026-11-08']);
});

test('month-spanning event appears in both months', () => {
  const days = daysOccupied(at('2026-11-30T20:00:00+03:00'), at('2026-12-01T02:00:00+03:00'));
  assert.deepEqual(days, ['2026-11-30', '2026-12-01']);
  assert.ok(overlapsMonth(days, { year: 2026, month: 11 }));
  assert.ok(overlapsMonth(days, { year: 2026, month: 12 }));
  assert.ok(!overlapsMonth(days, { year: 2027, month: 1 }));
});

test('an end exactly at Istanbul midnight does not spill into the next day', () => {
  assert.deepEqual(daysOccupied(at('2026-11-07T20:00:00+03:00'), at('2026-11-08T00:00:00+03:00')), ['2026-11-07']);
});

test('no end, or an equal start and end, is an instant on its start day', () => {
  const start = at('2026-11-07T10:00:00Z');
  assert.deepEqual(daysOccupied(start, null), ['2026-11-07']);
  assert.deepEqual(daysOccupied(start, start), ['2026-11-07']);
});

test('December rolls into January and back', () => {
  assert.deepEqual(addMonths({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
  assert.deepEqual(addMonths({ year: 2027, month: 1 }, -1), { year: 2026, month: 12 });
  assert.deepEqual(addMonths({ year: 2026, month: 3 }, -15), { year: 2024, month: 12 });
});

test('month matrix is Monday-first, whole weeks, with leap February', () => {
  const feb = monthMatrix({ year: 2028, month: 2 });
  const inMonth = feb.flat().filter((cell) => cell.inMonth);
  assert.equal(inMonth.length, 29);
  assert.equal(inMonth.at(-1)!.key, '2028-02-29');
  for (const week of feb) {
    assert.equal(week.length, 7);
    assert.equal(weekdayIndex(week[0].key), 0);
  }
  assert.equal(monthMatrix({ year: 2027, month: 2 }).flat().filter((c) => c.inMonth).length, 28);
  // November 2026 starts on a Sunday: six leading cells from October.
  const nov = monthMatrix({ year: 2026, month: 11 });
  assert.equal(nov[0][0].key, '2026-10-26');
  assert.equal(nov[0][6].key, '2026-11-01');
  assert.equal(nov[0][6].inMonth, true);
});

test('locale formatting of months, days and weekdays', () => {
  assert.equal(formatMonth({ year: 2026, month: 11 }, 'en'), 'November 2026');
  assert.equal(formatMonth({ year: 2026, month: 11 }, 'tr'), 'Kasım 2026');
  assert.equal(formatDay('2026-11-07', 'en'), 'Saturday, November 7, 2026');
  assert.equal(formatDay('2026-11-07', 'tr'), '7 Kasım 2026 Cumartesi');
  assert.equal(weekdayNames('en')[0], 'Monday');
  assert.equal(weekdayNames('tr')[6], 'Pazar');
});

test('placement over 0, 1 and 50 events', () => {
  for (const count of [0, 1, 50]) {
    const days = Array.from({ length: count }, (_, i) => daysOccupied(at('2026-11-01T09:00:00Z') + i * 86_400_000, null)).flat();
    assert.equal(days.length, count);
    assert.equal(days.filter((day) => day.startsWith('2026-11')).length, Math.min(count, 30));
  }
});
