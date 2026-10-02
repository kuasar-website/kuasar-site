import { readFileSync } from 'node:fs';

/**
 * Build identity for `GET /_version` (openspec/changes/cms-deploy-digest, design D3/D4).
 *
 * The CMS image carries the exact commit it was built from in `/app/BUILD_COMMIT`, written
 * by apps/cms/Dockerfile from the `APP_COMMIT_SHA` build argument (`github.sha`). It is a
 * FILE, not an environment variable, so App Platform configuration can never override it:
 * it changes only when the image changes, which is exactly what the deploy workflow checks.
 *
 * The response is deliberately nothing but `{ "commit": … }`. The repository is public, so
 * the commit reveals only WHICH public commit is live (design D6). No database, content,
 * authentication state or environment variable is read to answer.
 */
export const BUILD_COMMIT_FILE = 'BUILD_COMMIT';
const FULL_SHA = /^[0-9a-f]{40}$/;

/** The baked commit, or null when the file is missing, empty or not a full lower-case SHA. */
export function readBuildCommit(path: string): string | null {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  const commit = raw.trim();
  return FULL_SHA.test(commit) ? commit : null;
}

/** The subset of Koa's context this handler touches. */
export type VersionContext = {
  set(field: string, value: string): void;
  status: number;
  body: unknown;
};

/** 200 `{"commit":"<sha>"}` when known, otherwise 503 `{"commit":null}`; never cached. */
export function versionHandler(commit: string | null) {
  const known = commit !== null && FULL_SHA.test(commit);
  return (ctx: VersionContext): void => {
    ctx.set('Cache-Control', 'no-store');
    ctx.status = known ? 200 : 503;
    ctx.body = { commit: known ? commit : null };
  };
}
