import assert from 'node:assert/strict';
import { test } from 'node:test';
import { previewOrigins, previewUrl } from './preview-url.ts';

const base = { uid: 'api::schedule-event.schedule-event', documentId: 'e67qint75hcv221sdx6a12ks', clientUrl: 'https://site.example', secret: 'test-preview-secret' };

test('builds the frontend preview URL from uid, documentId, locale and status only', () => {
  const url = new URL(previewUrl({ ...base, locale: 'tr', status: 'published' })!);
  assert.equal(url.origin + url.pathname, 'https://site.example/api/preview');
  assert.deepEqual(Object.fromEntries(url.searchParams), { secret: 'test-preview-secret', uid: base.uid, documentId: base.documentId, locale: 'tr', status: 'published' });
  const fallback = new URL(previewUrl({ ...base, locale: null, status: null })!);
  assert.equal(fallback.searchParams.get('locale'), 'en');
  assert.equal(fallback.searchParams.get('status'), 'draft');
});

test('no preview for sponsor, Dev 3 types until their routes exist, or when unconfigured', () => {
  for (const uid of ['api::sponsor.sponsor', 'api::announcement.announcement', 'api::alumnus.alumnus']) assert.equal(previewUrl({ ...base, uid }), null);
  assert.equal(previewUrl({ ...base, clientUrl: undefined }), null);
  assert.equal(previewUrl({ ...base, secret: undefined }), null);
  assert.equal(previewUrl({ ...base, clientUrl: 'not a url' }), null);
});

test('allowed origins are the frontend origin only', () => {
  assert.deepEqual(previewOrigins('https://site.example/some/path'), ['https://site.example']);
  assert.deepEqual(previewOrigins(undefined), []);
  assert.deepEqual(previewOrigins('nope'), []);
});
