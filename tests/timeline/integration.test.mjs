import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '../..');
const web = createRequire(resolve(root, 'apps/web/package.json'));
const { createElement } = web('react');
const { renderToStaticMarkup } = web('react-dom/server');
const output = resolve(root, 'test-results/timeline-integration.mjs');
await build({
  stdin: { contents: `export * from './apps/web/components/timeline/content'; export * from './apps/web/components/timeline/timeline';`, resolveDir: root, loader: 'tsx' },
  outfile: output, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external',
  plugins: [{ name: 'workspace-packages', setup(builder) {
    builder.onResolve({ filter: /^(react|react-dom|@mdx-js\/mdx|sharp)(\/.*)?$/ }, ({ path }) => ({ path: web.resolve(path), external: true }));
    builder.onResolve({ filter: /lib\/content\/timeline$/ }, () => ({ path: resolve(root, 'apps/web/lib/content/timeline.ts'), external: true }));
  } }],
});
const { timelineViews, Timeline } = await import(pathToFileURL(output));
const { loadEntries } = await import(pathToFileURL(resolve(root, 'apps/web/lib/content/entries.ts')));
const { validateTimelineEntryFacts } = await import(pathToFileURL(resolve(root, 'apps/web/lib/content/timeline.ts')));
const fixture = await mkdtemp(join(tmpdir(), 'timeline-integration-'));
const publicRoot = join(fixture, 'public');
await mkdir(publicRoot);
const render = (locale, entries) => renderToStaticMarkup(createElement(Timeline, { id: 'timeline', locale, entries, headingLevel: 1 }));
async function records(count, update = () => {}) {
  const contentRoot = join(fixture, `content-${count}-${Math.random()}`);
  for (let i = 0; i < count; i++) {
    const path = join(contentRoot, 'timeline', `record-${i}`);
    await mkdir(path, { recursive: true });
    const files = {
      'index.json': JSON.stringify({ date: '2026-01-01', kind: 'milestone' }),
      'en.mdx': `---\nslug: record-${i}\ntitle: English ${i}\n---\nEnglish **caption**.`,
      'tr.mdx': `---\nslug: kayit-${i}\ntitle: Türkçe ${i}\n---\nTürkçe *açıklama*.`,
    };
    update(files, i);
    for (const [name, source] of Object.entries(files)) await writeFile(join(path, name), source);
  }
  return loadEntries('timeline', validateTimelineEntryFacts, { contentRoot });
}

for (const locale of ['en', 'tr']) {
  test(`${locale}: real loader zero/one/fifty entries and rendered Markdown`, async () => {
    for (const count of [0, 1, 50]) {
      const views = await timelineViews(await records(count), locale, publicRoot);
      const html = render(locale, views);
      assert.equal((html.match(/<li /g) || []).length, count);
      if (!count) assert.equal(html, '');
      else {
        assert.match(html, locale === 'tr' ? /<em>açıklama<\/em>/ : /<strong>caption<\/strong>/);
        assert.match(html, /<time dateTime="2026-01-01">2026-01-01<\/time>/);
        assert.doesNotMatch(html, /<script|data-state/);
      }
    }
  });
  test(`${locale}: incomplete translation uses available language and a stable entry target`, async () => {
    const entries = await records(1, (f) => { f[`${locale}.mdx`] = f[`${locale}.mdx`].replace('---\nslug:', '---\nstatus: incomplete\nslug:'); });
    const [view] = await timelineViews(entries, locale, publicRoot);
    assert.equal(view.contentLocale, locale === 'en' ? 'tr' : 'en');
    assert.match(view.availableTranslationHref, /#timeline-entry-record-0$/);
    assert.match(render(locale, [view]), new RegExp(`lang="${view.contentLocale}"`));
  });
}
test('both incomplete keeps a notice without inventing an available version', async () => {
  const entries = await records(1, (f) => { for (const locale of ['en', 'tr']) f[`${locale}.mdx`] = f[`${locale}.mdx`].replace('---\nslug:', '---\nstatus: incomplete\nslug:'); });
  const [view] = await timelineViews(entries, 'tr', publicRoot);
  assert.equal(view.availableTranslationHref, undefined);
  assert.match(render('tr', [view]), /Bu sayfa henüz Türkçe/);
});
test('offset-qualified instants sort by actual instant, preserving raw display', async () => {
  const entries = await records(2, (f, i) => { f['index.json'] = JSON.stringify({ date: i ? '2026-01-01T00:30:00Z' : '2026-01-01T01:00:00+03:00', kind: 'milestone' }); });
  const html = render('en', await timelineViews(entries, 'en', publicRoot));
  assert.ok(html.indexOf('English 1') < html.indexOf('English 0'));
  assert.match(html, /2026-01-01T01:00:00\+03:00/);
});
test('optional git image gets localized alt and real dimensions, and appears only once', async () => {
  await writeFile(join(publicRoot, 'test.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200"/></svg>');
  const entries = await records(1, (f) => {
    f['index.json'] = JSON.stringify({ date: '2026-01-01', kind: 'launch', image: '/test.svg' });
    for (const locale of ['en', 'tr']) f[`${locale}.mdx`] += `\n\n![${locale} alternative](/test.svg)`;
  });
  for (const locale of ['en', 'tr']) {
    const html = render(locale, await timelineViews(entries, locale, publicRoot));
    assert.equal((html.match(/<img /g) || []).length, 1);
    assert.match(html, /width="300" height="200"/);
    assert.ok(html.includes(`alt="${locale} alternative"`));
    assert.ok(html.includes(`<img lang="${locale}"`));
  }
});
test('bad captions and missing image descriptions fail with entry context', async () => {
  for (const body of ['<script>alert(1)</script>', '{Date.now()}', '[bad](javascript:alert%281%29)']) {
    const entries = await records(1, (f) => { f['en.mdx'] = `---\nslug: test\ntitle: Test\n---\n${body}`; });
    await assert.rejects(timelineViews(entries, 'en', publicRoot), /content\/timeline\/record-0\/en.mdx/);
  }
  const entries = await records(1, (f) => { f['index.json'] = JSON.stringify({ date: '2026-01-01', kind: 'launch', image: '/test.svg' }); });
  await assert.rejects(timelineViews(entries, 'en', publicRoot), /localized alt/);
});
test.after(async () => rm(fixture, { recursive: true, force: true }));
