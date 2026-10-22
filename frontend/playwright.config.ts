import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const mockApiPort = 3101;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Fake API with fixed answers (see the file), instead of the .NET API + PostgreSQL.
      command: "node e2e/mock-api.ts",
      url: `http://localhost:${mockApiPort}/api/site`,
      env: { MOCK_API_PORT: String(mockApiPort) },
      reuseExistingServer: !process.env.CI,
    },
    {
      // Tests run against a production build, the same code visitors get (not the dev server).
      // `next start` warns that it "does not work" with output: "standalone"; it still serves the build fine.
      // Production runs .next/standalone/server.js in the Docker image instead (P2-T5).
      // In CI the job's Build step already ran `next build`; locally `pnpm e2e` builds first.
      command: process.env.CI
        ? `next start --port ${port}`
        : `next build && next start --port ${port}`,
      url: baseURL,
      env: { API_INTERNAL_URL: `http://localhost:${mockApiPort}` },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
