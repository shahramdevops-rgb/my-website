import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at the per-request config (locale + messages).
const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

// Compiles the localized prose in content/*.mdx (About, Services …; ADR-012) to React components at build time:
// pages import them like any module, and no Markdown parser ships to the browser. Element styles come from
// src/mdx-components.tsx. `pageExtensions` stays the default, so an .mdx file is never a route by itself.
const withMDX = createMDX();

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

export default withNextIntl(withMDX(nextConfig));
