import { defineConfig, devices } from "@playwright/test";

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
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // The hotel detail page renders a maplibre-gl (WebGL) map; headless
        // Chromium has no GPU by default, which throws client-side and can
        // leave the page on a Next.js dev error overlay. Force software
        // rendering so the map actually mounts.
        launchOptions: {
          args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blacklist"],
        },
      },
    },
  ],
  // Requires hotels-api running separately at HOTELS_API_URL (see .env.local)
  // with the shared seed data — this only starts the Next.js server itself.
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
