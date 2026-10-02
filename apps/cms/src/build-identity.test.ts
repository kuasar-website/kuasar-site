import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { readBuildCommit, versionHandler, type VersionContext } from './build-identity.ts';

const SHA = '0123456789abcdef0123456789abcdef01234567';

function withFile(content: string | null, run: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'build-identity-'));
  const path = join(dir, 'BUILD_COMMIT');
  if (content !== null) writeFileSync(path, content);
  try { run(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function respond(commit: string | null) {
  const headers: Record<string, string> = {};
  const ctx: VersionContext = { set: (k, v) => { headers[k] = v; }, status: 404, body: undefined };
  versionHandler(commit)(ctx);
  return { status: ctx.status, body: ctx.body, headers };
}

test('reads a full lower-case SHA, tolerating the trailing newline the Dockerfile writes', () => {
  withFile(`${SHA}\n`, (path) => assert.equal(readBuildCommit(path), SHA));
});

test('missing, empty, short, upper-case or malformed identity is null', () => {
  withFile(null, (path) => assert.equal(readBuildCommit(path), null));
  for (const bad of ['', '\n', SHA.slice(0, 7), SHA.toUpperCase(), `${SHA}0`, `${SHA.slice(0, 39)}g`, `sha-${SHA}`, `${SHA} extra`]) {
    withFile(bad, (path) => assert.equal(readBuildCommit(path), null, JSON.stringify(bad)));
  }
});

test('known commit → 200 with exactly { commit } and no-store', () => {
  const r = respond(SHA);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { commit: SHA });
  assert.deepEqual(Object.keys(r.body as object), ['commit']);
  assert.equal(r.headers['Cache-Control'], 'no-store');
});

test('unknown or invalid commit → 503 with { commit: null } and no-store', () => {
  for (const commit of [null, 'not-a-sha', SHA.toUpperCase()]) {
    const r = respond(commit);
    assert.equal(r.status, 503);
    assert.deepEqual(r.body, { commit: null });
    assert.equal(r.headers['Cache-Control'], 'no-store');
  }
});
