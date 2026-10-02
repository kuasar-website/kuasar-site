import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchScheduleData, SCHEDULE_CACHE_TAG } from './data.ts';

type Row = Record<string, unknown>;
function row(locale = 'en', id = 'one', extra: Row = {}): Row {
  return { documentId: id, locale, publishedAt: '2026-01-01T00:00:00.000Z', title: `${locale} title ${id}`,
    type: 'talk', startsAt: '2026-11-07T07:00:00.000Z', endsAt: null, location: null, description: null, url: null, ...extra };
}
function mock(data: (locale: string, page: number) => Row[], pages = 1, seen: string[] = []) {
  return (async (input, init) => {
    const url = new URL(String(input));
    seen.push(url.pathname + '?' + url.searchParams.get('locale'));
    assert.equal(url.pathname, '/api/schedule-events');
    assert.equal(url.searchParams.get('status'), 'published');
    assert.equal(init?.cache, 'force-cache');
    assert.deepEqual((init as RequestInit & { next: object }).next, { tags: [SCHEDULE_CACHE_TAG], revalidate: false });
    const page = Number(url.searchParams.get('pagination[page]'));
    return Response.json({ data: data(url.searchParams.get('locale')!, page), meta: { pagination: { page, pageCount: pages } } });
  }) as typeof fetch;
}
const options = (fetcher: typeof fetch) => ({ origin: 'https://cms.example', fetcher });
const one = (extra: Row) => options(mock((lang) => [row(lang, 'doc-1', extra)]));

for (const locale of ['en', 'tr'] as const) {
  test(`${locale}: zero, one and fifty published events`, async () => {
    assert.deepEqual(await fetchScheduleData(locale, options(mock(() => [], 0))), []);
    assert.equal((await fetchScheduleData(locale, options(mock((lang) => [row(lang)])))).length, 1);
    const fifty = await fetchScheduleData(locale, options(mock((lang, page) => Array.from({ length: 25 }, (_, i) => row(lang, `${page}-${i}`)), 2)));
    assert.equal(fifty.length, 50);
    assert.equal(new Set(fifty.map((e) => e.id)).size, 50);
  });

  test(`${locale}: drafts are skipped even if a proxy returns them`, async () => {
    const result = await fetchScheduleData(locale, options(mock((lang) => [row(lang, 'live'), row(lang, 'draft', { publishedAt: null })])));
    assert.deepEqual(result.map((e) => e.id), ['live']);
  });

  test(`${locale}: duplicate across pages and wrong locale fail`, async () => {
    await assert.rejects(fetchScheduleData(locale, options(mock((lang) => [row(lang, 'same')], 2))), /duplicate document same/);
    await assert.rejects(fetchScheduleData(locale, options(mock(() => [row('de')]))), /unexpected locale/);
  });

  test(`${locale}: an invalid interval fails loudly, naming the document and both fields`, async () => {
    await assert.rejects(fetchScheduleData(locale, one({ startsAt: '2026-11-07T10:00:00Z', endsAt: '2026-11-07T09:00:00Z' })),
      (error: Error) => /doc-1/.test(error.message) && /"endsAt"\/"startsAt"/.test(error.message)
        && /Strapi/.test(error.message) && /docs\/ops\/cms-runbook\.md/.test(error.message));
  });

  test(`${locale}: an equal start and end is accepted as an instant`, async () => {
    const [event] = await fetchScheduleData(locale, one({ startsAt: '2026-11-07T10:00:00Z', endsAt: '2026-11-07T10:00:00Z' }));
    assert.equal(event.endsAt, '2026-11-07T10:00:00Z');
  });

  for (const [field, value, pattern] of [
    ['startsAt', null, /doc-1 .* field "startsAt": required text is missing/],
    ['startsAt', '2026-11-07T10:00:00', /field "startsAt": expected an ISO datetime/],
    ['startsAt', '2026-02-30T10:00:00Z', /field "startsAt": expected an ISO datetime/],
    ['endsAt', 'tomorrow', /field "endsAt": expected an ISO datetime/],
    ['type', 'party', /field "type": unknown type "party"/],
    ['type', undefined, /field "type": unknown type/],
    ['title', '  ', /field "title": required text is empty/],
    ['url', 'ftp://example.org', /field "url": expected an HTTP\(S\) URL/],
    ['url', 'https://user:pw@example.org', /field "url": expected an HTTP\(S\) URL without credentials/],
  ] as const) {
    test(`${locale}: ${field}=${String(value)} fails with documentId and field`, async () => {
      await assert.rejects(fetchScheduleData(locale, one({ [field]: value })), pattern);
    });
  }

  test(`${locale}: unreachable Strapi and HTTP errors name Strapi and the runbook`, async () => {
    const down = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    await assert.rejects(fetchScheduleData(locale, options(down)), /Strapi unreachable\. See docs\/ops\/cms-runbook\.md/);
    const denied = (async () => new Response('no', { status: 401 })) as typeof fetch;
    await assert.rejects(fetchScheduleData(locale, options(denied)), /Strapi HTTP 401/);
  });
}

test('chronological, stable order with optional fields trimmed', async () => {
  const result = await fetchScheduleData('en', options(mock(() => [
    row('en', 'a', { startsAt: '2026-12-01T10:00:00Z' }),
    row('en', 'b', { startsAt: '2026-11-01T10:00:00Z', location: '  ', description: ' Talk  ', url: 'https://example.org/x' }),
    row('en', 'c', { startsAt: '2026-11-01T10:00:00Z' }),
  ])));
  assert.deepEqual(result.map((e) => e.id), ['b', 'c', 'a']);
  assert.equal(result[0].location, null);
  assert.equal(result[0].description, 'Talk');
  assert.equal(result[0].url, 'https://example.org/x');
});

test('Turkish overrides English by documentId; English-only falls back with its locale', async () => {
  const seen: string[] = [];
  const fetcher = mock((lang) => lang === 'tr' ? [row('tr', 'both'), row('tr', 'tr-only')] : [row('en', 'both'), row('en', 'en-only')], 1, seen);
  const tr = await fetchScheduleData('tr', options(fetcher));
  assert.deepEqual(Object.fromEntries(tr.map((e) => [e.id, e.contentLocale])), { both: 'tr', 'en-only': 'en', 'tr-only': 'tr' });
  assert.equal(tr.find((e) => e.id === 'both')!.title, 'tr title both');
  const en = await fetchScheduleData('en', options(fetcher));
  assert.deepEqual(en.map((e) => e.id).sort(), ['both', 'en-only'], 'English route excludes Turkish-only documents');
  assert.ok(seen.every((entry) => entry.startsWith('/api/schedule-events')));
});
