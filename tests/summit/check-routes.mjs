// Tests the real production Galactic Summit routes against a local, synthetic Strapi REST server.
// No CMS records, media or environment secrets are read or modified.
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
const img = (alt) => ({ image: { url: 'https://media.kuasar.org/summit.jpg', width: 1600, height: 900 }, altEn: `${alt} EN`, altTr: `${alt} TR` });
const pdf = { url: 'https://media.kuasar.org/sponsorship.pdf', mime: 'application/pdf', ext: '.pdf' };
let scenario = 'zero';
let requests = 0;
let server;
function edition(locale, year, extra = {}) {
  return { documentId: `s${year}`, locale, publishedAt: '2026-01-01T00:00:00.000Z', year, isCurrent: false,
    date: `${year}-11-07T07:00:00.000Z`, location: 'SGKM', purpose: `${locale} purpose ${year}`,
    programme: [{ time: '10:00', title: `${locale} Opening ${year}`, description: null }],
    speakers: [{ speakerName: 'Çağrı Öztürk', role: 'Engineer', portrait: img('Portrait') }],
    photos: [img(`Photo ${year}`)], contactAddress: 'summit@kuasar.org', sponsorshipPdf: null, registrationUrl: null,
    accentToken: 'ember', heroTreatment: 'gradient', backgroundImage: null,
    // Returned even though never requested: it must still never render.
    sponsors: [{ name: 'Fixture Sponsor Corp', url: 'https://sponsor.example' }], ...extra };
}
function rows(locale) {
  // Turkish publishes only the current edition; others fall back to English.
  const all = {
    zero: () => [],
    one: () => [edition(locale, 2026, { isCurrent: true, sponsorshipPdf: pdf })],
    four: () => [2023, 2024, 2025, 2026].map((y) => edition(locale, y, { isCurrent: y === 2026, registrationUrl: y === 2026 ? 'https://forms.gle/fixture' : null })),
    'none-current': () => [edition(locale, 2025), edition(locale, 2026)],
    'two-current': () => [edition(locale, 2025, { isCurrent: true }), edition(locale, 2026, { isCurrent: true })],
    'bad-pdf': () => [edition(locale, 2026, { isCurrent: true, sponsorshipPdf: { ...pdf, url: 'https://pub-1.r2.dev/sponsorship.pdf' } })],
    'still-no-image': () => [edition(locale, 2026, { isCurrent: true, heroTreatment: 'still' })],
  }[scenario]();
  return locale === 'tr' ? all.filter((row) => row.isCurrent) : all;
}
const cms = createServer((request, response) => {
  requests++;
  const url = new URL(request.url, 'http://localhost');
  assert.equal(url.searchParams.get('status'), 'published');
  const page = Number(url.searchParams.get('pagination[page]'));
  if (url.pathname === '/api/galactic-summits') {
    assert.ok(![...url.searchParams.keys()].some((key) => key.startsWith('populate[sponsors]')), 'sponsors must never be populated');
  }
  const data = url.pathname === '/api/galactic-summits' ? rows(url.searchParams.get('locale')) : [];
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data: data.slice((page - 1) * 25, page * 25), meta: { pagination: { page, pageCount: Math.ceil(data.length / 25) } } }));
});
await new Promise(resolve => cms.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${cms.address().port}`;
const env = { ...process.env, STRAPI_URL: origin, STRAPI_API_TOKEN: '', NEXT_PUBLIC_SITE_URL: 'https://summit.example' };
async function run(file, args, cwd, { capture = false } = {}) {
  let output = '';
  const code = await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: capture ? 'pipe' : 'inherit' });
    if (capture) { child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; }); }
    child.on('error', reject); child.on('exit', accept);
  });
  return { code, output };
}
async function build() {
  await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
  return run(next, ['build'], webRoot, { capture: true });
}
async function stop() {
  if (!server) return;
  const child = server; server = undefined;
  await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); });
}
try {
  // Invalid CMS data fails the build loudly; nothing is chosen or rendered degraded.
  for (const [name, patterns] of [
    ['none-current', [/no published edition is current/, /2025 \(s2025\), 2026 \(s2026\)/]],
    ['two-current', [/more than one edition is current: 2025 \(s2025\), 2026 \(s2026\)/]],
    ['bad-pdf', [/field "sponsorshipPdf"/, /not on https:\/\/media\.kuasar\.org/]],
    ['still-no-image', [/heroTreatment "still" needs a backgroundImage/]],
  ]) {
    scenario = name;
    const { code, output } = await build();
    assert.notEqual(code, 0, `${name} must fail the build`);
    for (const pattern of patterns) assert.match(output, pattern, `${name}: ${pattern}`);
    assert.match(output, /docs\/ops\/cms-runbook\.md/);
  }

  for (scenario of ['zero', 'one', 'four']) {
    const built = await build();
    if (built.code !== 0) { console.error(built.output); throw new Error(`build failed for ${scenario}`); }
    const manifest = JSON.parse(await readFile(resolve(webRoot, '.next/prerender-manifest.json'), 'utf8'));
    for (const path of ['/en/galactic-summit', '/tr/galactic-summit']) {
      assert.ok(manifest.routes[path], `${path} must be prerendered`);
      assert.equal(manifest.routes[path].initialRevalidateSeconds, false);
    }
    const atBuild = requests;
    server = spawn(process.execPath, [next, 'start', '-p', '4198', '-H', '127.0.0.1'], { cwd: webRoot, env, stdio: 'inherit' });
    let ready = false;
    for (let i = 0; i < 200; i++) {
      try { await fetch('http://127.0.0.1:4198/en'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(ready, 'Next server started');
    for (const [locale, other] of [['en', '/tr/galactic-summit'], ['tr', '/en/galactic-summit']]) {
      const path = `/${locale}/galactic-summit`;
      const response = await fetch(`http://127.0.0.1:4198${path}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes('<title>Galactic Summit | KUASAR</title>'));
      assert.ok(html.includes(`rel="canonical" href="https://summit.example${path}"`));
      assert.ok(html.includes(`href="${other}" hrefLang=`), 'language switcher targets the other Summit route');
      // Time-neutral and sponsor-free server output.
      assert.doesNotMatch(html, /data-time-state=|>Upcoming<|>Live<|>Yaklaşan<|>Şimdi</);
      assert.doesNotMatch(html, /Fixture Sponsor Corp|sponsor\.example/);
      assert.doesNotMatch(html, /\bdisabled\b|aria-disabled/);
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
      if (scenario === 'zero') {
        assert.ok(html.includes(locale === 'tr' ? 'Bir sonraki Galactic Summit&#x27;in ayrıntıları yakında duyurulacak.' : 'Details of the next Galactic Summit will be announced soon.'));
        continue;
      }
      assert.ok(html.includes('dateTime="2026-11-07T07:00:00.000Z"'));
      assert.ok(html.includes(locale === 'tr' ? '7 Kasım 2026' : 'November 7, 2026'));
      assert.match(html, /<span lang="en">Galactic Summit<\/span> <!-- -->2026/);
      assert.ok(html.includes(locale === 'tr' ? 'Portrait TR' : 'Portrait EN'), 'alt text follows the page locale');
      if (scenario === 'one') {
        assert.ok(html.includes('href="https://media.kuasar.org/sponsorship.pdf"'), 'PDF is a plain link to the media host');
        assert.doesNotMatch(html, /cdn-cgi\/image\/[^"]*sponsorship\.pdf/);
        assert.ok(html.includes(locale === 'tr' ? 'İş ortağımız olun (PDF)' : 'Become a Partner (PDF)'));
        assert.ok(html.includes(locale === 'tr' ? 'Kayıtlar yakında' : 'Registration opens soon'));
        assert.doesNotMatch(html, /Diğer yıllar|Other editions/);
      } else {
        assert.ok(!html.includes('sponsorship.pdf'), 'no PDF, no partner link');
        assert.ok(html.includes('href="https://forms.gle/fixture"'));
        assert.ok(html.includes(locale === 'tr' ? 'Galactic Summit 2026 için kayıt ol (yeni sekmede açılır)' : 'Register for Galactic Summit 2026 (opens in a new tab)'));
        assert.equal((html.match(/<h3\b/g) ?? []).length, 3, 'three other editions in the archive');
        assert.ok(html.indexOf('>2025</h3>') < html.indexOf('>2023</h3>') || /2025[\s\S]*2024[\s\S]*2023/.test(html), 'archive newest first');
        if (locale === 'tr') assert.match(html, /<p[^>]*lang="en"[^>]*>en purpose 2025<\/p>/, 'English fallback marks its language');
      }
    }
    assert.equal((await fetch('http://127.0.0.1:4198/de/galactic-summit')).status, 404);
    const sitemap = await (await fetch('http://127.0.0.1:4198/sitemap.xml')).text();
    assert.ok(sitemap.includes('https://summit.example/en/galactic-summit'), 'Summit is in the sitemap even with zero editions');
    assert.ok(sitemap.includes('https://summit.example/tr/galactic-summit'));
    assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
    assert.equal((await run(resolve(root, 'scripts/checks/budgets.mjs'), [], root)).code, 0, 'route budgets');
    await stop();
  }
  console.log('Galactic Summit production routes passed: invariant/PDF/treatment build failures, zero/one/four editions, fallback, sponsors absent, metadata, switcher, sitemap, static requests and budgets.');
} finally { await stop(); await new Promise(resolve => cms.close(resolve)); }
