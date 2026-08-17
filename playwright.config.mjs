import { defineConfig, devices } from "@playwright/test";

// Every project is selected explicitly by name via --project -- there is no
// default "run everything" invocation. See package.json's test:ui:functional
// and test:ui:compat scripts, and CLAUDE.md's Browser characterisation
// section for what each project covers.
export default defineConfig({
  testDir: "./tests/browser/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  webServer: {
    command: "node tests/browser/helpers/static-server.mjs",
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "functional-mobile-chromium",
      testMatch: [
        "shared/overflow.spec.mjs",
        "shared/tracker.spec.mjs",
        "shared/layout-fixture.spec.mjs",
        "mobile/touch-interaction.spec.mjs",
      ],
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 780 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "functional-desktop-chromium",
      testMatch: [
        "shared/overflow.spec.mjs",
        "shared/tracker.spec.mjs",
        "shared/layout-fixture.spec.mjs",
        "desktop/desktop-interaction.spec.mjs",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        hasTouch: false,
      },
    },
    {
      name: "compat-firefox",
      testMatch: ["compat/deep-link-disclosure-print.spec.mjs"],
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 900 },
        hasTouch: false,
      },
    },
    {
      name: "compat-webkit",
      testMatch: [
        "shared/overflow.spec.mjs",
        "compat/deep-link-disclosure-print.spec.mjs",
      ],
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 360, height: 780 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
