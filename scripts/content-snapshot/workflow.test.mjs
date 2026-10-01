import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A narrow text scanner, not a general YAML parser — the same "recognize a
// small fixed shape, treat anything else as absent rather than guessed at"
// approach scripts/checks/locale-parity.mjs already uses in this repo, not
// a new dependency.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = path.join(__dirname, "..", "..", ".github", "workflows", "content-snapshot.yml");

async function readWorkflow() {
  return readFile(WORKFLOW_PATH, "utf8");
}

test("content-snapshot.yml has a weekly schedule and workflow_dispatch", async () => {
  const yaml = await readWorkflow();
  assert.match(yaml, /^on:/m);
  assert.match(yaml, /schedule:/);
  assert.match(yaml, /cron:\s*"[^"]+"/);
  assert.match(yaml, /workflow_dispatch:/);
});

test("content-snapshot.yml declares exactly contents: write permission, nothing broader", async () => {
  const yaml = await readWorkflow();
  const permissionsBlock = yaml.match(/permissions:\n((?:\s{4,}.+\n)+)/);
  assert.ok(permissionsBlock, "expected a permissions: block in the job");
  const block = permissionsBlock[1];
  assert.match(block, /contents:\s*write/);
  assert.ok(!/packages:/.test(block), "must not grant packages permission");
  assert.ok(!/pull-requests:/.test(block), "must not grant pull-requests permission");
  assert.ok(!/id-token:/.test(block), "must not grant id-token permission");
});

test("content-snapshot.yml has the content-snapshot concurrency group with cancel-in-progress: false", async () => {
  const yaml = await readWorkflow();
  assert.match(yaml, /concurrency:\s*\n\s*group:\s*content-snapshot\s*\n\s*cancel-in-progress:\s*false/);
});

test("content-snapshot.yml only references the two approved secret names", async () => {
  const yaml = await readWorkflow();
  const secretRefs = [...yaml.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]);
  assert.ok(secretRefs.length > 0, "expected at least one secrets.* reference");
  for (const name of secretRefs) {
    assert.ok(
      ["CONTENT_BACKUP_API_TOKEN", "CMS_BASE_URL"].includes(name),
      `unexpected secret referenced: ${name}`,
    );
  }
});

test("content-snapshot.yml never echoes the token or the Authorization header", async () => {
  const yaml = await readWorkflow();
  assert.ok(!/echo.*CONTENT_BACKUP_API_TOKEN/i.test(yaml));
  assert.ok(!/echo.*Authorization/i.test(yaml));
});

test("content-snapshot.yml pushes only to content-snapshots, never to main", async () => {
  const yaml = await readWorkflow();
  assert.match(yaml, /content-snapshots/);
  assert.ok(!/push\s+origin\s+HEAD:main\b/.test(yaml));
  assert.ok(!/git\s+push\s+origin\s+main\b/.test(yaml));
});
