import { readFileSync, writeFileSync } from 'node:fs';
const asset = new URL('../../apps/web/public/brand/kuasar-wordmark.svg', import.meta.url);
const source = readFileSync(asset, 'utf8');
const viewBox = source.match(/viewBox="([^"]+)"/)[1];
const paths = [...source.matchAll(/<path\b[^>]*\/>/g)].map(([path]) => path.replaceAll('fill-rule=', 'fillRule=').replaceAll('clip-rule=', 'clipRule=')).join('\n      ');
writeFileSync(new URL('../../apps/web/components/hero/wordmark.tsx', import.meta.url), `// Generated from public/brand/kuasar-wordmark.svg; do not edit the artwork here.\n// Regenerate: node tests/hero/generate-wordmark.mjs\nexport function Wordmark() {\n  return (\n    <svg width="311" height="125" fill="none" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">\n      ${paths}\n    </svg>\n  );\n}\n`);
