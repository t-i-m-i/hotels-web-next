import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Playwright doesn't read .env.local on its own; load it the way Next does so
// E2E_USER_EMAIL / E2E_USER_PASSWORD are available to the tests.
loadEnvConfig(process.cwd());

// Happy-path E2E for the web app, mirroring the RN app's Maestro flow at
// ../hotels/.maestro/booking-flow.yaml — same seed data, same "Barcelona"
// search term, same book-a-hotel journey, adapted to browser interactions.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  // Generous default — Next dev compiles each route on first visit, which
  // can comfortably blow past Playwright's 5s default on a cold run.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
        // The hotel detail page renders a maplibre-gl (WebGL) map; headless
        // Chromium has no GPU by default, which throws client-side and can
        // leave the page on a Next.js dev error overlay. Force software
        // rendering so the map actually mounts.
        launchOptions: {
          args: [
            "--use-gl=swiftshader",
            "--enable-webgl",
            "--ignore-gpu-blacklist",
          ],
        },
      },
    },
  ],
  // Requires hotels-api running separately at HOTELS_API_URL (see .env.local)
  // with the shared seed data — this only starts the Next.js server itself.
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3001",
    // Only takes effect on a server Playwright itself starts. If a dev
    // server from a plain `bun run dev` is already up on :3001, this
    // config reuses it as-is (unset E2E_TEST_MODE, no synthetic tag) —
    // stop it first if you need the tag applied.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { E2E_TEST_MODE: "true" },
  },
});
