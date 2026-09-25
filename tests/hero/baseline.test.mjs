import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInThisContext } from 'node:vm';

const requireWeb = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const ts = requireWeb('typescript');
const { createElement } = requireWeb('react');
const { renderToStaticMarkup } = requireWeb('react-dom/server');
function load(name) {
  const source = readFileSync(new URL(`../../apps/web/components/hero/${name}.tsx`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } });
  const module = { exports: {} };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`)((id) => {
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id === './wordmark') return load('wordmark');
    return requireWeb(id);
  }, module, module.exports);
  return module.exports;
}
const { Hero } = load('hero');
const render = (locale) => renderToStaticMarkup(createElement(Hero, {
  locale,
  sponsorAction: createElement('a', { href: '/actual-sponsor-destination' }, locale === 'tr' ? 'İletişime geç' : 'Contact us'),
  joinAction: createElement('a', { href: '/actual-member-destination' }, locale === 'tr' ? 'Bize katıl' : 'Join us'),
}));
for (const locale of ['tr', 'en']) {
  test(`${locale}: identity and both actions exist in initial HTML`, () => {
    const html = render(locale);
    assert.match(html, /<h1[^>]*aria-label="KUASAR"/);
    assert.match(html, /Koç University Association of Space &amp; Rocketry/);
    assert.ok(html.includes(locale === 'tr' ? 'Sponsorlar ve iş ortakları için' : 'For sponsors and partners'));
    assert.ok(html.includes(locale === 'tr' ? 'Takıma katılmak isteyenler için' : 'For prospective members'));
    assert.match(html, /href="\/actual-sponsor-destination"/);
    assert.match(html, /href="\/actual-member-destination"/);
    assert.doesNotMatch(html, /<script|<img|<video|<canvas/);
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
  });
}
test('inline wordmark preserves canonical artwork and inherits colour', () => {
  const original = readFileSync(new URL('../../apps/web/public/brand/kuasar-wordmark.svg', import.meta.url), 'utf8');
  const html = render('en');
  function paths(markup) {
    return [...markup.matchAll(/<path\b([^>]*)\/?\s*>/g)].map(([, attrs]) =>
      Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v])));
  }
  assert.deepEqual(paths(html), paths(original));
  assert.match(html, /<svg[^>]*fill="none"/);
  assert.equal(html.match(/viewBox="([^"]+)"/)[1], original.match(/viewBox="([^"]+)"/)[1]);
});
