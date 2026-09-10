import { defineConfig, devices } from "@playwright/test";

// Browser-UI suite (see e2e-ui/) — drives the real app through Chromium
// against the already-running dev stack (Postgres + 6 .NET services +
// `npm run dev`). Kept separate from scripts/e2e.mjs, which only exercises
// the HTTP APIs directly.
export default defineConfig({
  testDir: "./e2e-ui",
  fullyParallel: false,
  // Run spec files one at a time: several specs create/approve/reject chapters
  // against the same live admin review queue, and the queue-lookup helper
  // (openReviewItem) assumes the most-recently-submitted chapter is the one on
  // the last page at the moment it looks — true only if runs don't interleave.
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
