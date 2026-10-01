import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchEventsData, EVENTS_CACHE_TAG } from './data.ts';

const photo = { image: { url: 'https://media.kuasar.org/test.jpg', width: 800, height: 600 }, altEn: 'Screening audience', altTr: 'Gösterimdeki izleyiciler' };
function row(locale = 'en', id = 'one') { return { documentId: id, locale, publishedAt: '2026-01-01T00:00:00Z', title: `${locale} title`, speakerName: 'Çağrı', eventNumber: 1, date: '2026-01-01T10:00:00Z', photos: [photo], speakerPortrait: photo }; }
function mock(data: (collection: string, locale: string, page: number) => object[], pages = 1) {
  return (async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('status'), 'published');
    assert.equal(init?.cache, 'force-cache');
    assert.deepEqual((init as RequestInit & { next: object }).next, { tags: [EVENTS_CACHE_TAG], revalidate: false });
    assert.ok(!url.search.includes('hoverVideo'));
    const page = Number(url.searchParams.get('pagination[page]'));
    return Response.json({ data: data(url.pathname, url.searchParams.get('locale')!, page), meta: { pagination: { page, pageCount: pages } } });
  }) as typeof fetch;
}
const options = (fetcher: typeof fetch) => ({ origin: 'https://cms.example', fetcher });
for (const locale of ['en', 'tr'] as const) {
  test(`${locale}: zero published entries`, async () => {
    assert.deepEqual(await fetchEventsData(locale, options(mock(() => [], 0))), { talks: [], nights: [] });
  });
  test(`${locale}: fifty entries across pages with locale media alt`, async () => {
    const result = await fetchEventsData(locale, options(mock((_, lang, page) => Array.from({ length: 25 }, (_, i) => row(lang, `${page}-${i}`)), 2)));
    assert.equal(result.talks.length, 50); assert.equal(result.nights.length, 50);
    assert.equal(result.talks[0].speakerPortrait?.alt, locale === 'tr' ? photo.altTr : photo.altEn);
  });
}
test('Turkish publication wins per document; missing translation falls back silently', async () => {
  const result = await fetchEventsData('tr', options(mock((_, locale) => locale === 'en' ? [row('en', 'one'), row('en', 'two')] : [row('tr', 'one')])));
  assert.deepEqual(result.talks.map(x => [x.id, x.title, x.contentLocale]), [['one','tr title','tr'],['two','en title','en']]);
  assert.equal(result.talks[1].speakerPortrait?.alt, photo.altTr);
});
test('accidental drafts never render and cannot override English fallback', async () => {
  const result = await fetchEventsData('tr', options(mock((_, locale) => [{ ...row(locale), publishedAt: locale === 'tr' ? null : '2026-01-01' }])));
  assert.equal(result.talks[0].contentLocale, 'en');
});
test('optional portrait/links/date remain absent', async () => {
  const result = await fetchEventsData('en', options(mock(() => [{ ...row(), speakerPortrait: null, date: null }])));
  assert.equal(result.talks[0].speakerPortrait, null); assert.equal(result.talks[0].watchUrl, null); assert.equal(result.talks[0].date, null);
});
for (const [name, patch, error] of [
  ['invalid link', { watchUrl: 'javascript:alert(1)' }, /HTTP\(S\)/],
  ['invalid date', { date: '2026-02-31' }, /invalid ISO date/],
  ['missing photos', { photos: [] }, /requires photos/],
  ['missing localized alt', { photos: [{ ...photo, altTr: '' }] }, /altTr/],
  ['raw storage host', { speakerPortrait: { ...photo, image: { ...photo.image, url: 'https://raw.r2.dev/test.jpg' } } }, /media.kuasar.org/],
] as const) test(name, async () => {
  await assert.rejects(fetchEventsData('tr', options(mock((_, locale) => [{ ...row(locale), ...patch }]))), error);
});
test('HTTP and connection errors fail explicitly without leaking response/token', async () => {
  await assert.rejects(fetchEventsData('en', options(async () => new Response('private body', { status: 403 }))), /Strapi HTTP 403/);
  await assert.rejects(fetchEventsData('en', options(async () => { throw new Error('private token'); })), /Strapi unreachable/);
});
test('duplicate pagination fails instead of truncating or duplicating events', async () => {
  await assert.rejects(fetchEventsData('en', options(mock(() => [row()], 2))), /duplicate document/);
});
