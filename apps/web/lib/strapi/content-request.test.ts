import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strapiRead } from './content-request.ts';

test('public path: published, force-cache, registry tag, never time-based', () => {
  const { status, init } = strapiRead('schedule-calendar');
  assert.equal(status, 'published');
  assert.deepEqual(init, { cache: 'force-cache', next: { tags: ['schedule-calendar'], revalidate: false } });
  assert.deepEqual(strapiRead('t', { token: 'pub' }).init.headers, { Authorization: 'Bearer pub' });
});

test('preview path: draft, no-store, preview token only', () => {
  const { status, init } = strapiRead('t', { preview: true, token: 'pub', previewToken: 'prev' });
  assert.equal(status, 'draft');
  assert.deepEqual(init, { cache: 'no-store', headers: { Authorization: 'Bearer prev' } });
});

test('preview without a preview token fails loudly and never echoes a token', () => {
  assert.throws(() => strapiRead('t', { preview: true, token: 'public-token-value' }), (e: Error) =>
    /STRAPI_PREVIEW_TOKEN is not set/.test(e.message) && !e.message.includes('public-token-value'));
});

test('a non-preview request never carries draft status or the preview token', () => {
  const { status, init } = strapiRead('t', { preview: false, previewToken: 'prev' });
  assert.equal(status, 'published');
  assert.ok(!JSON.stringify(init).includes('prev'));
});
