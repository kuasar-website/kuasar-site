import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:4173", timezoneId: "America/Los_Angeles" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
  ],
  webServer: {
    command: "node tests/time/serve.mjs",
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: "http://127.0.0.1:4173/en", reuseExistingServer: false,
  },
});
