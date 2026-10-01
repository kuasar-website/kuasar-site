import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchSummitData, SUMMIT_CACHE_TAG } from './data.ts';

type Row = Record<string, unknown>;
const img = (alt: string) => ({ image: { url: 'https://media.kuasar.org/summit.jpg', width: 1600, height: 900 }, altEn: `${alt} en`, altTr: `${alt} tr` });
const pdf = { url: 'https://media.kuasar.org/sponsorship-2026.pdf', mime: 'application/pdf', ext: '.pdf' };
function row(locale = 'en', id = 's2026', extra: Row = {}): Row {
  return { documentId: id, locale, publishedAt: '2026-01-01T00:00:00.000Z', year: 2026, date: '2026-11-07T07:00:00.000Z',
    location: 'SGKM', isCurrent: true, purpose: `${locale} purpose`, contactAddress: null,
    programme: [{ time: '10:00', title: `${locale} Opening`, description: null }],
    speakers: [{ speakerName: 'Çağrı Öztürk', role: 'Engineer', portrait: img('portrait') }],
    photos: [img('photo')], sponsorshipPdf: pdf, registrationUrl: null,
    accentToken: 'aurora', heroTreatment: 'wash', backgroundImage: img('hero'),
    // Present in the CMS; the loader must never ask for it nor read it.
    sponsors: [{ name: 'Sponsor Co' }], ...extra };
}
function mock(data: (locale: string, page: number) => Row[], pages = 1, urls: URL[] = []) {
  return (async (input, init) => {
    const url = new URL(String(input));
    urls.push(url);
    assert.equal(url.pathname, '/api/galactic-summits');
    assert.equal(url.searchParams.get('status'), 'published');
    assert.equal(init?.cache, 'force-cache');
    assert.deepEqual((init as RequestInit & { next: object }).next, { tags: [SUMMIT_CACHE_TAG], revalidate: false });
    const page = Number(url.searchParams.get('pagination[page]'));
    return Response.json({ data: data(url.searchParams.get('locale')!, page), meta: { pagination: { page, pageCount: pages } } });
  }) as typeof fetch;
}
const options = (fetcher: typeof fetch) => ({ origin: 'https://cms.example', fetcher });
const one = (extra: Row) => options(mock((lang) => [row(lang, 's2026', extra)]));
const editions = (lang: string, currents: number[]) => [2023, 2024, 2025, 2026].map((year) =>
  row(lang, `s${year}`, { year, isCurrent: currents.includes(year), heroTreatment: 'gradient', backgroundImage: null }));

for (const locale of ['en', 'tr'] as const) {
  test(`${locale}: zero editions is valid and has no current edition`, async () => {
    assert.deepEqual(await fetchSummitData(locale, options(mock(() => [], 0))), { current: null, others: [] });
  });

  test(`${locale}: one current edition, no archive`, async () => {
    const data = await fetchSummitData(locale, one({}));
    assert.equal(data.current!.year, 2026);
    assert.deepEqual(data.others, []);
    assert.equal(data.current!.sponsorshipPdf, pdf.url);
    assert.equal(data.current!.backgroundImage!.alt, `hero ${locale}`, 'alt text follows the page locale');
    assert.equal(data.current!.speakers[0].portrait!.alt, `portrait ${locale}`);
    assert.ok(!('sponsors' in data.current!), 'sponsors are never read');
  });

  test(`${locale}: many editions, archive newest first`, async () => {
    const data = await fetchSummitData(locale, options(mock((lang) => editions(lang, [2025]))));
    assert.equal(data.current!.year, 2025);
    assert.deepEqual(data.others.map((e) => e.year), [2026, 2024, 2023]);
  });

  test(`${locale}: no current edition fails loudly, naming every year`, async () => {
    await assert.rejects(fetchSummitData(locale, options(mock((lang) => editions(lang, [])))),
      (e: Error) => /no published edition is current/.test(e.message) && /2023 \(s2023\).*2026 \(s2026\)/.test(e.message) && /cms-runbook/.test(e.message));
  });

  test(`${locale}: two current editions fail loudly, naming both`, async () => {
    await assert.rejects(fetchSummitData(locale, options(mock((lang) => editions(lang, [2024, 2026])))),
      (e: Error) => /more than one edition is current: 2024 \(s2024\), 2026 \(s2026\)/.test(e.message));
  });

  test(`${locale}: duplicate year fails`, async () => {
    await assert.rejects(fetchSummitData(locale, options(mock((lang) => [row(lang, 'a'), row(lang, 'b', { isCurrent: false })]))), /year 2026 is also used by a/);
  });

  test(`${locale}: drafts skipped, pagination followed, wrong locale fails`, async () => {
    const data = await fetchSummitData(locale, options(mock((lang, page) => page === 1
      ? [row(lang, 'draft', { publishedAt: null, year: 2020 }), row(lang, 's2026')] : [row(lang, 's2025', { year: 2025, isCurrent: false })], 2)));
    assert.deepEqual([data.current!.year, ...data.others.map((e) => e.year)], [2026, 2025]);
    await assert.rejects(fetchSummitData(locale, options(mock(() => [row('de')]))), /unexpected locale/);
  });

  test(`${locale}: still or wash without a background image fails for the current edition only`, async () => {
    for (const heroTreatment of ['still', 'wash']) {
      await assert.rejects(fetchSummitData(locale, one({ heroTreatment, backgroundImage: null })),
        new RegExp(`fields "heroTreatment"/"backgroundImage": heroTreatment "${heroTreatment}" needs a backgroundImage`));
    }
    const ok = await fetchSummitData(locale, options(mock((lang) => [row(lang), row(lang, 'old', { year: 2025, isCurrent: false, heroTreatment: 'still', backgroundImage: null })])));
    assert.equal(ok.others[0].heroTreatment, 'still');
    assert.equal((await fetchSummitData(locale, one({ heroTreatment: 'gradient', backgroundImage: null }))).current!.backgroundImage, null);
  });

  for (const [field, value, pattern] of [
    ['year', '2026', /field "year": expected an integer year/],
    ['isCurrent', null, /field "isCurrent": expected true or false/],
    ['date', '2026-11-07T10:00:00', /field "date": expected an ISO datetime/],
    ['accentToken', 'gold', /field "accentToken": unknown value "gold"/],
    ['heroTreatment', 'video', /field "heroTreatment": unknown value "video"/],
    ['registrationUrl', 'ftp://example.org', /field "registrationUrl": expected an HTTP\(S\) URL/],
    ['registrationUrl', 'https://u:p@forms.gle/x', /field "registrationUrl": expected an HTTP\(S\) URL without credentials/],
    ['speakers', [{ speakerName: '' }], /field "speakers\[0\]\.speakerName": required text is missing/],
    ['programme', [{ time: ' ', title: null }], /field "programme\[0\]": item has no time, title or description/],
    ['photos', [{ image: { url: 'https://kuasar.r2.dev/x.jpg', width: 1, height: 1 }, altEn: 'a', altTr: 'b' }], /\[media\] galactic-summits "s2026", field photos\[0\]: .*not on https:\/\/media\.kuasar\.org/],
    ['backgroundImage', { image: { url: 'https://media.kuasar.org/x.jpg', width: 1, height: 1 }, altEn: '', altTr: '' }, /alt text is empty/],
  ] as const) {
    test(`${locale}: ${field}=${JSON.stringify(value)} fails, naming the document and field`, async () => {
      await assert.rejects(fetchSummitData(locale, one({ [field]: value })), pattern);
    });
  }

  for (const [label, file] of [
    ['the CMS host', { ...pdf, url: 'https://cms.kuasar.org/uploads/s.pdf' }],
    ['r2.dev', { ...pdf, url: 'https://pub-123.r2.dev/s.pdf' }],
    ['the R2 S3 endpoint', { ...pdf, url: 'https://acc.r2.cloudflarestorage.com/kuasar-media/s.pdf' }],
    ['http', { ...pdf, url: 'http://media.kuasar.org/s.pdf' }],
    ['credentials', { ...pdf, url: 'https://u:p@media.kuasar.org/s.pdf' }],
    ['a relative path', { ...pdf, url: '/uploads/s.pdf' }],
    ['a non-PDF path', { ...pdf, url: 'https://media.kuasar.org/s.png' }],
    ['a non-PDF MIME type', { ...pdf, mime: 'image/png' }],
    ['the image resizer', { ...pdf, url: 'https://media.kuasar.org/cdn-cgi/image/width=640/s.png' }],
  ] as const) {
    test(`${locale}: sponsorship PDF on ${label} fails`, async () => {
      await assert.rejects(fetchSummitData(locale, one({ sponsorshipPdf: file })), /field "sponsorshipPdf"/);
    });
  }

  test(`${locale}: no PDF and no registration URL are null, not placeholders`, async () => {
    const data = await fetchSummitData(locale, one({ sponsorshipPdf: null, registrationUrl: null }));
    assert.equal(data.current!.sponsorshipPdf, null);
    assert.equal(data.current!.registrationUrl, null);
    assert.equal((await fetchSummitData(locale, one({ registrationUrl: 'https://forms.gle/abc' }))).current!.registrationUrl, 'https://forms.gle/abc');
  });

  test(`${locale}: unreachable Strapi and HTTP errors name Strapi and the runbook`, async () => {
    const down = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    await assert.rejects(fetchSummitData(locale, options(down)), /Strapi unreachable\. See docs\/ops\/cms-runbook\.md/);
    await assert.rejects(fetchSummitData(locale, options((async () => new Response('', { status: 403 })) as typeof fetch)), /Strapi HTTP 403/);
  });
}

test('request populates exactly the five approved fields and never sponsors', async () => {
  const urls: URL[] = [];
  await fetchSummitData('tr', options(mock((lang) => [row(lang)], 1, urls)));
  for (const url of urls) {
    const populate = [...url.searchParams.keys()].filter((key) => key.startsWith('populate'));
    assert.deepEqual(populate, ['populate[programme]', 'populate[speakers][populate][portrait][populate]',
      'populate[photos][populate]', 'populate[backgroundImage][populate]', 'populate[sponsorshipPdf]']);
    assert.ok(!populate.some((key) => key.startsWith('populate[sponsors]')), 'sponsors relation is never populated');
  }
});

test('Turkish overrides English by documentId; English-only falls back with its locale', async () => {
  const fetcher = mock((lang) => lang === 'tr'
    ? [row('tr', 's2026')]
    : [row('en', 's2026'), row('en', 's2025', { year: 2025, isCurrent: false })]);
  const tr = await fetchSummitData('tr', options(fetcher));
  assert.equal(tr.current!.contentLocale, 'tr');
  assert.equal(tr.current!.purpose, 'tr purpose');
  assert.equal(tr.others[0].contentLocale, 'en');
  assert.equal(tr.others[0].purpose, 'en purpose');
  assert.equal(tr.others[0].photos[0].image.alt, 'photo tr', 'alt follows the page locale even on fallback content');
  const en = await fetchSummitData('en', options(mock((lang) => lang === 'en' ? [row('en', 's2026')] : [row('tr', 'tr-only', { year: 2030, isCurrent: false })])));
  assert.deepEqual(en.others, [], 'English route shows English publications only');
});
