import { defineConfig, devices } from "@playwright/test"

const CI = !!process.env.CI

// On a loaded machine every delay below can be stretched at once: E2E_SLOW=2 doubles them.
const slow = Math.max(1, Number(process.env.E2E_SLOW) || 1)
const seconds = (value: number) => Math.round(value * 1000 * slow)

// The journeys run against a stack that is already up: the frontend, the API and the demo data set.
export default defineConfig({
  testDir: "e2e",
  // Asks for every page once, with patience: a development server has compiled them all
  // before the first journey, and a frontend that is down is reported at once.
  globalSetup: "./e2e/support/warm-up.ts",
  outputDir: "e2e/.results",
  // One worker: every journey writes to the same database.
  workers: 1,
  fullyParallel: false,
  retries: 1,
  // A journey that only passes on its second attempt is a defect: it fails the run where
  // nobody watches the terminal. Locally it stays reported as "flaky", exit status 0.
  failOnFlakyTests: CI,
  forbidOnly: CI,
  // Three different delays, on purpose:
  // - an assertion or an action gives up after 15 s, so a real defect shows quickly;
  // - loading a page (page.goto, reload) may take 60 s: a development server under load
  //   is slow to answer, which is not a defect of the application;
  // - a whole journey may take 2 minutes.
  timeout: seconds(120),
  expect: { timeout: seconds(15) },
  reporter: [
    [CI ? "github" : "list"],
    ...(CI ? ([["list"]] as const) : []),
    ["html", { outputFolder: "e2e/.report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: seconds(15),
    navigationTimeout: seconds(60),
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
})
