// Real-Strapi check for openspec/changes/cms-draft-guard: draft content is readable
// through the Content API only with an API token. Boots THIS repository's apps/cms against
// a THROWAWAY database (DATABASE_URL, required), with random per-run secrets. Creates only
// synthetic records and one in-memory API token whose value is never printed.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const cmsRoot = resolve(import.meta.dirname, '../../apps/cms');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to a THROWAWAY Postgres database. Never production.');
const rnd = () => randomBytes(24).toString('base64');
Object.assign(process.env, {
  NODE_ENV: 'development', DATABASE_CLIENT: 'postgres', DATABASE_SSL: 'false', HOST: '127.0.0.1',
  PORT: process.env.PORT ?? '13380', APP_KEYS: `${rnd()},${rnd()}`, API_TOKEN_SALT: rnd(), ADMIN_JWT_SECRET: rnd(),
  TRANSFER_TOKEN_SALT: rnd(), JWT_SECRET: rnd(), ENCRYPTION_KEY: rnd(),
});
process.chdir(cmsRoot);
const { createStrapi, compileStrapi } = createRequire(resolve(cmsRoot, 'package.json'))('@strapi/strapi');
const app = await createStrapi({ ...(await compileStrapi()), serveAdminPanel: false }).load();
try {
  const SE = 'api::schedule-event.schedule-event';
  const AL = 'api::alumnus.alumnus';
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  for (const uid of [SE, AL]) for (const action of ['find', 'findOne']) {
    await strapi.db.query('plugin::users-permissions.permission').create({ data: { action: `${uid}.${action}`, role: role.id } });
  }
  const draft = await strapi.documents(SE).create({ data: { title: 'SYNTH-DRAFT-ONLY', startsAt: '2099-01-01T10:00:00.000Z', type: 'other' }, locale: 'en' });
  const pub = await strapi.documents(SE).create({ data: { title: 'SYNTH-PUBLISHED', startsAt: '2099-01-02T10:00:00.000Z', type: 'other' }, locale: 'en' });
  await strapi.documents(SE).publish({ documentId: pub.documentId, locale: 'en' });
  const alumnus = await strapi.documents(AL).create({ data: { name: 'SYNTH-ALUMNUS-DRAFT' }, locale: 'en' });
  const { accessKey } = await strapi.admin.services['api-token'].create({
    name: `cms-drafts-check-${Date.now()}`, description: 'synthetic test token', type: 'custom', lifespan: null,
    permissions: [`${SE}.find`, `${SE}.findOne`],
  });
  // Server-side code (no request) keeps draft access.
  const serverSide = await strapi.documents(SE).findMany({ status: 'draft', locale: 'en' });
  assert.ok(serverSide.some((d) => d.title === 'SYNTH-DRAFT-ONLY'), 'server-side draft read');

  await app.listen();
  const base = `http://127.0.0.1:${process.env.PORT}`;
  const get = async (path, token) => {
    const response = await fetch(base + path, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    const text = await response.text();
    return { status: response.status, text };
  };
  const results = [];
  const check = async (label, path, token, expect) => {
    const r = await get(path, token);
    expect(r);
    results.push(`${label}: ${r.status}`);
  };
  await check('public list', '/api/schedule-events', undefined, (r) => { assert.equal(r.status, 200); assert.match(r.text, /SYNTH-PUBLISHED/); assert.doesNotMatch(r.text, /SYNTH-DRAFT-ONLY/); });
  await check('public ?status=published', '/api/schedule-events?status=published', undefined, (r) => { assert.equal(r.status, 200); assert.match(r.text, /SYNTH-PUBLISHED/); assert.doesNotMatch(r.text, /SYNTH-DRAFT-ONLY/); });
  await check('public ?status=draft', '/api/schedule-events?status=draft', undefined, (r) => { assert.equal(r.status, 403); assert.doesNotMatch(r.text, /SYNTH-DRAFT-ONLY/); });
  await check('public single ?status=draft', `/api/schedule-events/${draft.documentId}?status=draft`, undefined, (r) => { assert.equal(r.status, 403); assert.doesNotMatch(r.text, /SYNTH-DRAFT-ONLY/); });
  await check('public alumni ?status=draft', '/api/alumni?status=draft', undefined, (r) => { assert.equal(r.status, 403); assert.doesNotMatch(r.text, /SYNTH-ALUMNUS/); });
  await check('public alumni single ?status=draft', `/api/alumni/${alumnus.documentId}?status=draft`, undefined, (r) => { assert.equal(r.status, 403); assert.doesNotMatch(r.text, /SYNTH-ALUMNUS/); });
  await check('bogus token ?status=draft', '/api/schedule-events?status=draft', 'not-a-real-token', (r) => { assert.ok([401, 403].includes(r.status), `got ${r.status}`); assert.doesNotMatch(r.text, /SYNTH-DRAFT-ONLY/); });
  await check('API token ?status=draft', '/api/schedule-events?status=draft', accessKey, (r) => { assert.equal(r.status, 200); assert.match(r.text, /SYNTH-DRAFT-ONLY/); });
  await check('API token published', '/api/schedule-events', accessKey, (r) => { assert.equal(r.status, 200); assert.doesNotMatch(r.text, /SYNTH-DRAFT-ONLY/); });
  for (const line of results) console.log(`PASS ${line}`);
  console.log('cms-draft-guard check passed: drafts are API-token-only on the Content API; published reads, token reads and server-side reads unchanged.');
} finally {
  await app.destroy();
}
process.exit(0);
