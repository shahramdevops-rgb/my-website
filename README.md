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
- Node.js 24 LTS + pnpm (via `corepack enable`) — from P2-T3
- Docker Desktop (WSL 2 backend)
- Git
- Editor: Visual Studio 2026 / VS Code / Rider

## Getting started (available after Phase 0)

```powershell
git clone <repo-url> my-website
cd my-website
Copy-Item .env.example .env        # then edit values

# Option A — API on host, DB in Docker (best for debugging)
docker compose up -d db
# once: connection string for the host app (stored outside the repo; use the password from .env)
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5433;Database=site;Username=site;Password=<POSTGRES_PASSWORD>" --project src/PersonalSite.Api
dotnet watch --project src/PersonalSite.Api        # http://localhost:5080

# Option B — everything in containers
docker compose up --build --remove-orphans         # http://localhost:8080 (--remove-orphans: drops the old `web` container once)
```

Health: `/health` (liveness) · `/health/ready` (checks the DB). Unknown paths answer `404` with a ProblemDetails JSON body.

In Development the app applies pending EF Core migrations at startup; in production that is a separate deploy step.

PostgreSQL (dev): `localhost:5433` (host port 5433 avoids clashing with another local PostgreSQL).
`docker compose down` keeps the database (named volume `pgdata`); `docker compose down -v` **deletes** it.

## Common commands

```powershell
dotnet build
dotnet test                                        # needs Docker running (Testcontainers)
dotnet format --verify-no-changes
dotnet ef migrations add <Name> -p src/PersonalSite.Infrastructure -s src/PersonalSite.Api
dotnet ef migrations script -p src/PersonalSite.Infrastructure -s src/PersonalSite.Api   # review SQL
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

1. Tag a release: `git tag v0.1.0 && git push --tags` → GitHub Actions builds and pushes the image to GHCR.
2. On the server: `./deploy/scripts/deploy.sh v0.1.0` (pull → migrate → restart → health check).
3. Backups run nightly via cron (`deploy/scripts/backup.sh`).

Full server setup and the Iran-specific notes (image pulls, mirrors, `docker save/load` fallback) will be in `deploy/README.md`.

## Working with Claude

Tell Claude: **"Do task P0-T1"** (or any task ID). Claude follows `CLAUDE.md`: reads the task, implements it,
runs tests, ticks the checkbox, and explains the key decisions.
