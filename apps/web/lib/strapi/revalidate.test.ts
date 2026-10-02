import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleRevalidate } from './revalidate.ts';

const SECRET = 'test-revalidate-secret';
function setup() {
  const tags: [string, string][] = [];
  return { tags, deps: { secret: SECRET, revalidateTag: (t: string, p: 'max') => { tags.push([t, p]); } } };
}
const post = (body: unknown, headers: Record<string, string> = { Authorization: `Bearer ${SECRET}` }, url = 'https://site.example/api/revalidate') =>
  new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('rejects unauthenticated, wrong, query-only and unset secrets; nothing revalidated', async () => {
  for (const [request, secret] of [
    [post({ event: 'entry.publish', uid: 'api::schedule-event.schedule-event' }, {}), SECRET],
    [post({ event: 'entry.publish', uid: 'api::schedule-event.schedule-event' }, { Authorization: 'Bearer wrong' }), SECRET],
    [post({ event: 'entry.publish', uid: 'api::schedule-event.schedule-event' }, {}, `https://site.example/api/revalidate?secret=${SECRET}`), SECRET],
    [post({ event: 'entry.publish', uid: 'api::schedule-event.schedule-event' }, { Authorization: SECRET }), SECRET],
    [post({ event: 'entry.publish', uid: 'api::schedule-event.schedule-event' }), undefined],
  ] as const) {
    const s = setup();
    const response = await handleRevalidate(request, { ...s.deps, secret });
    assert.equal(response.status, 401);
    assert.ok(!(await response.text()).includes(SECRET));
    assert.deepEqual(s.tags, []);
  }
});

test('non-POST → 405; malformed body → 400', async () => {
  const s = setup();
  assert.equal((await handleRevalidate(new Request('https://site.example/api/revalidate'), s.deps)).status, 405);
  assert.equal((await handleRevalidate(post('{not json'), s.deps)).status, 400);
  assert.equal((await handleRevalidate(post([1, 2]), s.deps)).status, 400);
  assert.equal((await handleRevalidate(post({ uid: 'x' }), s.deps)).status, 400);
  assert.equal((await handleRevalidate(post({ event: 'entry.publish' }), s.deps)).status, 400);
  assert.deepEqual(s.tags, []);
});

for (const event of ['entry.publish', 'entry.unpublish', 'entry.update', 'entry.delete', 'entry.create']) {
  test(`${event} → registry tag with the 'max' profile only`, async () => {
    const s = setup();
    const response = await handleRevalidate(post({ event, model: 'schedule-event', uid: 'api::schedule-event.schedule-event' }), s.deps);
    assert.equal(response.status, 200);
    assert.deepEqual(s.tags, [['schedule-calendar', 'max']]);
    assert.deepEqual(await response.json(), { revalidated: { tags: ['schedule-calendar'] } });
  });
}

test('events, Dev 3 reserved types and the model fallback', async () => {
  for (const [body, tag] of [
    [{ event: 'entry.update', uid: 'api::stellar-talk.stellar-talk' }, 'events-showcase'],
    [{ event: 'entry.unpublish', uid: 'api::nebula-night.nebula-night' }, 'events-showcase'],
    [{ event: 'entry.unpublish', uid: 'api::announcement.announcement' }, 'announcements'],
    [{ event: 'entry.delete', uid: 'api::alumnus.alumnus' }, 'alumni-directory'],
    [{ event: 'entry.publish', model: 'galactic-summit' }, 'galactic-summit'],
  ] as const) {
    const s = setup();
    assert.equal((await handleRevalidate(post(body), s.deps)).status, 200);
    assert.deepEqual(s.tags, [[tag, 'max']]);
  }
});

test('media changes revalidate every registered tag and path', async () => {
  const s = setup();
  assert.equal((await handleRevalidate(post({ event: 'media.update', media: {} }), s.deps)).status, 200);
  assert.deepEqual(s.tags.map(([t]) => t).sort(), ['alumni-directory', 'announcements', 'events-showcase', 'galactic-summit', 'schedule-calendar']);
  assert.ok(s.tags.every(([, p]) => p === 'max'));
});

test('sponsor, unknown models and unrelated events are accepted no-ops', async () => {
  for (const body of [{ event: 'entry.publish', uid: 'api::sponsor.sponsor' }, { event: 'entry.publish', uid: 'api::unknown.unknown' }, { event: 'media.create' }, { event: 'review-workflows.updateEntryStage' }]) {
    const s = setup();
    const response = await handleRevalidate(post(body), s.deps);
    assert.equal(response.status, 200);
    assert.deepEqual(s.tags, []);
  }
});

test('the handler module never calls revalidatePath (unsafe on fallback-false localized routes)', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const file of ['./revalidate.ts', '../../app/api/revalidate/route.ts']) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''), /revalidatePath\s*\(/, file);
  }
});
