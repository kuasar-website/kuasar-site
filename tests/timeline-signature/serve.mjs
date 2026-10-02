import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const web = createRequire(resolve('apps/web/package.json'));
const dir = resolve('out/signature-fixture');
await mkdir(dir, { recursive: true });
const react = (external) => ({ name: 'web-react', setup(builder) {
  builder.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, ({ path }) => ({ path: web.resolve(path), external }));
} });
await build({ entryPoints: ['tests/timeline-signature/server.tsx'], outfile: `${dir}/server.cjs`, bundle: true, jsx: 'automatic', platform: 'node', format: 'cjs', packages: 'external', plugins: [react(true)] });
await build({ entryPoints: { client: 'tests/timeline-signature/client.tsx' }, outdir: `${dir}/browser`, chunkNames: 'chunks/[name]-[hash]', bundle: true, jsx: 'automatic', format: 'esm', splitting: true, minify: true, define: { 'process.env.NODE_ENV': '"production"' }, plugins: [react(false)] });
const { render } = await import(pathToFileURL(`${dir}/server.cjs`).href);
const globalsPath = resolve('apps/web/app/globals.css');
const globals = await web('postcss')([web('@tailwindcss/postcss')({ base: resolve('apps/web') })]).process(await readFile(globalsPath, 'utf8'), { from: globalsPath });
const css = globals.css + await readFile(`${dir}/server.css`, 'utf8') + '\n main { padding: 32px; } #after { display:block; padding-block:40px; } button { border:1px solid currentColor; padding:8px; margin-bottom:24px; }';
createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4182');
  if (url.pathname === '/fixture.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  if (/^\/(?:client\.js|chunks\/[\w.-]+\.js)$/.test(url.pathname)) {
    try { response.setHeader('Content-Type', 'text/javascript'); response.end(await readFile(`${dir}/browser${url.pathname}`)); } catch { response.writeHead(404).end(); } return;
  }
  const locale = url.pathname.slice(1);
  if (!['en','tr'].includes(locale)) { response.writeHead(404).end(); return; }
  const count = Math.max(0, Math.min(50, Number(url.searchParams.get('count') ?? 5)));
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Timeline signature fixture</title></head><body><div id="root">${render(locale, count, url.searchParams.has('home'))}</div><script type="module" src="/client.js"></script></body></html>`);
}).listen(4182, '127.0.0.1');
