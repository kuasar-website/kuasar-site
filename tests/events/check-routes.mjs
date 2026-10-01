// Tests the real production routes against a local, synthetic Strapi REST server.
// No CMS records or environment secrets are read or modified.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { rm, readFile } from 'node:fs/promises';
const root = resolve(import.meta.dirname, '../..');
const webRoot = resolve(root, 'apps/web');
const web = createRequire(resolve(webRoot, 'package.json'));
const next = web.resolve('next/dist/bin/next');
let count = 0;
let requests = 0;
let server;
const photo = { image: { url: 'https://media.kuasar.org/fixture.jpg', width: 800, height: 600 }, altEn: 'Screening audience', altTr: 'Gösterimdeki izleyiciler' };
const cms = createServer((request, response) => {
  requests++;
  const url = new URL(request.url, 'http://localhost');
  assert.equal(url.searchParams.get('status'), 'published');
  const locale = url.searchParams.get('locale');
  const page = Number(url.searchParams.get('pagination[page]'));
  // Deliberately cap the server at 25; the adapter must follow pageCount.
  // The Galactic Summit (another build-time Strapi consumer) is empty in this fixture.
  const amount = url.pathname === '/api/galactic-summits' ? 0 : locale === 'tr' ? Math.floor(count / 2) : count;
  const rows = Array.from({ length: amount }, (_, i) => ({ documentId: `event-${i}`, locale,
    publishedAt: '2026-01-01T00:00:00Z', title: `${locale} Fixture ${i}`, eventNumber: i + 1,
    speakerName: 'Çağrı Öztürk', date: '2026-01-01T12:00:00Z', photos: [photo], speakerPortrait: photo,
    watchUrl: 'https://example.org/watch',
  }));
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data: rows.slice((page - 1) * 25, page * 25), meta: { pagination: { page, pageCount: Math.ceil(amount / 25) } } }));
});
await new Promise(resolve => cms.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${cms.address().port}`;
const env = { ...process.env, STRAPI_URL: origin, STRAPI_API_TOKEN: '', NEXT_PUBLIC_SITE_URL: 'https://events.example' };
async function run(file, args, cwd) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? accept() : reject(new Error(`Command failed: ${code}`)));
  });
}
async function stop() {
  if (!server) return;
  const child = server; server = undefined;
  await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); });
}
try {
  for (count of [0, 50]) {
    // A build after a CMS publication must not reuse the previous fixture's persistent cache.
    await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
    await run(next, ['build'], webRoot);
    const manifest = JSON.parse(await readFile(resolve(webRoot, '.next/prerender-manifest.json'), 'utf8'));
    for (const path of ['/en/events', '/tr/etkinlikler']) {
      assert.ok(manifest.routes[path], `${path} must be prerendered`);
      assert.equal(manifest.routes[path].initialRevalidateSeconds, false);
    }
    const atBuild = requests;
    server = spawn(process.execPath, [next, 'start', '-p', '4178', '-H', '127.0.0.1'], { cwd: webRoot, env, stdio: 'inherit' });
    let ready = false;
    for (let i = 0; i < 200; i++) {
      try { await fetch('http://127.0.0.1:4178/'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(ready, 'Next server started');
    for (const [locale, segment, other] of [['en','events','/tr/etkinlikler'],['tr','etkinlikler','/en/events']]) {
      const path = `/${locale}/${segment}`;
      const response = await fetch(`http://127.0.0.1:4178${path}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`rel="canonical" href="https://events.example${path}"`));
      assert.ok(html.includes(`href="https://events.example${other}"`));
      assert.ok(html.includes(`href="${other}" hrefLang=`));
      assert.equal((html.match(/<article\b/g) ?? []).length, count * 2);
      assert.equal((html.match(/<time\b/g) ?? []).length, count * 2);
      assert.doesNotMatch(html, /data-time-state=|<video\b/);
      if (count) {
        assert.ok(html.includes('https://media.kuasar.org/cdn-cgi/image/'));
        if (locale === 'tr') { assert.ok(html.includes('tr Fixture 0')); assert.ok(html.includes('en Fixture 49')); }
      }
    }
    assert.equal((await fetch('http://127.0.0.1:4178/tr/events')).status, 404);
    assert.equal((await fetch('http://127.0.0.1:4178/en/etkinlikler')).status, 404);
    const sitemap = await (await fetch('http://127.0.0.1:4178/sitemap.xml')).text();
    assert.equal(sitemap.includes('https://events.example/en/events'), count > 0);
    assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
    await run(resolve(root, 'scripts/checks/budgets.mjs'), [], root);
    await stop();
  }
  console.log('Events production routes passed: empty/fifty, pagination/fallback, media, metadata, shell, switcher, sitemap, static requests and budgets.');
} finally { await stop(); await new Promise(resolve => cms.close(resolve)); }
