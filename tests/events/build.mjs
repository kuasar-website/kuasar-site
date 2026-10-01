import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const webRequire = createRequire(resolve('apps/web/package.json'));
export const directory = resolve('test-results/events-fixture');
export async function buildFixture() {
  await mkdir(directory, { recursive: true });
  await build({
    entryPoints: ['tests/events/fixture.tsx'], bundle: true,
    outfile: `${directory}/server.cjs`, jsx: 'automatic',
    platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'web-react', setup(builder) {
      builder.onResolve({ filter: /^next\// }, ({ path }) => ({ path: webRequire.resolve(path) }));
      builder.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, ({ path }) => ({ path: webRequire.resolve(path), external: true }));
    } }],
  });
  return import(pathToFileURL(`${directory}/server.cjs`).href);
}
