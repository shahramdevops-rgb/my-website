# Personal Website

Personal site of Mahdi Azghandi — full-stack engineer (C#/.NET + React/TypeScript): resume, portfolio with live
demos, technical blog, services, contact. Content in Persian (RTL) and English (LTR).

[![CI](https://github.com/shahramdevops-rgb/my-website/actions/workflows/ci.yml/badge.svg)](https://github.com/shahramdevops-rgb/my-website/actions/workflows/ci.yml)

> **Status:** Phase 0 (foundation) complete. Phase 1 built a Razor Pages front-end that is now **retired**: the site
> is being rebuilt as a **Next.js front-end + ASP.NET Core API** behind one origin (ADR-021).
> Next: Phase 2 (full-stack foundation); see [`TASKS.md`](TASKS.md). Today the API runs alone (JSON + health); the
> Next.js front-end arrives in P2-T3 and both sit behind Caddy from P2-T5.

## Documentation

| File | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Project context & workflow for Claude (read first in every AI session) |
| [`architecture.md`](architecture.md) | Layers, folders, data model, flows, decision log |
| [`rules.md`](rules.md) | Coding conventions |
| [`roadmap.md`](roadmap.md) | Phases and ordering |
| [`TASKS.md`](TASKS.md) | Small executable tasks with acceptance criteria |
| [`learning.md`](learning.md) | Concepts & decisions explained simply |

## Stack

**Front-end:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · next-intl · Motion · React Three Fiber · Vitest · Playwright.
**Back-end:** ASP.NET Core 10 (Minimal APIs, OpenAPI) · PostgreSQL 17 · EF Core 10 · ASP.NET Identity · xUnit + Testcontainers.
**Ops:** Docker Compose · Caddy · Umami · GitHub Actions → GHCR.

## Prerequisites (Windows dev machine)

- .NET 10 SDK
- Node.js 24 LTS + pnpm via Corepack: run `corepack enable` once in an **admin** PowerShell (it writes the `pnpm`
  shim next to `node.exe`). The exact pnpm version comes from `frontend/package.json` (`packageManager`).
- Docker Desktop (WSL 2 backend)
- Git
- Editor: Visual Studio 2026 / VS Code / Rider

## Getting started

The browser always sees **one origin**: pages come from Next.js, `/api/*` from the ASP.NET Core API. Pick one of two
ways to run it.

```powershell
git clone <repo-url> my-website
cd my-website
Copy-Item .env.example .env        # then edit values (at least POSTGRES_PASSWORD)
```

### Option A — everything in containers (closest to production)

```powershell
docker compose up --build          # http://localhost:8080
```

Caddy (`deploy/Caddyfile.dev`) is the only published port and splits the traffic by path:

| Path | Goes to |
|---|---|
| `/api/*`, `/health*`, `/media/*`, `/llms.txt`, `/mcp` | `api` (ASP.NET Core) |
| `/internal/*` | 404 (front-end internals, reachable only inside Docker) |
| everything else | `frontend` (Next.js) |

The front-end's server calls the API directly at `http://api:8080` (compose network), not through Caddy.

### Option B — apps on the host, only the database in Docker (best for debugging, hot reload)

```powershell
docker compose up -d db
# once: connection string for the host API (stored outside the repo; use the password from .env)
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5433;Database=site;Username=site;Password=<POSTGRES_PASSWORD>" --project src/PersonalSite.Api
dotnet watch --project src/PersonalSite.Api        # API on http://localhost:5080

# second terminal
cd frontend
pnpm install
pnpm dev                                           # site on http://localhost:3000
```

In this mode Next.js itself forwards `/api/*` to `:5080` (a `rewrites` rule active only in development; settings in
`frontend/.env.development`), so `http://localhost:3000/api/site` works like `:8080/api/site` does behind Caddy.

### Good to know

- Health: `/health` (liveness) · `/health/ready` (checks the DB). Unknown API paths answer `404` with a ProblemDetails JSON body.
- In Development the API applies pending EF Core migrations at startup; in production that is a separate deploy step.
- The front-end refuses to start without `API_INTERNAL_URL` (validated in `frontend/src/lib/env.ts`).
- PostgreSQL (dev): `localhost:5433` (host port 5433 avoids clashing with another local PostgreSQL).
- `docker compose down` keeps the database (named volume `pgdata`); `docker compose down -v` **deletes** it.

## Common commands

```powershell
dotnet build
dotnet test                                        # needs Docker running (Testcontainers)
dotnet format --verify-no-changes
dotnet ef migrations add <Name> -p src/PersonalSite.Infrastructure -s src/PersonalSite.Api
dotnet ef migrations script -p src/PersonalSite.Infrastructure -s src/PersonalSite.Api   # review SQL

# front-end, in frontend/
pnpm install                                       # exact versions from pnpm-lock.yaml
pnpm dev                                           # http://localhost:3000
pnpm lint; pnpm typecheck; pnpm test; pnpm build
pnpm gen:api                                       # after `dotnet build` changed openapi/v1.json: regenerate TS types
pnpm exec playwright install chromium              # once, for the e2e tests
pnpm e2e                                           # builds, starts on :3100, runs Playwright
```

## Environment variables

Documented in `.env.example`. Key ones (some arrive in later phases):

| Variable | Example | Notes |
|---|---|---|
| `ConnectionStrings__Default` | `Host=db;Database=site;Username=site;Password=...` | |
| `POSTGRES_PASSWORD` | `...` | DB container superuser |
| `Admin__Email` / `Admin__Password` | | Seeds the single admin account on first start |
| `Security__IpHashSalt` | random 32+ chars | For hashing commenter IPs |
| `FeatureManagement__Newsletter.Sending` | `false` | Keep off until an email provider is chosen |
| `Smtp__Host`, `Smtp__User`, `Smtp__Password` | | Only needed when email flags are on |

## Deployment (available after Phase 3)

The production stack is `compose.yaml` + `compose.prod.yaml` with `deploy/Caddyfile`: images pulled from GHCR (never
built on the server), only Caddy publishes ports (80/443, HTTPS via Let's Encrypt), every service restarts on its own,
data lives in the volumes `pgdata`, `uploads`, `dpkeys`, `caddy_data`. On the server, `.env` needs the "Production
only" values from `.env.example` (`SITE_HOST`, `REDIRECT_HOSTS`, `ACME_EMAIL`, `IMAGE_TAG`).

```bash
docker compose -f compose.yaml -f compose.prod.yaml config    # validate the merged file
docker compose -f compose.yaml -f compose.prod.yaml pull
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

To try it on Windows: build both images under a local tag, set `SITE_HOST=localhost`, `REDIRECT_HOSTS=www.localhost`,
`IMAGE_REGISTRY=local`, `IMAGE_TAG=check` in a separate env file (`--env-file`), and use a small extra override that
publishes Caddy on other host ports (e.g. `127.0.0.1:18443:443`). Caddy then serves `localhost` with a certificate from
its own local CA (use `curl -k`), so Let's Encrypt is never contacted.

1. Tag a release: `git tag v0.1.0 && git push origin v0.1.0` → the Release workflow (`.github/workflows/release.yml`)
   runs CI, then builds both images and pushes them to GHCR as `ghcr.io/<owner>/personalsite-{api,frontend}` with the
   tags `v0.1.0` and `sha-<commit>`. A manual run (Actions → Release → Run workflow) pushes `sha-<commit>` only.
2. On the server: `./deploy/scripts/deploy.sh v0.1.0` (pull → migrate → restart → health check).
3. Backups run nightly via cron (`deploy/scripts/backup.sh`).

Full server setup and the Iran-specific notes (image pulls, mirrors, `docker save/load` fallback) will be in `deploy/README.md`.

## Working with Claude

Tell Claude: **"Do task P0-T1"** (or any task ID). Claude follows `CLAUDE.md`: reads the task, implements it,
runs tests, ticks the checkbox, and explains the key decisions.
