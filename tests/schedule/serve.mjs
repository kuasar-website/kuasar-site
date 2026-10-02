import { build } from "esbuild";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Resolve React from the web workspace so hydration never mixes React copies.
const webRequire = createRequire(resolve("apps/web/package.json"));
const webReact = (external) => ({ name: "web-workspace-react", setup(builder) {
  builder.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, ({ path }) => ({ path: webRequire.resolve(path), external }));
} });
const directory = resolve("test-results/schedule-fixture");
await mkdir(directory, { recursive: true });
// CSS modules: esbuild derives local class names from file and class, so both bundles agree.
await build({ entryPoints: ["tests/schedule/client.tsx"], bundle: true, outfile: `${directory}/client.js`,
  jsx: "automatic", plugins: [webReact(false)], define: { "process.env.NODE_ENV": '"production"' } });
await build({ entryPoints: ["tests/schedule/server.tsx"], bundle: true, outfile: `${directory}/server.mjs`,
  jsx: "automatic", platform: "node", format: "esm", packages: "external", plugins: [webReact(true)] });
const { render } = await import(pathToFileURL(`${directory}/server.mjs`).href);
const globalsPath = resolve("apps/web/app/globals.css");
const globals = await webRequire("postcss")([webRequire("@tailwindcss/postcss")({ base: resolve("apps/web") })])
  .process(await readFile(globalsPath, "utf8"), { from: globalsPath });
const css = `${globals.css}\n${await readFile(`${directory}/client.css`, "utf8")}\nmain { max-width: 1200px; margin-inline: auto; padding-inline: 0; }`;
createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:4179");
  if (url.pathname === "/favicon.ico") { response.writeHead(204).end(); return; }
  if (url.pathname === "/fixture.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
  if (url.pathname === "/client.js") { response.setHeader("Content-Type", "text/javascript"); response.end(await readFile(`${directory}/client.js`)); return; }
  const locale = url.pathname.slice(1);
  if (!["en", "tr"].includes(locale)) { response.writeHead(404).end(); return; }
  const { html, events } = render(locale, url.searchParams.get("set") ?? "demo");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Schedule fixture</title><link rel="stylesheet" href="/fixture.css"></head><body><div id="root">${html}</div><script id="events" type="application/json">${JSON.stringify(events).replace(/</g, "\\u003c")}</script><script defer src="/client.js"></script></body></html>`);
}).listen(4179, "127.0.0.1");
