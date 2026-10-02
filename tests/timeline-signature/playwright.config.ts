import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', fullyParallel: false,
  retries: process.env.CI ? 1 : 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4182', viewport: { width: 1280, height: 1000 }, reducedMotion: 'no-preference', video: 'on' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'firefox', use: { browserName: 'firefox' } }],
  webServer: { command: 'node tests/timeline-signature/serve.mjs', cwd: fileURLToPath(new URL('../..', import.meta.url)), url: 'http://127.0.0.1:4182/en', reuseExistingServer: false },
});
