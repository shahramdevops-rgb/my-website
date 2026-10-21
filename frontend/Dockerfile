# syntax=docker/dockerfile:1

# ---------- Base: Node 24 + the exact pnpm from package.json ("packageManager"), via Corepack ----------
FROM node:24-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ---------- Dependencies: only re-run when the lockfile changes ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# The cache mount keeps pnpm's package store between builds (it is not part of the image).
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- Build: `next build` with output: "standalone" ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---------- Runtime: Node + the standalone server only (no pnpm, no source, no dev dependencies) ----------
FROM node:24-alpine AS runtime
WORKDIR /app
# HOSTNAME must be set: Docker sets it to the container id, and the server would listen only on that name.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The standalone folder holds server.js and the traced node_modules; static assets are copied next to it
# (`next build` leaves them out on purpose, so a CDN could serve them — here the server does).
# Add `COPY --from=build /app/public ./public` once frontend/public/ exists.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

# The official image ships a non-root "node" user.
USER node
EXPOSE 3000

# No curl/wget needed: Node's own fetch probes the internal health route (src/app/internal/health/route.ts).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/internal/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "server.js"]
