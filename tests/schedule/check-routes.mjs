// Tests the real production schedule routes against a local, synthetic Strapi REST server.
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
const types = ['talk', 'screening', 'summit', 'workshop', 'other'];
let scenario = 0; // a count of events, or 'reversed'
let requests = 0;
let server;
function scheduleRows(locale) {
  if (scenario === 'reversed') return locale === 'en' ? [{ documentId: 'reversed-doc', locale, publishedAt: '2026-01-01T00:00:00.000Z',
    title: 'Reversed', type: 'talk', startsAt: '2026-11-07T10:00:00.000Z', endsAt: '2026-11-07T09:00:00.000Z' }] : [];
  // Turkish publishes only half the documents; the rest fall back to English.
  const amount = locale === 'tr' ? Math.floor(scenario / 2) : scenario;
  return Array.from({ length: amount }, (_, i) => ({
    documentId: `event-${String(i).padStart(2, '0')}`, locale, publishedAt: '2026-01-01T00:00:00.000Z',
    title: `${locale} Fixture ${i}`, type: types[i % types.length],
    startsAt: new Date(Date.UTC(2026, 10, 1, 7) + i * 2 * 86_400_000).toISOString(),
    endsAt: i % 3 ? new Date(Date.UTC(2026, 10, 1, 9) + i * 2 * 86_400_000).toISOString() : null,
    location: i % 2 ? `${locale} Room ${i}` : null, description: null,
    url: i === 0 ? 'https://example.org/schedule' : null,
  }));
}
const cms = createServer((request, response) => {
  requests++;
  const url = new URL(request.url, 'http://localhost');
  assert.equal(url.searchParams.get('status'), 'published');
  const locale = url.searchParams.get('locale');
  const page = Number(url.searchParams.get('pagination[page]'));
  // Other build-time collections (events-showcase) are empty here.
  const rows = url.pathname === '/api/schedule-events' ? scheduleRows(locale) : [];
  // Deliberately cap the server at 25; the adapter must follow pageCount.
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data: rows.slice((page - 1) * 25, page * 25), meta: { pagination: { page, pageCount: Math.ceil(rows.length / 25) } } }));
});
await new Promise(resolve => cms.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${cms.address().port}`;
const env = { ...process.env, STRAPI_URL: origin, STRAPI_API_TOKEN: '', NEXT_PUBLIC_SITE_URL: 'https://schedule.example' };
async function run(file, args, cwd, { capture = false } = {}) {
  let output = '';
  const code = await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: capture ? 'pipe' : 'inherit' });
    if (capture) { child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; }); }
    child.on('error', reject); child.on('exit', accept);
  });
  return { code, output };
}
async function mustRun(file, args, cwd) {
  const { code } = await run(file, args, cwd);
  if (code !== 0) throw new Error(`Command failed: ${code}`);
}
async function stop() {
  if (!server) return;
  const child = server; server = undefined;
  await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); });
}
try {
  // An editor's reversed interval is invalid CMS data: the build must fail loudly.
  scenario = 'reversed';
  await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
  const failed = await run(next, ['build'], webRoot, { capture: true });
  assert.notEqual(failed.code, 0, 'a reversed interval must fail the build');
  assert.match(failed.output, /reversed-doc/);
  assert.match(failed.output, /"endsAt"\/"startsAt"/);
  assert.match(failed.output, /docs\/ops\/cms-runbook\.md/);

  for (scenario of [0, 50]) {
    await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
    await mustRun(next, ['build'], webRoot);
    const manifest = JSON.parse(await readFile(resolve(webRoot, '.next/prerender-manifest.json'), 'utf8'));
    for (const path of ['/en/schedule', '/tr/takvim']) {
      assert.ok(manifest.routes[path], `${path} must be prerendered`);
      assert.equal(manifest.routes[path].initialRevalidateSeconds, false);
    }
    const atBuild = requests;
    server = spawn(process.execPath, [next, 'start', '-p', '4188', '-H', '127.0.0.1'], { cwd: webRoot, env, stdio: 'inherit' });
    let ready = false;
    for (let i = 0; i < 200; i++) {
      try { await fetch('http://127.0.0.1:4188/en'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(ready, 'Next server started');
    for (const [locale, segment, other, empty] of [
      ['en', 'schedule', '/tr/takvim', 'No events are scheduled yet.'],
      ['tr', 'takvim', '/en/schedule', 'Henüz planlanmış etkinlik yok.'],
    ]) {
      const path = `/${locale}/${segment}`;
      const response = await fetch(`http://127.0.0.1:4188${path}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`rel="canonical" href="https://schedule.example${path}"`));
      assert.ok(html.includes(`href="https://schedule.example${other}"`));
      assert.ok(html.includes(`href="${other}" hrefLang=`), 'language switcher targets the other schedule route');
      assert.equal((html.match(/<article\b/g) ?? []).length, scenario);
      // Neutral server form: no state, no grid, no chosen month.
      assert.doesNotMatch(html, /data-time-state=|<table\b|aria-live="polite">[^<]/);
      assert.ok(html.includes(locale === 'tr' ? 'İstanbul saatiyle' : 'Istanbul time'));
      if (scenario === 0) assert.ok(html.includes(empty));
      else {
        assert.ok(!html.includes(empty));
        assert.ok(html.includes('dateTime="2026-11-01T07:00:00.000Z"'));
        if (locale === 'tr') {
          assert.ok(html.includes('tr Fixture 0'));
          assert.match(html, /<h3[^>]*lang="en"[^>]*>en Fixture 49<\/h3>/, 'English fallback marks its language');
          assert.ok(html.includes('Kasım 2026') && html.includes('Söyleşi'));
        } else assert.ok(html.includes('November 2026') && html.includes('Talk'));
      }
    }
    assert.equal((await fetch('http://127.0.0.1:4188/tr/schedule')).status, 404);
    assert.equal((await fetch('http://127.0.0.1:4188/en/takvim')).status, 404);
    const sitemap = await (await fetch('http://127.0.0.1:4188/sitemap.xml')).text();
    assert.ok(sitemap.includes('https://schedule.example/en/schedule'), 'schedule is in the sitemap even when empty');
    assert.ok(sitemap.includes('https://schedule.example/tr/takvim'));
    assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
    await mustRun(resolve(root, 'scripts/checks/budgets.mjs'), [], root);
    await stop();
  }
  console.log('Schedule production routes passed: reversed-interval build failure, empty/fifty, pagination/fallback, metadata, switcher, sitemap, static requests and budgets.');
} finally { await stop(); await new Promise(resolve => cms.close(resolve)); }
