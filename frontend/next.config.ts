import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at the per-request config (locale + messages).
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server (.next/standalone) with only the files it needs: a small Docker image (P2-T5).
  output: "standalone",
  // No "X-Powered-By: Next.js": the public never sees which stack versions we run (ADR-018).
  poweredByHeader: false,

  // Host workflow only (`pnpm dev` on :3000, API on :5080): pass /api/* on to the API, so the browser sees one
  // origin just like behind Caddy. In Docker and production Caddy does this and the list stays empty.
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL;
    if (process.env.NODE_ENV !== "development" || !apiUrl) return [];

    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default withNextIntl(nextConfig);
