#!/usr/bin/env node
/**
 * Content-backup export entrypoint.
 *
 * Fetches every published entry, in both locales, for exactly the six
 * content types in content-types.mjs (`alumnus` is never in that list),
 * and writes one deterministic JSON file per content type to
 * `content/_snapshots/`.
 *
 * Every content type, in both locales, is fetched and reduced into memory
 * BEFORE anything is written to disk — a failure anywhere aborts the whole
 * run with a non-zero exit and writes nothing, rather than leaving a
 * partial set of files from a run that didn't finish. See
 * openspec/changes/content-backup/design.md, "One content type's export
 * failure fails the whole run."
 *
 * Required environment variables (see design.md, "Required secrets"):
 *   CMS_BASE_URL            - the production Strapi host, e.g. https://cms.kuasar.org
 *   CONTENT_BACKUP_API_TOKEN - a Strapi custom API token, find/findOne only,
 *                              scoped to exactly the six content types below
 *
 * Never logs either value, or the constructed Authorization header.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CONTENT_TYPES, LOCALES } from "./content-types.mjs";
import { fetchAllPages } from "./paginate.mjs";
import { reduceEntry } from "./transform.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.join(__dirname, "..", "..", "content", "_snapshots");

function compareEntries(a, b) {
  if (a.documentId !== b.documentId) {
    return a.documentId < b.documentId ? -1 : 1;
  }
  return a.locale < b.locale ? -1 : a.locale > b.locale ? 1 : 0;
}

/**
 * @param {object} env - injectable for tests; defaults to process.env
 * @param {typeof fetch} [fetchImpl] - injectable for tests
 * @returns {Promise<Map<string, object[]>>} pluralName -> sorted, reduced entries
 */
export async function collectSnapshots(env = process.env, fetchImpl = fetch) {
  const cmsBaseUrl = env.CMS_BASE_URL;
  const token = env.CONTENT_BACKUP_API_TOKEN;

  if (!cmsBaseUrl) {
    throw new Error("[content-snapshot] CMS_BASE_URL is required and was not set");
  }
  if (!token) {
    throw new Error("[content-snapshot] CONTENT_BACKUP_API_TOKEN is required and was not set");
  }

  const result = new Map();

  for (const contentType of CONTENT_TYPES) {
    const combined = [];
    for (const locale of LOCALES) {
      console.log(`[content-snapshot] Fetching ${contentType.uid} (${locale})...`);
      const rawEntries = await fetchAllPages({
        cmsBaseUrl,
        token,
        contentType,
        locale,
        fetchImpl,
      });
      for (const raw of rawEntries) {
        combined.push(reduceEntry(contentType.uid, raw, locale));
      }
    }
    combined.sort(compareEntries);
    result.set(contentType.pluralName, combined);
  }

  return result;
}

/**
 * Writes every collected snapshot to `<outputDir>/<pluralName>.json`.
 * Only called once every content type has already been fetched and reduced
 * successfully — see module docstring. `outputDir` defaults to the real
 * `content/_snapshots/` and is overridable so tests never touch the repo's
 * actual tracked `content/` directory.
 * @param {Map<string, object[]>} snapshots
 * @param {string} [outputDir]
 */
export async function writeSnapshots(snapshots, outputDir = SNAPSHOT_DIR) {
  await mkdir(outputDir, { recursive: true });
  for (const [pluralName, entries] of snapshots) {
    const filePath = path.join(outputDir, `${pluralName}.json`);
    await writeFile(filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  }
}

async function main() {
  const snapshots = await collectSnapshots();
  await writeSnapshots(snapshots);
  console.log(`[content-snapshot] Wrote ${snapshots.size} snapshot file(s).`);
}

// Only run when invoked directly (`node export.mjs`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
