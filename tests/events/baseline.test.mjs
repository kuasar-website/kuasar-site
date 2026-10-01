import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFixture } from './build.mjs';
const { render, entries, renderProps } = await buildFixture();
for (const locale of ['tr', 'en']) {
  for (const count of [0, 1, 50]) test(`${locale}: ${count} records in each collection, no video or server clock`, () => {
    const html = render(locale, count, count);
    assert.equal((html.match(/<article/g) ?? []).length, count * 2);
    assert.equal((html.match(/<time /g) ?? []).length, count * 2);
    assert.doesNotMatch(html, /data-time-state|<video|<source|<iframe|<script/);
    if (count) {
      assert.match(html, /Çağrı Öztürk/); assert.match(html, /Interstellar/);
      assert.match(html, /Stellar Talk/); assert.match(html, /Nebula Night/);
      assert.ok(html.includes(locale === 'tr' ? 'Konuşmayı izle' : 'Watch talk'));
    } else assert.doesNotMatch(html, /<section/);
  });
  test(`${locale}: collections hide independently`, () => {
    assert.doesNotMatch(render(locale, 0, 1), /Stellar Talk/);
    assert.doesNotMatch(render(locale, 1, 0), /Nebula Night/);
  });
  test(`${locale}: optional fields do not create empty controls; one photo remains`, () => {
    const html = render(locale, 1, 1, true);
    assert.doesNotMatch(html, /<a |<blockquote|<cite|<time/);
    assert.equal((html.match(/<img /g) ?? []).length, 1);
    assert.ok(html.includes(locale === 'tr' ? 'Tarih açıklanacak' : 'Date to be announced'));
  });
}
test('silent English fallback marks the actual content language', () => {
  const data = entries('en');
  data.talks[0].contentLocale = 'en'; data.nights[0].contentLocale = 'en';
  const html = renderProps({ locale: 'tr', ...data });
  assert.match(html, /lang="en">Paths into space/);
  assert.match(html, /lang="en">Under the stars/);
  assert.match(html, /Konuşmayı izle/);
});
test('dates sort descending without mutating the input; undated entries follow', () => {
  const data = entries('en', 3, 0);
  data.talks[0].date = null; data.talks[1].date = '2020-01-01'; data.talks[2].date = '2030-01-01';
  const html = renderProps({ locale: 'en', ...data });
  assert.ok(html.indexOf('Stellar Talk #3') < html.indexOf('Stellar Talk #2'));
  assert.ok(html.indexOf('Stellar Talk #2') < html.indexOf('Stellar Talk #1'));
  assert.equal(data.talks[0].eventNumber, 1);
});
test('a photo-less night fails with record context instead of inventing content', () => {
  const data = entries('en'); data.nights[0].photos = [];
  assert.throws(() => renderProps({ locale: 'en', ...data }), /night-0: at least one validated photo/);
});
