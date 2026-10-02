import assert from 'node:assert/strict';
import { test } from 'node:test';
import { secretMatches } from './secrets.ts';

test('constant-time secret comparison fails closed', () => {
  assert.equal(secretMatches('abc', 'abc'), true);
  assert.equal(secretMatches('abd', 'abc'), false);
  assert.equal(secretMatches('abc', 'abcd'), false);
  for (const configured of [undefined, null, '']) assert.equal(secretMatches('', configured), false);
  assert.equal(secretMatches(null, 'abc'), false);
  assert.equal(secretMatches(undefined, 'abc'), false);
});
