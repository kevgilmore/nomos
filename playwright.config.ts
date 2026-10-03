import { defineConfig, devices } from "@playwright/test";

const urls = process.env.NOMOS_E2E_URLS ? JSON.parse(process.env.NOMOS_E2E_URLS) as Record<string, string> : {};
const configuredProjects = Object.entries(urls).flatMap(([name, baseURL]) => [
  { name: `${name}-desktop-light`, use: { ...devices["Desktop Chrome"], baseURL, colorScheme: "light" as const } },
  { name: `${name}-desktop-dark`, use: { ...devices["Desktop Chrome"], baseURL, colorScheme: "dark" as const } },
  { name: `${name}-mobile-light`, use: { ...devices["iPhone 13"], baseURL, colorScheme: "light" as const } },
  { name: `${name}-mobile-dark`, use: { ...devices["iPhone 13"], baseURL, colorScheme: "dark" as const } },
]);
const projects = configuredProjects.length ? configuredProjects : [{ name: "local", use: { ...devices["Desktop Chrome"], baseURL: process.env.NOMOS_E2E_BASE_URL ?? "http://127.0.0.1:3000", colorScheme: "light" as const } }];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "on-first-retry", screenshot: "only-on-failure", video: "retain-on-failure" },
  projects,
  webServer: configuredProjects.length ? undefined : [
    {
      command: "pnpm --filter @nomos/id dev --hostname 0.0.0.0 --port 3001",
      url: "http://127.0.0.1:3001/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @nomos/home dev --hostname 0.0.0.0 --port 3000",
      url: "http://127.0.0.1:3000/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
