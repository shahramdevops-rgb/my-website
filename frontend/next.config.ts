import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server (.next/standalone) with only the files it needs: a small Docker image (P2-T5).
  output: "standalone",
  // No "X-Powered-By: Next.js": the public never sees which stack versions we run (ADR-018).
  poweredByHeader: false,
};

export default nextConfig;
