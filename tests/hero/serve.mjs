import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const webRequire = createRequire(resolve('apps/web/package.json'));
const directory = resolve('test-results/hero-fixture');
await mkdir(directory, { recursive: true });
await build({
  entryPoints: ['tests/hero/fixture.tsx'], bundle: true,
  outfile: `${directory}/server.mjs`, jsx: 'automatic',
  platform: 'node', format: 'esm', packages: 'external',
  plugins: [{ name: 'web-react', setup(builder) {
    builder.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, ({ path }) => ({
      path: webRequire.resolve(path), external: true,
    }));
  } }],
});
const { render } = await import(pathToFileURL(`${directory}/server.mjs`).href);
// Compile the actual production token stylesheet; don't duplicate colours in the fixture.
const postcss = webRequire('postcss');
const tailwind = webRequire('@tailwindcss/postcss');
const globalsPath = resolve('apps/web/app/globals.css');
const globals = await postcss([tailwind({ base: resolve('apps/web') })])
  .process(await readFile(globalsPath, 'utf8'), { from: globalsPath });
const css = `${globals.css}\n${await readFile(`${directory}/server.css`, 'utf8')}\nmain { max-width: 1440px; margin-inline: auto; } a { color: inherit; text-decoration: underline; display: inline-block; padding: 12px; } a:focus-visible { outline: 2px solid currentColor; }`;
createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4175');
  if (url.pathname === '/fixture.css') {
    response.setHeader('Content-Type', 'text/css'); response.end(css); return;
  }
  const locale = url.pathname.slice(1);
  if (!['en', 'tr'].includes(locale)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Hero fixture</title></head><body>${render(locale)}</body></html>`);
}).listen(4175, '127.0.0.1');
