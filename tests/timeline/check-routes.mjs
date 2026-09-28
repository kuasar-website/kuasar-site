// Build-only fixture overlay. Always restore real content, even after a failed assertion.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
const root = resolve(import.meta.dirname, '../..');
const webRoot = join(root, 'apps/web');
const web = createRequire(join(webRoot, 'package.json'));
const next = web.resolve('next/dist/bin/next');
const content = join(root, 'content/timeline');
const temporary = await mkdtemp(join(tmpdir(), 'timeline-routes-'));
const backup = join(temporary, 'timeline');
const hadContent = existsSync(content);
const hadContentParent = existsSync(join(root, 'content'));
const siteUrl = 'https://timeline.example';
let server;
async function run(file, args, cwd) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd, env: { ...process.env, NEXT_PUBLIC_SITE_URL: siteUrl }, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? accept() : reject(new Error(`Command failed: ${code}`)));
  });
}
async function stop() {
  if (!server) return;
  const child = server; server = undefined;
  await new Promise((accept) => { child.once('exit', accept); child.kill('SIGTERM'); });
}
async function buildAndStart() {
  await run(next, ['build'], webRoot);
  server = spawn(process.execPath, [next, 'start', '-p', '4176', '-H', '127.0.0.1'], { cwd: webRoot, env: { ...process.env, NEXT_PUBLIC_SITE_URL: siteUrl }, stdio: 'inherit' });
  for (let i = 0; i < 200; i++) {
    try { await fetch('http://127.0.0.1:4176/'); return; } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error('Next route fixture did not start');
}
async function get(path, expectedStatus) {
  const response = await fetch(`http://127.0.0.1:4176${path}`);
  assert.equal(response.status, expectedStatus, path);
  return response.text();
}
try {
  if (hadContent) await rename(content, backup);
  await mkdir(content, { recursive: true });
  await buildAndStart();
  assert.match(await get('/en/timeline', 404), /Timeline not found/);
  assert.match(await get('/tr/zaman-cizelgesi', 404), /Zaman çizelgesi bulunamadı/);
  assert.doesNotMatch(await get('/sitemap.xml', 200), /<loc>/);
  await stop();
  for (let i = 0; i < 50; i++) {
    const folder = join(content, `fixture-${i}`);
    await mkdir(folder);
    await writeFile(join(folder, 'index.json'), JSON.stringify({ date: `2026-01-${String(i % 28 + 1).padStart(2, '0')}`, kind: 'milestone' }));
    for (const locale of ['en', 'tr']) await writeFile(join(folder, `${locale}.mdx`), `---\nslug: fixture-${i}\ntitle: ${locale} Fixture ${i}\n---\n${locale} **Caption** ${i}.`);
  }
  await buildAndStart();
  for (const [locale, segment, other] of [['en', 'timeline', '/tr/zaman-cizelgesi'], ['tr', 'zaman-cizelgesi', '/en/timeline']]) {
    const path = `/${locale}/${segment}`;
    const html = await get(path, 200);
    assert.match(html, new RegExp(`<link rel="canonical" href="${siteUrl}${path}"`));
    assert.match(html, new RegExp(`<link rel="alternate" hrefLang="${locale === 'en' ? 'tr' : 'en'}" href="${siteUrl}${other}"`));
    assert.match(html, new RegExp(`href="${other}" hrefLang=`));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.equal((html.match(/<time /g) || []).length, 50);
    assert.match(html, /<strong>Caption<\/strong>/);
  }
  await get('/tr/timeline', 404);
  await get('/en/zaman-cizelgesi', 404);
  const sitemap = await get('/sitemap.xml', 200);
  assert.ok(sitemap.includes(`${siteUrl}/en/timeline`));
  assert.ok(sitemap.includes(`${siteUrl}/tr/zaman-cizelgesi`));
  await run(join(root, 'scripts/checks/budgets.mjs'), [], root);
  console.log('Timeline production route checks passed: empty/populated, both locales, metadata, shell, switcher, sitemap and budgets.');
} finally {
  await stop();
  await rm(content, { recursive: true, force: true });
  if (hadContent) await rename(backup, content);
  if (!hadContentParent) await rmdir(join(root, 'content'));
  await rm(temporary, { recursive: true, force: true });
}
