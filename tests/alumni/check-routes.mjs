// Tests the real production Alumni routes against a local, synthetic Strapi REST server.
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
const SITE = 'https://alumni.example';
const PORT = 4181;
const PREVIEW_SECRET = 'alumni-check-preview-secret';
let mode = 'zero';
let requests = 0;
let server;

const photo = { image: { url: 'https://media.kuasar.org/alumni-portrait.jpg', width: 800, height: 800 }, altEn: 'Portrait', altTr: 'Portre' };
const person = (id, locale, extra = {}) => ({ documentId: `alum${String(id).padStart(20, '0')}`, locale, name: `Person ${id}`,
  yearJoined: 2018, yearLeft: 2022, subTeam: 'propulsion', roleHeld: `${locale} role ${id}`, photo: null, linkedinUrl: null,
  publishedAt: '2026-01-01T00:00:00.000Z', ...extra });
function alumni(locale) {
  if (mode === 'zero') return [];
  // The Content API's real shape: consent fields are private, so absent, unless mode is 'leak'.
  const leak = mode === 'leak' ? { consentSource: 'LEAKED-CONSENT-SOURCE' } : {};
  // Non-localized fields (photo, linkedinUrl, years, subTeam) are shared by every locale
  // variant in Strapi, so the Turkish record carries the same values; only roleHeld differs.
  const one = { photo, linkedinUrl: 'https://www.linkedin.com/in/person-one', ...leak };
  if (locale === 'tr') return [person(1, 'tr', { ...one, roleHeld: 'Türkçe görev 1' })];
  return [
    person(1, 'en', one),
    person(2, 'en', { name: 'Aylin', yearLeft: 2024, linkedinUrl: 'http://www.linkedin.com/in/insecure' }),
    person(3, 'en', { name: 'Zeynep', yearLeft: 2024, linkedinUrl: 'https://evil.example/in/x', subTeam: null }),
    person(4, 'en', { name: 'Can', yearLeft: null, yearJoined: 2025 }),
    { ...person(9, 'en'), name: 'DRAFT-ONLY-ALUMNUS', publishedAt: null },
  ];
}
const cms = createServer((request, response) => {
  requests++;
  const url = new URL(request.url, 'http://localhost');
  assert.equal(url.searchParams.get('status'), 'published', `${url.pathname} must request published content only`);
  const page = Number(url.searchParams.get('pagination[page]') || 1);
  const data = url.pathname === '/api/alumni' ? alumni(url.searchParams.get('locale')) : [];
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data: page === 1 ? data : [], meta: { pagination: { page, pageCount: data.length ? 1 : 0 } } }));
});
await new Promise(accept => cms.listen(0, '127.0.0.1', accept));
const env = { ...process.env, STRAPI_URL: `http://127.0.0.1:${cms.address().port}`, STRAPI_API_TOKEN: '', NEXT_PUBLIC_SITE_URL: SITE,
  PREVIEW_SECRET, STRAPI_PREVIEW_TOKEN: 'alumni-check-preview-token' };

function run(file, args, cwd, quiet = false) {
  return new Promise((accept) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: quiet ? 'pipe' : 'inherit' });
    let output = '';
    child.stdout?.on('data', d => { output += d; }); child.stderr?.on('data', d => { output += d; });
    child.on('exit', code => accept({ code, output }));
  });
}
async function stop() {
  if (!server) return;
  const child = server; server = undefined;
  await new Promise(accept => { child.once('exit', accept); child.kill('SIGTERM'); });
}
const get = (path, init = {}) => fetch(`http://127.0.0.1:${PORT}${path}`, { redirect: 'manual', ...init });

try {
  // The privacy canary end to end: if the CMS ever returns a consent field, the build fails.
  mode = 'leak';
  await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
  const leaked = await run(next, ['build'], webRoot, true);
  assert.notEqual(leaked.code, 0, 'a build must FAIL when the Content API exposes a consent field');
  assert.match(leaked.output, /exposed consentSource/, 'the failure names the exposed field');
  assert.ok(!leaked.output.includes('LEAKED-CONSENT-SOURCE'), 'the failure never prints the consent value');

  for (mode of ['zero', 'four']) {
    const count = mode === 'zero' ? 0 : 4;
    await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
    const built = await run(next, ['build'], webRoot);
    assert.equal(built.code, 0, `build (${mode})`);
    const manifest = JSON.parse(await readFile(resolve(webRoot, '.next/prerender-manifest.json'), 'utf8'));
    for (const path of ['/en/alumni', '/tr/mezunlar']) {
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

    for (const [locale, path, other] of [['en', '/en/alumni', '/tr/mezunlar'], ['tr', '/tr/mezunlar', '/en/alumni']]) {
      const response = await get(path);
      assert.equal(response.status, 200, `${path} resolves`);
      const html = await response.text();
      assert.match(html, new RegExp(`<html[^>]*\\blang="${locale}"`), `${path} server-renders lang="${locale}"`);
      assert.ok(html.includes(`rel="canonical" href="${SITE}${path}"`), `${path} canonical`);
      assert.ok(html.includes(`href="${SITE}${other}"`), `${path} hreflang alternate`);
      for (const [lang, target] of [['en', '/en/alumni'], ['tr', '/tr/mezunlar'], ['x-default', '/en/alumni']]) {
        assert.ok(html.includes(`<link rel="alternate" hrefLang="${lang}" href="${SITE}${target}"/>`), `${path} hreflang ${lang}`);
      }
      // Reachable, never indexed: page-level robots metadata (sitemap exclusion alone isn't enough).
      assert.equal((html.match(/<meta name="robots"[^>]*>/g) ?? []).join(''), '<meta name="robots" content="noindex, nofollow"/>', `${path}: exactly one robots meta, noindex`);
      assert.ok(html.includes(`href="${path}"`), `${path}: the shell navigation links here`);
      assert.ok(!html.includes('DRAFT-ONLY-ALUMNUS'), `${path}: a draft is never public`);
      assert.doesNotMatch(html, /consentRecordedAt|consentSource/, `${path}: no consent field anywhere in the page or its payload`);
      const cards = (html.match(/<li class="[^"]*card/g) ?? []).length;
      assert.equal(cards, count, `${path}: one card per published alumnus`);
      if (!count) {
        assert.ok(html.includes(locale === 'tr' ? 'Henüz listelenmiş mezun yok.' : 'No alumni are listed yet.'), `${path}: empty state`);
        continue;
      }
      assert.ok(!html.includes('alumni-portrait.jpg'), `${path}: no portrait without consent evidence (consent is private)`);
      assert.ok(html.includes('href="https://www.linkedin.com/in/person-one"'), `${path}: a valid LinkedIn link renders`);
      assert.ok(!html.includes('linkedin.com/in/insecure') && !html.includes('evil.example'), `${path}: invalid LinkedIn URLs never render`);
      const headings = [...html.matchAll(/<h2 id="alumni-([^"]+)"/g)].map(m => m[1]);
      assert.deepEqual(headings, ['2024', '2022', 'unknown'], `${path}: newest year first, unknown last`);
      const names = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map(m => m[1]);
      assert.deepEqual(names.slice(0, 2), ['Aylin', 'Zeynep'], `${path}: alphabetical within a year`);
      if (locale === 'tr') {
        assert.ok(html.includes('Türkçe görev 1'), 'Turkish roleHeld used when present');
        assert.match(html, /<p class="[^"]*role[^"]*" lang="en">en role 2<\/p>/, 'missing Turkish falls back to English with lang="en"');
        assert.ok(html.includes('Aviyonik') || html.includes('İtki'), 'sub-team label localized');
      } else {
        assert.ok(!html.includes('Türkçe görev'), '/en never shows Turkish text');
      }
    }
    for (const path of ['/tr/alumni', '/en/mezunlar']) {
      assert.equal((await get(path)).status, 404, `${path} is not a route`);
    }
    assert.ok((await (await get('/tr')).text()).includes('href="/tr/mezunlar"'), 'Turkish home navigation links to Alumni');
    const sitemap = await (await get('/sitemap.xml')).text();
    assert.ok(!sitemap.includes(`${SITE}/en/alumni`) && !sitemap.includes(`${SITE}/tr/mezunlar`), 'Alumni is deliberately not in the sitemap');
    // robots.txt must let crawlers fetch Alumni, or they could never read the noindex.
    const robotsTxt = await (await get('/robots.txt')).text();
    assert.doesNotMatch(robotsTxt, /Disallow:\s*\/(en\/alumni|tr\/mezunlar|en\/?$|tr\/?$|\s*$)/m, 'robots.txt does not block Alumni');
    // noindex is Alumni-only: no other public page gains it.
    for (const path of ['/en', '/tr', '/en/events', '/tr/etkinlikler', '/en/about', '/tr/hakkimizda', '/en/schedule', '/tr/takvim']) {
      const r = await get(path);
      if (r.status !== 200) continue; // unconfigured-section routes are out of scope here
      assert.doesNotMatch(await r.text(), /<meta name="robots"[^>]*noindex/, `${path} must not be noindex`);
    }
    assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
    // Under another section's Draft Mode cookie, Alumni still serves published content.
    const enter = await get(`/api/preview?${new URLSearchParams({ secret: PREVIEW_SECRET, uid: 'api::schedule-event.schedule-event', documentId: 'abcdefghijklmnopqrstuvwx', locale: 'en', status: 'draft' })}`);
    assert.equal(enter.status, 307, 'Draft Mode entered through the real preview route');
    const bypass = (enter.headers.getSetCookie?.() ?? []).find(c => c.startsWith('__prerender_bypass='))?.split(';')[0];
    assert.ok(bypass, 'Draft Mode cookie set');
    for (const path of ['/en/alumni', '/tr/mezunlar']) {
      const drafted = await get(path, { headers: { Cookie: bypass } });
      assert.equal(drafted.status, 200, `${path} works under another section's Draft Mode`);
      const html = await drafted.text();
      assert.ok(!html.includes('DRAFT-ONLY-ALUMNUS'), `${path}: still no draft under Draft Mode`);
      assert.equal((html.match(/<li class="[^"]*card/g) ?? []).length, count, `${path}: same published directory under Draft Mode`);
    }
    const budgets = await run(resolve(root, 'scripts/checks/budgets.mjs'), [], root);
    assert.equal(budgets.code, 0, 'budgets');
    await stop();
  }
  console.log('Alumni production routes passed: consent canary fails the build, empty/populated, published-only, no consent in any page, portraits suppressed without consent, LinkedIn allow-list, grouping, Turkish fallback, metadata, lang, navigation, 404s, sitemap exclusion, static requests, Draft Mode isolation and budgets.');
} finally { await stop(); await new Promise(accept => cms.close(accept)); }
