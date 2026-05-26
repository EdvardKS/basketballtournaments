import { defineConfig } from "@playwright/test";

// Defaults match docker-compose.dev.yml host port mappings:
//   backend host:4010 -> container:4000
//   frontend host:4322 -> container:4321
const API_BASE_URL = process.env.VBL_API_BASE ?? "http://localhost:4010";
const APP_BASE_URL = process.env.VBL_APP_BASE ?? "http://localhost:4322";

export default defineConfig({
  testDir: ".",
  testMatch: ["unit/**/*.spec.ts", "flow/**/*.spec.ts"],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: "./support/global-setup.ts",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["./support/latency-reporter.ts", { thresholdMs: 500 }],
  ],
  use: {
    baseURL: APP_BASE_URL,
    extraHTTPHeaders: { "Accept": "application/json" },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        baseURL: APP_BASE_URL,
      },
      metadata: { apiBase: API_BASE_URL, appBase: APP_BASE_URL },
    },
  ],
});
