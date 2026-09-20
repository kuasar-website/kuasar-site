import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInThisContext } from 'node:vm';

// Use the web workspace's React version (CMS may resolve a different major).
const requireWeb = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = requireWeb('typescript');
const { createElement } = requireWeb('react');
const { renderToStaticMarkup } = requireWeb('react-dom/server');
const source = readFileSync(new URL('../../apps/web/components/timeline/timeline.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
});
// CSS Modules are names only in SSR unit tests; browser layout is tested separately.
const module = { exports: {} };
runInThisContext(`(function(require,module,exports){${outputText}\n})`)(
  (id) => id.endsWith('.css') ? { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) } : requireWeb(id), module, module.exports,
);
const { Timeline } = module.exports;
const entry = (i) => ({ id: `entry-${i}`, date: `2022-01-${String(i % 28 + 1).padStart(2, '0')}`, kind: 'milestone', title: `Record ${i}`, body: `Caption ${i}` });
const render = (locale, entries, props = {}) => renderToStaticMarkup(createElement(Timeline, { id: 'history', locale, entries, ...props }));

for (const locale of ['en', 'tr']) {
  test(`${locale}: empty data omits section and link`, () => {
    assert.equal(render(locale, [], { viewMoreHref: '/unused' }), '');
  });
  test(`${locale}: one entry has direction, neutral date and no image placeholder`, () => {
    const html = render(locale, [entry(0)]);
    assert.match(html, /<time dateTime="2022-01-01">2022-01-01<\/time>/);
    assert.ok(html.includes(locale === 'tr' ? 'Bugünden → Geçmişe' : 'Present → Past'));
    assert.ok(html.includes(locale === 'tr' ? 'Şimdi' : 'Now'));
    assert.match(html, /role="region" tabindex="0"/);
    assert.doesNotMatch(html, /<img|<script|data-state/);
  });
  test(`${locale}: fifty records sort descending without mutating input`, () => {
    const entries = Array.from({ length: 50 }, (_, i) => entry(i));
    const before = structuredClone(entries);
    const html = render(locale, entries);
    const dates = [...html.matchAll(/dateTime="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(dates.length, 50);
    assert.deepEqual(dates, [...dates].sort().reverse());
    assert.deepEqual(entries, before);
    assert.equal((html.match(/<li /g) || []).length, 50);
  });
  test(`${locale}: optional content and localized navigation`, () => {
    const href = locale === 'tr' ? '/tr/zaman-cizelgesi' : '/en/timeline';
    const html = render(locale, [{ ...entry(0), image: { src: '/example.jpg', alt: 'Example', width: 640, height: 400 }, link: '/mission', availableTranslationHref: '/other-locale' }], { viewMoreHref: href });
    assert.ok(html.includes(`href="${href}"`));
    assert.match(html, /loading="lazy"/);
    assert.match(html, /width="640" height="400"/);
    assert.ok(html.includes(locale === 'tr' ? 'Bu sayfa henüz Türkçe olarak mevcut değil.' : 'This page is not yet available in English.'));
    assert.match(html, /href="\/other-locale"/);
  });
}
