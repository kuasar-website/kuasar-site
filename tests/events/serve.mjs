import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { buildFixture, webRequire, directory } from './build.mjs';
const { render } = await buildFixture();
const globalsPath = resolve('apps/web/app/globals.css');
const globals = await webRequire('postcss')([webRequire('@tailwindcss/postcss')({ base: resolve('apps/web') })])
  .process(await readFile(globalsPath, 'utf8'), { from: globalsPath });
const css = `${globals.css}\n${await readFile(`${directory}/server.css`, 'utf8')}\nmain { max-width: 1200px; margin-inline: auto; }`;
createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:4177');
  if (url.pathname === '/fixture.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  if (url.pathname === '/destination') { response.setHeader('Content-Type', 'text/html'); response.end('<h1>Destination fixture</h1>'); return; }
  const locale = url.pathname.slice(1);
  if (!['en', 'tr'].includes(locale)) { response.writeHead(404).end(); return; }
  const count = (key) => Math.max(0, Math.min(50, Number(url.searchParams.get(key) ?? 1) || 0));
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Events fixture</title></head><body>${render(locale, count('talks'), count('nights'), url.searchParams.has('minimal'))}</body></html>`);
}).listen(4177, '127.0.0.1');
