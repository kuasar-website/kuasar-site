import assert from 'node:assert/strict';
import { test } from 'node:test';
import { istanbulDayKey, summitDayState } from './time.ts';

// Run under TZ=UTC and TZ=America/New_York by the Tier B workflow; results must match.
const at = (iso: string) => Date.parse(iso);
const summit = '2026-11-07T07:00:00.000Z'; // 10:00 on 7 November in Istanbul

test(`device zone ${process.env.TZ ?? '(default)'}: Istanbul calendar-day state`, () => {
  assert.equal(summitDayState(summit, at('2026-11-06T20:59:59Z')), 'upcoming', '23:59:59 on 6 November in Istanbul');
  assert.equal(summitDayState(summit, at('2026-11-06T21:00:00Z')), 'live', '00:00 on 7 November in Istanbul');
  assert.equal(summitDayState(summit, at('2026-11-07T06:59:59Z')), 'live', 'before the start time is still the Summit day');
  assert.equal(summitDayState(summit, at('2026-11-07T20:59:59Z')), 'live', '23:59:59 on 7 November in Istanbul');
  assert.equal(summitDayState(summit, at('2026-11-07T21:00:00Z')), null, 'next Istanbul midnight: no badge');
  assert.equal(summitDayState(summit, at('2027-01-01T00:00:00Z')), null);
  assert.equal(summitDayState(summit, at('2026-08-01T00:00:00Z')), 'upcoming');
});

test('a Summit late in the Istanbul day whose UTC date differs', () => {
  // 01:30 on 8 November in Istanbul is still 7 November in UTC.
  const late = '2026-11-07T22:30:00Z';
  assert.equal(istanbulDayKey(at(late)), '2026-11-08');
  assert.equal(summitDayState(late, at('2026-11-07T12:00:00Z')), 'upcoming');
  assert.equal(summitDayState(late, at('2026-11-07T21:00:00Z')), 'live');
  assert.equal(summitDayState(late, at('2026-11-08T21:00:00Z')), null);
});

test('null now, missing date and invalid date make no claim', () => {
  assert.equal(summitDayState(summit, null), null);
  assert.equal(summitDayState(null, at('2026-11-07T10:00:00Z')), null);
  assert.equal(summitDayState(undefined, at('2026-11-07T10:00:00Z')), null);
  assert.equal(summitDayState('2026-11-07T10:00:00', at('2026-11-07T10:00:00Z')), null);
  assert.equal(summitDayState('not a date', at('2026-11-07T10:00:00Z')), null);
  assert.equal(summitDayState(summit, Number.NaN), null);
});
