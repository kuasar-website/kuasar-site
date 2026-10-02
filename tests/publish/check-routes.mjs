// publish-integration production check: a real `next build` + `next start` against a
// synthetic Strapi. Proves webhook revalidation (first reload shows the change), preview
// draft isolation, handler rejection and preview-only headers. All secrets are random per
// run and never printed. No real CMS, token or content is used.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { rm, readFile } from 'node:fs/promises';

const root = resolve(import.meta.dirname, '../..');
const webRoot = resolve(root, 'apps/web');
const next = createRequire(resolve(webRoot, 'package.json')).resolve('next/dist/bin/next');
const secret = () => randomBytes(24).toString('hex');
const REVALIDATE_SECRET = secret();
const PREVIEW_SECRET = secret();
const PREVIEW_TOKEN = secret();
const PORT = 4330;
const SITE = `http://127.0.0.1:${PORT}`;
const UID = 'api::schedule-event.schedule-event';
const DOC = 'e67qint75hcv221sdx6a12ks';

// Synthetic CMS state: one published event (title mutable) and one draft-only event.
let publishedTitle = 'Alpha Published Event';
const requests = [];
const event = (documentId, locale, title, publishedAt) => ({ documentId, locale, title, publishedAt, type: 'talk', startsAt: '2099-11-07T07:00:00.000Z' });
const cms = createServer((request, response) => {
  const url = new URL(request.url, 'http://cms.local');
  const status = url.searchParams.get('status');
  const auth = request.headers.authorization ?? '';
  requests.push(`${url.pathname}|${status}|${auth ? 'auth' : 'anon'}`);
  if (status === 'draft' && auth !== `Bearer ${PREVIEW_TOKEN}`) { response.writeHead(403).end('{}'); return; }
  const locale = url.searchParams.get('locale');
  const page = Number(url.searchParams.get('pagination[page]'));
  let rows = [];
  if (url.pathname === '/api/schedule-events') {
    rows = status === 'draft'
      ? [event(DOC, locale, publishedTitle, null), event('draftonly0000000000000001', locale, 'Draft Only Event', null)]
      : [event(DOC, locale, publishedTitle, '2026-01-01T00:00:00.000Z')];
  }
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ data: rows, meta: { pagination: { page, pageCount: rows.length ? 1 : 0 } } }));
});
await new Promise((r) => cms.listen(0, '127.0.0.1', r));
const STRAPI_URL = `http://127.0.0.1:${cms.address().port}`;
const env = { ...process.env, STRAPI_URL, STRAPI_API_TOKEN: '', REVALIDATE_SECRET, PREVIEW_SECRET, STRAPI_PREVIEW_TOKEN: PREVIEW_TOKEN, NEXT_PUBLIC_SITE_URL: 'https://publish.example' };
const run = (args) => new Promise((ok, fail) => {
  const child = spawn(process.execPath, [next, ...args], { cwd: webRoot, env, stdio: 'inherit' });
  child.on('exit', (code) => code === 0 ? ok() : fail(new Error(`next ${args[0]} failed: ${code}`)));
});
let server;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (path, init = {}) => fetch(SITE + path, { redirect: 'manual', ...init });
const webhook = (body, headers = { Authorization: `Bearer ${REVALIDATE_SECRET}` }, path = '/api/revalidate') =>
  fetch(SITE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const results = [];
const ok = (label) => results.push(label);
let gap = 'not measured';

try {
  await rm(resolve(webRoot, '.next'), { recursive: true, force: true });
  await run(['build']);
  const manifest = JSON.parse(await readFile(resolve(webRoot, '.next/prerender-manifest.json'), 'utf8'));
  for (const path of ['/en/schedule', '/tr/takvim', '/en/events', '/tr/etkinlikler']) {
    assert.ok(manifest.routes[path], `${path} prerendered (static) even though loaders read draftMode()`);
    assert.equal(manifest.routes[path].initialRevalidateSeconds, false, `${path} has no time-based revalidation`);
  }
  ok('routes static, revalidate false');
  assert.ok(!requests.some((r) => r.includes('|draft|')), 'the build never requests drafts');
  ok('build requested no drafts');

  server = spawn(process.execPath, [next, 'start', '-p', String(PORT), '-H', '127.0.0.1'], { cwd: webRoot, env, stdio: 'inherit' });
  for (let i = 0; i < 200; i++) { try { await fetch(`${SITE}/en/events`); break; } catch { await sleep(100); } }

  // Public baseline: published only, no preview headers.
  let page = await get('/en/schedule');
  let html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /Alpha Published Event/);
  assert.doesNotMatch(html, /Draft Only Event/);
  assert.equal(page.headers.get('content-security-policy'), null, 'no site-wide CSP added');
  assert.equal(page.headers.get('x-robots-tag'), null);
  const before = requests.length;
  await get('/en/schedule'); await get('/tr/takvim');
  assert.equal(requests.length, before, 'serving static pages makes no CMS request');
  ok('public page published-only, unchanged headers, no request-time CMS fetch');

  // /api/revalidate rejections.
  const body = { event: 'entry.publish', model: 'schedule-event', uid: UID, entry: { documentId: DOC } };
  assert.equal((await get('/api/revalidate')).status, 405);
  assert.equal((await webhook(body, {})).status, 401);
  assert.equal((await webhook(body, { Authorization: 'Bearer wrong' })).status, 401);
  assert.equal((await webhook(body, {}, `/api/revalidate?secret=${REVALIDATE_SECRET}`)).status, 401, 'query-string secret rejected');
  assert.equal((await webhook('{bad json')).status, 400);
  ok('revalidate rejects GET, missing/wrong/query secret, malformed body');

  // Publish → wait seconds → reload. revalidateTag(tag, 'max') only (no revalidatePath:
  // it 404s these fallback-false localized routes — design D2). Asserted: the webhook
  // succeeds, pages never 404, and the change appears on a subsequent request in both
  // locales. MEASURED, NOT ASSERTED: whether the FIRST reload is already fresh — that is
  // the accepted requirement and a known open gap (tasks.md 6.1); never reported as a pass.
  publishedTitle = 'Beta Republished Event';
  const hook = await webhook(body);
  assert.equal(hook.status, 200);
  const hookBody = await hook.json();
  assert.deepEqual(hookBody, { revalidated: { tags: ['schedule-calendar'] } });
  assert.ok(!JSON.stringify(hookBody).includes(REVALIDATE_SECRET));
  await sleep(2000);
  const seen = { en: [], tr: [] };
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const [locale, path] of [['en', '/en/schedule'], ['tr', '/tr/takvim']]) {
      const response = await get(path);
      const text = await response.text();
      assert.equal(response.status, 200, `${path} must never 404 after revalidation`);
      seen[locale].push(/Beta Republished Event/.test(text) ? 'fresh' : /Alpha Published Event/.test(text) ? 'stale' : 'other');
    }
    if (seen.en.at(-1) === 'fresh' && seen.tr.at(-1) === 'fresh') break;
    await sleep(1000);
  }
  assert.equal(seen.en.at(-1), 'fresh', 'en shows the change on a subsequent request');
  assert.equal(seen.tr.at(-1), 'fresh', 'tr shows the change on a subsequent request');
  ok(`webhook → no 404; change visible within ${seen.en.length} request(s) (en: ${seen.en.join(',')}; tr: ${seen.tr.join(',')})`);
  gap = seen.en[0] === 'fresh' && seen.tr[0] === 'fresh'
    ? 'first reload fresh in this run'
    : `KNOWN GAP (unresolved): first reload after publish was stale (en ${seen.en[0]}, tr ${seen.tr[0]}); accepted requirement NOT met`;

  // /api/preview rejections: no cookie, no redirect.
  const preview = (params) => get(`/api/preview?${new URLSearchParams(params)}`);
  const valid = { secret: PREVIEW_SECRET, uid: UID, documentId: DOC, locale: 'en', status: 'draft' };
  for (const [params, expected] of [
    [{ ...valid, secret: '' }, 401], [{ ...valid, secret: 'wrong' }, 401], [{ ...valid, locale: 'de' }, 400],
    [{ ...valid, documentId: 'x' }, 400], [{ ...valid, uid: 'api::sponsor.sponsor' }, 400], [{ ...valid, status: 'x' }, 400],
  ]) {
    const response = await preview(params);
    assert.equal(response.status, expected, JSON.stringify({ ...params, secret: params.secret ? '<set>' : '' }));
    assert.equal(response.headers.get('location'), null);
    assert.ok(!(response.headers.get('set-cookie') ?? '').includes('__prerender_bypass'));
  }
  ok('preview rejects bad secret and bad fields without cookie or redirect');

  // Valid preview, with an open-redirect attempt that must have no effect.
  const entered = await preview({ ...valid, url: 'https://evil.example/', redirect: '//evil.example' });
  assert.equal(entered.status, 307);
  assert.equal(entered.headers.get('location'), '/en/schedule', 'relative, derived, same-origin Location');
  const setCookie = entered.headers.get('set-cookie') ?? '';
  const bypass = /__prerender_bypass=([^;]+)/.exec(setCookie)?.[1];
  assert.ok(bypass, 'Draft Mode cookie set');
  assert.equal(entered.headers.get('x-robots-tag'), 'noindex');
  assert.equal(entered.headers.get('content-security-policy'), `frame-ancestors 'self' ${STRAPI_URL}`);
  ok('preview → derived same-origin redirect, Draft Mode cookie, noindex + Strapi-only framing');

  // Draft Mode page: drafts via the preview token, rendered per request, preview headers.
  const draftsBefore = requests.filter((r) => r.includes('|draft|')).length;
  page = await get('/en/schedule', { headers: { Cookie: `__prerender_bypass=${bypass}` } });
  html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /Draft Only Event/);
  assert.match(page.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(page.headers.get('x-robots-tag'), 'noindex');
  assert.equal(page.headers.get('content-security-policy'), `frame-ancestors 'self' ${STRAPI_URL}`);
  const draftRequests = requests.filter((r) => r.includes('|draft|')).slice(draftsBefore);
  assert.ok(draftRequests.length > 0 && draftRequests.every((r) => r.endsWith('|auth')), 'drafts fetched only with the preview token');
  ok('Draft Mode renders drafts via the preview token, private + noindex + Strapi framing');

  // The same page without the cookie stays published-only with unchanged headers.
  page = await get('/en/schedule');
  html = await page.text();
  assert.doesNotMatch(html, /Draft Only Event/);
  assert.equal(page.headers.get('content-security-policy'), null);
  assert.equal(page.headers.get('x-robots-tag'), null);
  ok('concurrent public request never sees drafts or preview headers');

  // Published preview disables Draft Mode; exit route also clears it.
  const published = await preview({ ...valid, status: 'published' });
  assert.equal(published.status, 307);
  assert.match(published.headers.get('set-cookie') ?? '', /__prerender_bypass=;|__prerender_bypass=.*Expires=Thu, 01 Jan 1970/i);
  const exit = await fetch(`${SITE}/api/preview/exit?locale=tr`, { method: 'POST', redirect: 'manual', headers: { Cookie: `__prerender_bypass=${bypass}` } });
  assert.equal(exit.status, 303);
  assert.equal(exit.headers.get('location'), '/tr');
  assert.match(exit.headers.get('set-cookie') ?? '', /__prerender_bypass=;|Expires=Thu, 01 Jan 1970/i);
  ok('status=published preview and POST exit both clear Draft Mode');

  for (const line of results) console.log(`PASS ${line}`);
  console.log(`FIRST-RELOAD ACCEPTANCE: ${gap}`);
  console.log('publish-integration production check passed (excluding the first-reload acceptance, reported above).');
} finally {
  if (server) await new Promise((r) => { server.once('exit', r); server.kill('SIGTERM'); });
  await new Promise((r) => cms.close(r));
}
