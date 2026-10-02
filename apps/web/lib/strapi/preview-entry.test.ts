import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exitLocale, resolvePreview } from './preview-entry.ts';

const SECRET = 'test-preview-secret';
const DOC = 'e67qint75hcv221sdx6a12ks';
const url = (params: Record<string, string>) => {
  const u = new URL('https://site.example/api/preview');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u;
};
const valid = { secret: SECRET, uid: 'api::schedule-event.schedule-event', documentId: DOC, locale: 'en', status: 'draft' };
function deps() {
  const calls: string[] = [];
  return { calls, deps: { secret: SECRET, enable: () => { calls.push('enable'); }, disable: () => { calls.push('disable'); } } };
}

test('unauthenticated or unset secret → 401, Draft Mode untouched', async () => {
  for (const [params, secret] of [[{ ...valid, secret: '' }, SECRET], [{ ...valid, secret: 'wrong' }, SECRET], [valid, undefined]] as const) {
    const d = deps();
    assert.deepEqual(await resolvePreview(url(params), { ...d.deps, secret }), { status: 401, error: 'Unauthorized' });
    assert.deepEqual(d.calls, []);
  }
});

test('invalid fields → 400, Draft Mode untouched', async () => {
  for (const params of [
    { ...valid, locale: 'de' }, { ...valid, documentId: '../../etc' }, { ...valid, documentId: 'A'.repeat(24) },
    { ...valid, status: 'archived' }, { ...valid, uid: 'api::sponsor.sponsor' }, { ...valid, uid: 'api::announcement.announcement' },
    { ...valid, uid: 'https://evil.example' },
  ]) {
    const d = deps();
    const result = await resolvePreview(url(params), d.deps);
    assert.equal(result.status, 400, JSON.stringify(params));
    assert.deepEqual(d.calls, []);
  }
});

test('draft enables, published disables; target derived per locale', async () => {
  let d = deps();
  assert.deepEqual(await resolvePreview(url(valid), d.deps), { status: 307, location: '/en/schedule' });
  assert.deepEqual(d.calls, ['enable']);
  d = deps();
  assert.deepEqual(await resolvePreview(url({ ...valid, locale: 'tr', status: 'published', uid: 'api::stellar-talk.stellar-talk' }), d.deps), { status: 307, location: '/tr/etkinlikler' });
  assert.deepEqual(d.calls, ['disable']);
});

test('open-redirect attempts have no effect on the target', async () => {
  for (const extra of [
    { url: 'https://evil.example/' }, { path: '//evil.example' }, { redirect: 'https://evil.example' },
    { slug: '../../admin' }, { url: '%2F%2Fevil.example' }, { returnTo: 'javascript:alert(1)' },
  ] as Record<string, string>[]) {
    const d = deps();
    assert.deepEqual(await resolvePreview(url({ ...valid, ...extra }), d.deps), { status: 307, location: '/en/schedule' });
  }
});

test('exit locale defaults safely', () => {
  assert.equal(exitLocale(new URL('https://s.example/api/preview/exit?locale=tr')), 'tr');
  assert.equal(exitLocale(new URL('https://s.example/api/preview/exit?locale=https://evil')), 'en');
  assert.equal(exitLocale(new URL('https://s.example/api/preview/exit')), 'en');
});
