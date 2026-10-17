# Personal Website

Personal site of Adam — backend developer (C#/.NET): resume, portfolio, technical blog, services, contact.
Content is Persian (RTL); the structure is ready for English.

[![CI](https://github.com/shahramdevops-rgb/my-website/actions/workflows/ci.yml/badge.svg)](https://github.com/shahramdevops-rgb/my-website/actions/workflows/ci.yml)

> **Status:** Phase 0 (foundation) complete: solution, Docker dev stack, EF Core + PostgreSQL, tests, CI.
> Next: Phase 1 (design system & layout); see [`TASKS.md`](TASKS.md).

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

ASP.NET Core 10 (Razor Pages) · PostgreSQL 17 · EF Core 10 · ASP.NET Identity · Tailwind CSS v4 · Alpine.js ·
Docker Compose · Caddy · Umami · xUnit + Testcontainers · GitHub Actions.

## Prerequisites (Windows dev machine)

- .NET 10 SDK
- Docker Desktop (WSL 2 backend)
- Git
- Editor: Visual Studio 2026 / VS Code / Rider

## Getting started (available after Phase 0)

```powershell
git clone <repo-url> my-website
cd my-website
Copy-Item .env.example .env        # then edit values
./tools/get-tailwind.ps1           # once: pinned Tailwind CLI (the build needs it)

# Option A — app on host, DB in Docker (best for debugging)
docker compose up -d db
# once: connection string for the host app (stored outside the repo; use the password from .env)
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5433;Database=site;Username=site;Password=<POSTGRES_PASSWORD>" --project src/PersonalSite.Web
dotnet watch --project src/PersonalSite.Web
./tools/tailwind-watch.ps1         # second terminal

# Option B — everything in containers
docker compose up --build
```

App: http://localhost:8080 · Health: http://localhost:8080/health (`/health/ready` checks the DB) · Admin: http://localhost:8080/admin

In Development the app applies pending EF Core migrations at startup; in production that is a separate deploy step.

PostgreSQL (dev): `localhost:5433` (host port 5433 avoids clashing with another local PostgreSQL).
`docker compose down` keeps the database (named volume `pgdata`); `docker compose down -v` **deletes** it.

## Common commands

```powershell
dotnet build
dotnet test                                        # needs Docker running (Testcontainers)
dotnet format --verify-no-changes
dotnet ef migrations add <Name> -p src/PersonalSite.Infrastructure -s src/PersonalSite.Web
dotnet ef migrations script -p src/PersonalSite.Infrastructure -s src/PersonalSite.Web   # review SQL
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
