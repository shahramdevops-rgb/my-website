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
    server: {
      deps: {
        // next-intl imports "next/navigation" without an extension, which Node's own ESM loader can't resolve
        // (Next has no "exports" map). Letting Vite process next-intl resolves it, and lets tests mock it.
        inline: ["next-intl"],
      },
    },
  },
});
