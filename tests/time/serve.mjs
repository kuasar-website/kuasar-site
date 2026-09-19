import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const directory = resolve("test-results/time-fixture");
await mkdir(directory, { recursive: true });
await build({ entryPoints: ["tests/time/client.tsx"], bundle: true, outfile: `${directory}/client.js`,
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' } });
await build({ entryPoints: ["tests/time/server.tsx"], bundle: true, outfile: `${directory}/server.mjs`,
  jsx: "automatic", platform: "node", format: "esm", packages: "external" });
const { render } = await import(pathToFileURL(`${directory}/server.mjs`).href);
for (const locale of ["en", "tr"]) {
  await writeFile(`${directory}/${locale}.html`, `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"></head><body><div id="root">${render(locale)}</div><script defer src="/client.js"></script></body></html>`);
}
createServer(async (request, response) => {
  if (request.url === "/favicon.ico") { response.writeHead(204).end(); return; }
  const file = { "/en": "en.html", "/tr": "tr.html", "/client.js": "client.js" }[request.url];
  if (!file) { response.writeHead(404).end(); return; }
  response.setHeader("Content-Type", file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8");
  response.end(await readFile(`${directory}/${file}`));
}).listen(4173, "127.0.0.1");
