# Personal Website

Personal site of Adam — backend developer (C#/.NET): resume, portfolio, technical blog, services, contact.
Content is Persian (RTL); the structure is ready for English.

> **Status:** Planning complete, no code yet. Start with task **P0-T1** in [`TASKS.md`](TASKS.md).

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
./tools/get-tailwind.ps1           # downloads pinned Tailwind CLI (Phase 1)

# Option A — app on host, DB in Docker (best for debugging)
docker compose up -d db
dotnet watch --project src/PersonalSite.Web
./tools/tailwind-watch.ps1         # second terminal

# Option B — everything in containers
docker compose up --build
```

App: http://localhost:8080 · Health: http://localhost:8080/health · Admin: http://localhost:8080/admin

## Common commands

```powershell
dotnet build
dotnet test                                        # needs Docker running (Testcontainers)
dotnet format --verify-no-changes
dotnet ef migrations add <Name> -p src/PersonalSite.Infrastructure -s src/PersonalSite.Web
dotnet ef migrations script -p src/PersonalSite.Infrastructure -s src/PersonalSite.Web   # review SQL
```

## Environment variables

Documented in `.env.example` (created in P0-T4). Key ones:

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
