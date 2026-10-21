import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/…" imports as the app (tsconfig.json "paths").
    tsconfigPaths: true,
  },
  test: {
    // A simulated browser DOM in Node: enough for components, much faster than a real browser.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
