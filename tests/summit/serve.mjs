import { build } from "esbuild";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Resolve React (and @vercel/analytics) from the web workspace; replace next/link
// with a test-only anchor because the fixture has no Next router.
const webRequire = createRequire(resolve("apps/web/package.json"));
const plugin = (external) => ({ name: "web-workspace", setup(builder) {
  builder.onResolve({ filter: /^(react|react-dom|@vercel\/analytics)(\/.*)?$/ }, ({ path }) => ({ path: webRequire.resolve(path), external }));
  builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: resolve("tests/summit/link-shim.tsx") }));
} });
const directory = resolve("test-results/summit-fixture");
await mkdir(directory, { recursive: true });
await build({ entryPoints: ["tests/summit/client.tsx"], bundle: true, outfile: `${directory}/client.js`,
  jsx: "automatic", plugins: [plugin(false)], define: { "process.env.NODE_ENV": '"production"' } });
await build({ entryPoints: ["tests/summit/server.tsx"], bundle: true, outfile: `${directory}/server.mjs`,
  jsx: "automatic", platform: "node", format: "esm", packages: "external", plugins: [plugin(true)] });
const { render } = await import(pathToFileURL(`${directory}/server.mjs`).href);
const globalsPath = resolve("apps/web/app/globals.css");
const globals = await webRequire("postcss")([webRequire("@tailwindcss/postcss")({ base: resolve("apps/web") })])
  .process(await readFile(globalsPath, "utf8"), { from: globalsPath });
const css = `${globals.css}\n${await readFile(`${directory}/client.css`, "utf8")}\nmain { max-width: 1200px; margin-inline: auto; }`;
createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:4189");
  if (url.pathname === "/favicon.ico") { response.writeHead(204).end(); return; }
  if (url.pathname === "/fixture.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
  if (url.pathname === "/client.js") { response.setHeader("Content-Type", "text/javascript"); response.end(await readFile(`${directory}/client.js`)); return; }
  const locale = url.pathname.slice(1);
  if (!["en", "tr"].includes(locale)) { response.writeHead(404).end(); return; }
  const q = url.searchParams;
  const { html, data } = render(locale, {
    set: q.get("set") ?? "one", accent: q.get("accent") ?? "aurora", treatment: q.get("treatment") ?? "gradient",
    pdf: q.get("pdf") !== "0", reg: q.get("reg") === "1", date: q.has("nodate") ? null : "2026-11-07T07:00:00.000Z",
  });
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Galactic Summit fixture</title><link rel="stylesheet" href="/fixture.css"></head><body><div id="root">${html}</div><script id="data" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script><script defer src="/client.js"></script></body></html>`);
}).listen(4189, "127.0.0.1");
