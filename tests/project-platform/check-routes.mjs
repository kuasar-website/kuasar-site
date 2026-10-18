// Tests the real production Project Platform routes (/en/projects, /tr/projeler) against a
// local, synthetic Strapi REST server: one production build per scenario, plus one build that
// must fail. No CMS records or environment secrets are read or modified.
// Contract: openspec/changes/project-platform-page/specs/project-platform-page/spec.md.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { rm, readFile } from 'node:fs/promises';

const root = resolve(import.meta.dirname, '../..');
const webRoot = resolve(root, 'apps/web');
const next = createRequire(resolve(webRoot, 'package.json')).resolve('next/dist/bin/next');
const SITE = 'https://projects.example';
const PORT = 4208;
const PUBLISHED = '2026-10-01T09:00:00.000Z';
const cover = { image: { url: 'https://media.kuasar.org/platform-cover.jpg', width: 1600, height: 900 }, altEn: 'Satellite model on a bench', altTr: 'Tezgâhtaki uydu modeli' };

const entry = (locale, extra = {}) => ({
  documentId: 'platform00000000000000', locale, publishedAt: PUBLISHED,
  intro: `${locale === 'tr' ? 'TR-INTRO' : 'EN-INTRO'}: the platform for **non-rocket** projects.\n\n<script>alert(1)</script>`,
  whatsappUrl: 'https://chat.whatsapp.com/DummyInvite0', whatsappLabel: null, features: [], ...extra,
});
const feature = (title) => ({ id: title.length, title, description: `${title} description` });
const project = (documentId, locale, extra = {}) => ({
  documentId, locale, publishedAt: PUBLISHED, title: `${locale} ${documentId}`, summary: `${documentId} summary in ${locale}`,
  coverImage: null, startYear: 2025, endYear: null, projectStatus: 'current', applicationUrl: null, ...extra,
});

/** Each scenario: the single type per locale (absent = 404 NotFoundError) and projects per locale. */
const SCENARIOS = {
  // Nothing published at all.
  empty: { pages: {}, projects: {} },
  // English-only page entry, zero features, an invalid WhatsApp link; no projects.
  'page-only': {
    pages: { en: entry('en', { whatsappUrl: 'http://chat.whatsapp.com/Insecure0' }) },
    projects: {},
  },
  // Everything: both locales, every card shape.
  populated: {
    pages: {
      en: entry('en', { features: ['Project Sharing', 'Team Formation', 'Project Development', 'Project Support'].map(feature) }),
      tr: entry('tr', { whatsappLabel: 'Gruba katıl', features: ['Takım Kurma', 'Proje Paylaşımı', 'Proje Desteği'].map(feature) }),
    },
    projects: {
      en: [
        project('alpha', 'en', { title: 'Alpha Probe', startYear: 2026, coverImage: cover, applicationUrl: 'https://forms.gle/AlphaApply' }),
        project('beta', 'en', { title: 'Beta Balloon', startYear: 2026 }),
        project('gamma', 'en', { title: 'Gamma Glider', startYear: 2024, endYear: 2026, applicationUrl: 'http://forms.gle/Insecure' }),
        project('delta', 'en', { title: 'Delta Dish', projectStatus: 'past', startYear: 2025, endYear: 2025, applicationUrl: 'https://forms.gle/PastApply', coverImage: cover }),
        project('epsilon', 'en', { title: 'Epsilon Engine Test', projectStatus: 'past', startYear: 2022 }),
        project('draft', 'en', { title: 'DRAFT-ONLY-SECRET', publishedAt: null }),
      ],
      tr: [
        project('alpha', 'tr', { title: 'Alfa Sondası', startYear: 2026, coverImage: cover, applicationUrl: 'https://forms.gle/AlphaApply' }),
        project('trOnly', 'tr', { title: 'TURKISH-ONLY-PROJECT', startYear: 2023 }),
      ],
    },
  },
};

let scenario = 'empty';
let requests = 0;
let server;
const cms = createServer((request, response) => {
  requests++;
  const url = new URL(request.url, 'http://localhost');
  assert.equal(url.searchParams.get('status'), 'published', `${url.pathname} must request published content only`);
  const locale = url.searchParams.get('locale');
  const json = (status, body) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body)); };
  const state = typeof scenario === 'string' ? SCENARIOS[scenario] : scenario;
  if (url.pathname === '/api/project-platform') {
    assert.equal(url.searchParams.get('populate[features]'), 'true', 'features are populated');
    const single = state.pages[locale];
    return single ? json(200, { data: single, meta: {} }) : json(404, { data: null, error: { status: 404, name: 'NotFoundError', message: 'Not Found', details: {} } });
  }
  const page = Number(url.searchParams.get('pagination[page]') || 1);
  const data = url.pathname === '/api/platform-projects' ? state.projects[locale] ?? [] : [];
  if (url.pathname === '/api/platform-projects') assert.equal(url.searchParams.get('populate[coverImage][populate][image]'), 'true');
  json(200, { data: page === 1 ? data : [], meta: { pagination: { page, pageCount: data.length ? 1 : 0 } } });
});
await new Promise(accept => cms.listen(0, '127.0.0.1', accept));
const PREVIEW_SECRET = 'project-platform-check-preview-secret';
const env = { ...process.env, STRAPI_URL: `http://127.0.0.1:${cms.address().port}`, STRAPI_API_TOKEN: '', NEXT_PUBLIC_SITE_URL: SITE, PREVIEW_SECRET, STRAPI_PREVIEW_TOKEN: 'project-platform-check-preview-token' };

function run(file, args, cwd, { capture = false } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let output = '';
    if (capture) for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? accept(output) : reject(Object.assign(new Error(`Command failed: ${code}`), { output }))));
  });
}
async function stop() {
  if (!server) return;
  const child = server; server = undefined;
  await new Promise(accept => { child.once('exit', accept); child.kill('SIGTERM'); });
}
const get = path => fetch(`http://127.0.0.1:${PORT}${path}`, { redirect: 'manual' });
const count = (html, pattern) => (html.match(pattern) ?? []).length;
/** The HTML of one section, from its h2 to the next section or the end of main. */
function section(html, id) {
  const start = html.indexOf(`id="${id}"`);
  assert.ok(start >= 0, `section ${id} exists`);
  const end = html.indexOf('<section', start);
  return html.slice(start, end < 0 ? html.indexOf('</main>', start) : end);
}
function cards(html) {
  return [...html.matchAll(/<article[^>]*data-project="([^"]+)"[^>]*lang="([^"]+)"/g)].map(m => ({ id: m[1], lang: m[2] }));
}

async function build() {
  await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
  await run(next, ['build'], webRoot);
  const manifest = JSON.parse(await readFile(resolve(webRoot, '.next/prerender-manifest.json'), 'utf8'));
  for (const path of ['/en/projects', '/tr/projeler']) {
    assert.ok(manifest.routes[path], `${path} must be prerendered`);
    assert.equal(manifest.routes[path].initialRevalidateSeconds, false, `${path} has no time-based revalidation`);
  }
  server = spawn(process.execPath, [next, 'start', '-p', String(PORT), '-H', '127.0.0.1'], { cwd: webRoot, env, stdio: 'inherit' });
  for (let i = 0; i < 200; i++) {
    try { await fetch(`http://127.0.0.1:${PORT}/robots.txt`); return; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  assert.fail('Next server started');
}

/** Checks every scenario shares: routes, metadata, lang, navigation, switcher, 404s, escaping, static. */
async function common(atBuild) {
  const pages = {};
  for (const [locale, path, other, heading, nav] of [
    ['en', '/en/projects', '/tr/projeler', 'Project Platform', 'Project Platform'],
    ['tr', '/tr/projeler', '/en/projects', 'Proje Platformu', 'Proje Platformu'],
  ]) {
    const response = await get(path);
    assert.equal(response.status, 200, `${path} resolves`);
    const html = await response.text();
    pages[locale] = html;
    assert.match(html, new RegExp(`<html[^>]*\\blang="${locale}"`), `${path} server-renders lang="${locale}"`);
    assert.match(html, new RegExp(`<title>${heading} \\| KUASAR</title>`), `${path} title`);
    assert.match(html, new RegExp(`<h1[^>]*>${heading}</h1>`), `${path} heading is the full product name`);
    assert.ok(html.includes(`rel="canonical" href="${SITE}${path}"`), `${path} canonical is itself`);
    assert.ok(html.includes(`hrefLang="${locale === 'en' ? 'tr' : 'en'}" href="${SITE}${other}"`), `${path} hreflang alternate`);
    assert.ok(html.includes(`hrefLang="x-default" href="${SITE}/en/projects"`), `${path} x-default is English`);
    assert.ok(html.includes(`href="${path}">${nav}</a>`), `${path}: navigation entry "${nav}"`);
    // The language switcher is the only same-site link to the other locale's page.
    assert.match(html, new RegExp(`<a href="${other}" hrefLang="${locale === 'en' ? 'tr' : 'en'}"`), `${path}: switcher targets ${other}`);
    assert.ok(!html.includes('DRAFT-ONLY-SECRET'), `${path}: a draft is never public`);
    assert.ok(!html.includes('<script>alert(1)</script>'), `${path}: intro HTML is escaped, never injected`);
    assert.doesNotMatch(html, /data-time-state=/, `${path}: years carry no client time state`);
    assert.doesNotMatch(html, /noindex/, `${path} is indexable`);
  }
  for (const path of ['/tr/projects', '/en/projeler', '/en/projects/alpha']) {
    assert.equal((await get(path)).status, 404, `${path} is not a route`);
  }
  assert.ok((await (await get('/tr')).text()).includes('href="/tr/projeler">Proje Platformu</a>'), 'Turkish home navigation links here');
  assert.ok((await (await get('/en')).text()).includes('href="/en/projects">Project Platform</a>'), 'English home navigation links here');
  return pages;
}

async function sitemapHas() {
  const sitemap = await (await get('/sitemap.xml')).text();
  return { en: sitemap.includes(`<loc>${SITE}/en/projects</loc>`), tr: sitemap.includes(`<loc>${SITE}/tr/projeler</loc>`) };
}

try {
  // 1. Nothing published: the page still renders, with both empty states.
  scenario = 'empty';
  await build();
  let atBuild = requests;
  let pages = await common(atBuild);
  for (const [locale, html] of Object.entries(pages)) {
    assert.ok(!html.includes('-INTRO'), `${locale}: no intro without the entry`);
    assert.ok(!html.includes('chat.whatsapp.com'), `${locale}: no WhatsApp button without the entry`);
    assert.ok(!html.includes('project-platform-functions'), `${locale}: no functions section without the entry`);
    assert.equal(count(html, /<article\b/g), 0, `${locale}: no project cards`);
    assert.ok(section(html, 'project-platform-current').includes(locale === 'tr' ? 'Şu anda güncel proje yok.' : 'There are no current projects right now.'), `${locale}: current empty state`);
    assert.ok(section(html, 'project-platform-past').includes(locale === 'tr' ? 'Henüz geçmiş proje yok.' : 'There are no past projects yet.'), `${locale}: past empty state`);
  }
  assert.deepEqual(await sitemapHas(), { en: false, tr: false }, 'an empty page is not in the sitemap');
  assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
  await run(resolve(root, 'scripts/checks/budgets.mjs'), [], root);
  await stop();

  // 2. English-only entry with zero features and an invalid WhatsApp link; no projects.
  scenario = 'page-only';
  await build();
  atBuild = requests;
  pages = await common(atBuild);
  for (const [locale, html] of Object.entries(pages)) {
    assert.match(html, /<div[^>]*lang="en"[^>]*>[\s\S]*?EN-INTRO/, `${locale}: the English intro, marked lang="en"`);
    assert.ok(html.includes('<strong>non-rocket</strong>'), `${locale}: intro Markdown rendered`);
    assert.ok(!html.includes('whatsapp.com'), `${locale}: an invalid WhatsApp link shows no button`);
    assert.ok(!html.includes('project-platform-functions'), `${locale}: zero features, no functions section`);
    assert.equal(count(html, /<article\b/g), 0);
  }
  assert.deepEqual(await sitemapHas(), { en: true, tr: true }, 'a published entry puts both locales in the sitemap');
  assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
  await stop();

  // 3. Populated, both locales.
  scenario = 'populated';
  await build();
  atBuild = requests;
  pages = await common(atBuild);
  const en = pages.en;
  const tr = pages.tr;
  // Intro and WhatsApp.
  assert.ok(en.includes('EN-INTRO') && !en.includes('TR-INTRO'), '/en: English intro');
  assert.ok(tr.includes('TR-INTRO'), '/tr: Turkish intro');
  assert.match(en, /<a [^>]*target="_blank"[^>]*href="https:\/\/chat\.whatsapp\.com\/DummyInvite0"[^>]*><span>Join the Project Platform WhatsApp group/, '/en: default WhatsApp label, new tab');
  assert.ok(en.includes('aria-label="Join the Project Platform WhatsApp group (opens in a new tab)"'), '/en: WhatsApp accessible name');
  assert.match(tr, /Gruba katıl/, '/tr: the editor label');
  assert.ok(!tr.includes('Proje Platformu WhatsApp grubuna katıl'), '/tr: the editor label replaces the default');
  // Functions, in each locale's order.
  const functionTitles = html => [...section(html, 'project-platform-functions').matchAll(/<h3>([^<]+)<\/h3>/g)].map(m => m[1]);
  assert.deepEqual(functionTitles(en), ['Project Sharing', 'Team Formation', 'Project Development', 'Project Support']);
  assert.deepEqual(functionTitles(tr), ['Takım Kurma', 'Proje Paylaşımı', 'Proje Desteği']);
  assert.match(section(en, 'project-platform-functions'), /Platform functions/);
  assert.match(section(tr, 'project-platform-functions'), /Platform işlevleri/);
  // Current and past, ordered by startYear then title, with lang per card.
  assert.deepEqual(cards(section(en, 'project-platform-current')), [
    { id: 'alpha', lang: 'en' }, { id: 'beta', lang: 'en' }, { id: 'gamma', lang: 'en' },
  ], '/en current: 2026 Alpha, 2026 Beta, then 2024');
  assert.deepEqual(cards(section(en, 'project-platform-past')), [{ id: 'delta', lang: 'en' }, { id: 'epsilon', lang: 'en' }]);
  assert.deepEqual(cards(section(tr, 'project-platform-current')), [
    { id: 'alpha', lang: 'tr' }, { id: 'beta', lang: 'en' }, { id: 'gamma', lang: 'en' }, { id: 'trOnly', lang: 'tr' },
  ], '/tr current: Turkish where published, English fallback marked lang="en"');
  assert.ok(tr.includes('Alfa Sondası') && tr.includes('TURKISH-ONLY-PROJECT'), '/tr: Turkish variants');
  assert.ok(!en.includes('TURKISH-ONLY-PROJECT') && !en.includes('Alfa Sondası'), '/en never shows Turkish');
  // Years.
  for (const html of [en, tr]) {
    const years = [...html.matchAll(/data-project="([^"]+)"[\s\S]*?<p class="[^"]*years[^"]*">([^<]+)<\/p>/g)].map(m => `${m[1]}:${m[2]}`);
    assert.ok(years.includes('alpha:2026') && years.includes('gamma:2024–2026') && years.includes('delta:2025') && years.includes('epsilon:2022'), `years: ${years}`);
  }
  // Apply only on a current project with a valid HTTPS link.
  assert.equal(count(en, /href="https:\/\/forms\.gle\/AlphaApply"/g), 1, '/en: Apply on Alpha');
  assert.ok(en.includes('aria-label="Apply to Alpha Probe (opens in a new tab)"') && en.includes('<span>Apply<!-- --> <span aria-hidden'), '/en: Apply label');
  assert.ok(tr.includes('aria-label="Alfa Sondası projesine başvur (yeni sekmede açılır)"') && tr.includes('<span>Başvur<!-- --> <span aria-hidden'), '/tr: Başvur label');
  assert.ok(!en.includes('forms.gle/Insecure') && !tr.includes('forms.gle/Insecure'), 'an invalid application link shows no button');
  assert.ok(!en.includes('PastApply') && !tr.includes('PastApply'), 'a past project never shows Apply');
  assert.equal(count(section(en, 'project-platform-current'), /<span>Apply<!-- -->/g), 1, 'only one Apply on /en');
  // Covers: through the media loader, alt in the visitor's locale; no slot without a cover.
  assert.ok(en.includes('https://media.kuasar.org/cdn-cgi/image/'), 'cover image through the media loader');
  assert.ok(en.includes('alt="Satellite model on a bench"') && tr.includes('alt="Tezgâhtaki uydu modeli"'), 'alt text in the visitor locale');
  assert.match(en, /<article class="[^"]*has-cover[^"]*" data-project="alpha"/, 'covered card');
  assert.match(en, /<article class="[^"]*" data-project="beta"/, 'text-only card');
  assert.doesNotMatch(en, /<article class="[^"]*has-cover[^"]*" data-project="beta"/, 'no slot without a cover');
  assert.deepEqual(await sitemapHas(), { en: true, tr: true }, 'populated pages are in the sitemap');
  const sitemap = await (await get('/sitemap.xml')).text();
  assert.ok(sitemap.includes(`hreflang="tr" href="${SITE}/tr/projeler"`), 'sitemap alternates');
  assert.equal(requests, atBuild, 'visiting built pages must not fetch Strapi');
  // An editor previewing another section carries a Draft Mode cookie. This page has no preview
  // and must still serve published content to them: 200, no draft, no error.
  const enter = await get(`/api/preview?${new URLSearchParams({ secret: PREVIEW_SECRET, uid: 'api::schedule-event.schedule-event', documentId: 'abcdefghijklmnopqrstuvwx', locale: 'en', status: 'draft' })}`);
  assert.equal(enter.status, 307, 'Draft Mode entered through the real preview route');
  const bypass = (enter.headers.getSetCookie?.() ?? []).find(c => c.startsWith('__prerender_bypass='))?.split(';')[0];
  assert.ok(bypass, 'Draft Mode cookie set');
  for (const path of ['/en/projects', '/tr/projeler']) {
    const drafted = await fetch(`http://127.0.0.1:${PORT}${path}`, { headers: { Cookie: bypass } });
    assert.equal(drafted.status, 200, `${path} works under another section's Draft Mode`);
    assert.ok(!(await drafted.text()).includes('DRAFT-ONLY-SECRET'), `${path}: still no draft under Draft Mode`);
  }
  await run(resolve(root, 'scripts/checks/budgets.mjs'), [], root);
  // No client JS of its own: the route loads exactly the chunks News does (another static,
  // server-only CMS page using MediaImage). Importing through the components/ui barrel once
  // pulled the Reveal client component in here; this catches that kind of regression.
  const bundles = Object.fromEntries(JSON.parse(await readFile(resolve(webRoot, '.next/diagnostics/route-bundle-stats.json'), 'utf8')).map(r => [r.route, new Set(r.firstLoadChunkPaths)]));
  for (const route of ['/[locale]/projects', '/[locale]/projeler']) {
    assert.deepEqual([...bundles[route]].sort(), [...bundles['/[locale]/news']].sort(), `${route} ships no client JS beyond what News ships`);
  }
  await stop();

  // 4. An end year before the start year fails the build, naming the project and field.
  scenario = { pages: {}, projects: { en: [project('broken', 'en', { startYear: 2026, endYear: 2024 })] } };
  await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
  const failure = await run(next, ['build'], webRoot, { capture: true }).then(() => null, error => error);
  assert.ok(failure, 'a malformed year range must fail the build');
  assert.match(failure.output, /Platform Project broken \(en\) field "endYear": 2024 is before startYear 2026/, 'the error names the project and field');
  assert.match(failure.output, /docs\/ops\/cms-runbook\.md/, 'the error points at the runbook');

  console.log('Project Platform production routes passed: empty, entry-only, populated and malformed builds; published-only, Turkish fallback and lang, ordering, years, Apply rules, WhatsApp label and link rules, functions order, covers, metadata, navigation, switcher, 404s, sitemap, static requests, Draft Mode isolation and budgets.');
} finally { await stop(); await new Promise(accept => cms.close(accept)); }
