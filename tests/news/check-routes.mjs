// Tests the real production News routes against a local, synthetic Strapi REST server.
// No CMS records or environment secrets are read or modified.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { rm, readFile } from 'node:fs/promises';

const root = resolve(import.meta.dirname, '../..');
const webRoot = resolve(root, 'apps/web');
const next = createRequire(resolve(webRoot, 'package.json')).resolve('next/dist/bin/next');
const SITE = 'https://news.example';
const PORT = 4179;
let count = 0;
let requests = 0;
let server;

const cover = { image: { url: 'https://media.kuasar.org/news-cover.jpg', width: 1600, height: 900 }, altEn: 'Rocket on the pad', altTr: 'Rampadaki roket' };
const BODY = '## Results\n\nWe reached **apogee**. Read [the report](https://kuasar.org/report).\n\n1. Fly\n2. Recover\n\n<script>alert(1)</script>';
function announcements(locale) {
  if (!count) return [];
  const rows = Array.from({ length: count }, (_, i) => ({
    documentId: `news${String(i).padStart(18, '0')}`, locale, pinned: i === count - 1,
    title: `${locale} News ${i}`, slug: `${locale}-news-${i}`, excerpt: `${locale} excerpt ${i}`,
    body: BODY, publishedAt: `2026-09-${String(10 + i).padStart(2, '0')}T09:00:00.000Z`,
    coverImage: i === 0 ? cover : null,
  }));
  // Turkish exists only for the first document: the rest must fall back to English on /tr.
  const published = locale === 'tr' ? rows.slice(0, 1) : rows;
  // A row with no publishedAt must never reach a public page, even if a CMS bug returned it.
  return [...published, { ...rows[0], documentId: 'draft0000000000000000', title: 'DRAFT-ONLY-SECRET', slug: 'draft', publishedAt: null }];
}
const cms = createServer((request, response) => {
  requests++;
  const url = new URL(request.url, 'http://localhost');
  assert.equal(url.searchParams.get('status'), 'published', `${url.pathname} must request published content only`);
  const page = Number(url.searchParams.get('pagination[page]') || 1);
  const data = url.pathname === '/api/announcements' ? announcements(url.searchParams.get('locale')) : [];
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data: page === 1 ? data : [], meta: { pagination: { page, pageCount: data.length ? 1 : 0 } } }));
});
await new Promise(accept => cms.listen(0, '127.0.0.1', accept));
const PREVIEW_SECRET = 'news-check-preview-secret';
const env = { ...process.env, STRAPI_URL: `http://127.0.0.1:${cms.address().port}`, STRAPI_API_TOKEN: '', NEXT_PUBLIC_SITE_URL: SITE, PREVIEW_SECRET, STRAPI_PREVIEW_TOKEN: 'news-check-preview-token' };

function run(file, args, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? accept() : reject(new Error(`Command failed: ${code}`)));
  });
}
async function stop() {
  if (!server) return;
  const child = server; server = undefined;
  await new Promise(accept => { child.once('exit', accept); child.kill('SIGTERM'); });
}
const get = path => fetch(`http://127.0.0.1:${PORT}${path}`, { redirect: 'manual' });

try {
  for (count of [0, 3]) {
    await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
    await run(next, ['build'], webRoot);
    const manifest = JSON.parse(await readFile(resolve(webRoot, '.next/prerender-manifest.json'), 'utf8'));
    for (const path of ['/en/news', '/tr/duyurular']) {
      assert.ok(manifest.routes[path], `${path} must be prerendered`);
      assert.equal(manifest.routes[path].initialRevalidateSeconds, false, `${path} has no time-based revalidation`);
    }
    const atBuild = requests;
    server = spawn(process.execPath, [next, 'start', '-p', String(PORT), '-H', '127.0.0.1'], { cwd: webRoot, env, stdio: 'inherit' });
    let ready = false;
    for (let i = 0; i < 200 && !ready; i++) {
      try { await fetch(`http://127.0.0.1:${PORT}/robots.txt`); ready = true; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(ready, 'Next server started');

    for (const [locale, path, other] of [['en', '/en/news', '/tr/duyurular'], ['tr', '/tr/duyurular', '/en/news']]) {
      const response = await get(path);
      assert.equal(response.status, 200, `${path} resolves`);
      const html = await response.text();
      assert.match(html, new RegExp(`<html[^>]*\\blang="${locale}"`), `${path} server-renders lang="${locale}"`);
      assert.ok(html.includes(`rel="canonical" href="${SITE}${path}"`), `${path} canonical`);
      assert.ok(html.includes(`href="${SITE}${other}"`), `${path} hreflang alternate`);
      assert.ok(html.includes(`href="${path}"`), `${path}: the shell navigation links here`);
      assert.ok(!html.includes('DRAFT-ONLY-SECRET'), `${path}: a draft is never public`);
      assert.ok(!html.includes('<script>alert(1)</script>'), `${path}: body HTML is escaped, never injected`);
      assert.doesNotMatch(html, /data-time-state=/, 'publication dates carry no client time state');
      const articles = (html.match(/<article\b/g) ?? []).length;
      assert.equal(articles, count, `${path}: one article per published announcement`);
      if (!count) {
        assert.ok(html.includes(locale === 'tr' ? 'Henüz duyuru yok.' : 'No news yet.'), `${path}: empty state`);
      } else {
        assert.ok(html.includes('https://media.kuasar.org/cdn-cgi/image/'), 'cover image through the media loader');
        assert.ok(html.includes('<strong>apogee</strong>'), 'body Markdown rendered');
        assert.ok(html.includes(locale === 'tr' ? 'Rampadaki roket' : 'Rocket on the pad'), 'alt text in the visitor locale');
        if (locale === 'tr') {
          assert.ok(html.includes('tr News 0'), 'Turkish variant used when present');
          assert.match(html, /<article[^>]*lang="en"[^>]*>|<article[^>]*lang="en"/, 'English fallback articles are tagged lang="en"');
          assert.ok(html.includes('en News 2'), 'missing Turkish falls back to English');
        } else {
          assert.ok(!html.includes('tr News'), '/en never shows Turkish text');
        }
        const firstTitle = /<h2[^>]*><a href="#([^"]+)"/.exec(html)?.[1];
        assert.equal(firstTitle, `${locale === 'tr' ? 'en' : 'en'}-news-${count - 1}`, 'the pinned announcement comes first');
      }
    }
    for (const path of ['/tr/news', '/en/duyurular', '/en/news/en-news-0']) {
      assert.equal((await get(path)).status, 404, `${path} is not a route`);
    }
    const nav = await (await get('/tr')).text();
    assert.ok(nav.includes('href="/tr/duyurular"'), 'Turkish home navigation links to News');
    const sitemap = await (await get('/sitemap.xml')).text();
    assert.equal(sitemap.includes(`${SITE}/en/news`), count > 0, 'News is in the sitemap only once populated');
    assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
    // An editor previewing another section carries a Draft Mode cookie. News has no preview
    // and must still serve published content to them: 200, no draft, no error.
    const enter = await get(`/api/preview?${new URLSearchParams({ secret: PREVIEW_SECRET, uid: 'api::schedule-event.schedule-event', documentId: 'abcdefghijklmnopqrstuvwx', locale: 'en', status: 'draft' })}`);
    assert.equal(enter.status, 307, 'Draft Mode entered through the real preview route');
    const bypass = (enter.headers.getSetCookie?.() ?? []).find(c => c.startsWith('__prerender_bypass='))?.split(';')[0];
    assert.ok(bypass, 'Draft Mode cookie set');
    for (const path of ['/en/news', '/tr/duyurular']) {
      const drafted = await fetch(`http://127.0.0.1:${PORT}${path}`, { headers: { Cookie: bypass } });
      assert.equal(drafted.status, 200, `${path} works under another section's Draft Mode`);
      const html = await drafted.text();
      assert.ok(!html.includes('DRAFT-ONLY-SECRET'), `${path}: still no draft under Draft Mode`);
      assert.equal((html.match(/<article\b/g) ?? []).length, count, `${path}: same published list under Draft Mode`);
    }
    await run(resolve(root, 'scripts/checks/budgets.mjs'), [], root);
    await stop();
  }
  console.log('News production routes passed: empty/populated, published-only, fallback, ordering, media, Markdown escaping, metadata, lang, navigation, 404s, sitemap, static requests, Draft Mode isolation and budgets.');
} finally { await stop(); await new Promise(accept => cms.close(accept)); }
