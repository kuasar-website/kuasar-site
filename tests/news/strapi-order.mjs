// Real-Strapi regression for News ordering (openspec/changes/announcements, launch/news).
// Strapi 5 resets an entry's publishedAt every time it is republished (verified on 5.52.3:
// the published row is deleted and recreated). This proves the News order does NOT change
// when that happens, because it is keyed on the editor-set announcementDate.
// Boots THIS repository's apps/cms against a THROWAWAY database (DATABASE_URL, required),
// random per-run secrets, synthetic records only; reads through the real public REST API
// with the real News loader (lib/cms/announcements-data.ts).
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '../..');
const cmsRoot = resolve(repo, 'apps/cms');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to a THROWAWAY Postgres database. Never production.');
const rnd = () => randomBytes(24).toString('base64');
const PORT = process.env.PORT ?? '13382';
Object.assign(process.env, {
  NODE_ENV: 'development', DATABASE_CLIENT: 'postgres', DATABASE_SSL: 'false', HOST: '127.0.0.1', PORT,
  APP_KEYS: `${rnd()},${rnd()}`, API_TOKEN_SALT: rnd(), ADMIN_JWT_SECRET: rnd(), TRANSFER_TOKEN_SALT: rnd(), JWT_SECRET: rnd(), ENCRYPTION_KEY: rnd(),
});
const { fetchNewsData } = await import(resolve(repo, 'apps/web/lib/cms/announcements-data.ts'));
process.chdir(cmsRoot);
const { createStrapi, compileStrapi } = createRequire(resolve(cmsRoot, 'package.json'))('@strapi/strapi');
const AN = 'api::announcement.announcement';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let app;
try {
  app = await createStrapi({ ...(await compileStrapi()), serveAdminPanel: false }).load();
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  for (const action of ['find', 'findOne']) {
    await strapi.db.query('plugin::users-permissions.permission').create({ data: { action: `${AN}.${action}`, role: role.id } });
  }
  await app.listen();
  const origin = `http://127.0.0.1:${PORT}`;
  const order = async (locale = 'en') => (await fetchNewsData(locale, { origin })).map((item) => item.title);
  const restPublishedAt = async (title) => {
    const body = await (await fetch(`${origin}/api/announcements?locale=en&status=published&filters[title][$eq]=${encodeURIComponent(title)}`)).json();
    return body.data[0]?.publishedAt;
  };
  const make = async (title, announcementDate, extra = {}) => {
    const doc = await strapi.documents(AN).create({ locale: 'en', data: {
      title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), body: `Body of ${title}.`, announcementDate, ...extra,
    } });
    await strapi.documents(AN).publish({ documentId: doc.documentId, locale: 'en' });
    return doc;
  };
  const results = [];

  // announcementDate is required to publish.
  const undated = await strapi.documents(AN).create({ locale: 'en', data: { title: 'SYNTH-UNDATED', slug: 'synth-undated' } });
  await assert.rejects(strapi.documents(AN).publish({ documentId: undated.documentId, locale: 'en' }), 'publishing without announcementDate must fail');
  results.push('publish without announcementDate: rejected');

  const a = await make('SYNTH-A', '2026-09-01T09:00:00.000Z');
  await sleep(1200);
  await make('SYNTH-B', '2026-09-20T09:00:00.000Z');
  assert.deepEqual(await order(), ['SYNTH-B', 'SYNTH-A'], 'old A, newer B: B first');
  results.push('A then B: order B > A');

  const before = await restPublishedAt('SYNTH-A');
  const bPublishedAt = await restPublishedAt('SYNTH-B');
  await sleep(1200);
  await strapi.documents(AN).update({ documentId: a.documentId, locale: 'en', data: { body: 'Corrected body of SYNTH-A.' } });
  await strapi.documents(AN).publish({ documentId: a.documentId, locale: 'en' });
  const after = await restPublishedAt('SYNTH-A');
  assert.ok(Date.parse(after) > Date.parse(before), `Strapi reset A's publishedAt on republish (${before} -> ${after}); if not, revisit this check`);
  assert.ok(Date.parse(after) > Date.parse(bPublishedAt), "A's publishedAt is now newer than B's, so a publishedAt order would be wrong");
  assert.deepEqual(await order(), ['SYNTH-B', 'SYNTH-A'], 'after editing and republishing A, B is still first');
  const [itemB, itemA] = await fetchNewsData('en', { origin });
  assert.equal(itemA.announcementDate, '2026-09-01T09:00:00.000Z', "A's editorial date is unchanged");
  assert.equal(itemB.announcementDate, '2026-09-20T09:00:00.000Z');
  results.push(`republish A: publishedAt ${before} -> ${after} (Strapi resets it); order still B > A`);

  // Same calendar day, later time first; pinned overrides the date.
  await make('SYNTH-B-LATER', '2026-09-20T15:30:00.000Z');
  await make('SYNTH-PINNED-OLD', '2025-01-01T09:00:00.000Z', { pinned: true });
  assert.deepEqual(await order(), ['SYNTH-PINNED-OLD', 'SYNTH-B-LATER', 'SYNTH-B', 'SYNTH-A'], 'pinned, then same day later first');
  assert.deepEqual(await order('tr'), ['SYNTH-PINNED-OLD', 'SYNTH-B-LATER', 'SYNTH-B', 'SYNTH-A'], 'Turkish falls back with the same order');
  results.push('same day: 18:30 before 12:00; pinned first; same order on /tr');

  for (const line of results) console.log(`PASS ${line}`);
  console.log('News ordering check passed: announcementDate orders News; Strapi resetting publishedAt on republish does not move an announcement.');
} finally {
  if (app) await app.destroy();
}
process.exit(0);
