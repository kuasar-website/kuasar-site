import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", fullyParallel: true,
  retries: process.env.CI ? 1 : 0, reporter: "list",
  use: { baseURL: "http://127.0.0.1:4179", timezoneId: "America/New_York" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
  ],
  webServer: {
    command: "node tests/schedule/serve.mjs",
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: "http://127.0.0.1:4179/en", reuseExistingServer: false,
  },
});
