# CLAUDE.md — Project guide for Claude

Read this file first in every session. It gives you the project context, how to work, the key rules and the
architecture decisions in short form, and where the full details live.

---

## 1. Project in one paragraph

Personal website of **Adam**, a backend developer (C#/.NET). It combines an online resume, a portfolio (including a
live deployed project), a technical blog with moderated comments, a services page to attract freelance clients, a
contact form and a newsletter signup (sending disabled for now). Audience: employers, potential clients, blog readers.
Site content is **Persian (RTL)** today; the structure must allow adding **English** later without a big refactor.
It is also a **learning project**: Adam wants to understand *why* each technical decision is made.

## 2. Current status

- **Phase:** P0 — Foundation **complete** (`P0-T1`…`P0-T7`). CI (`.github/workflows/ci.yml`) runs restore, build, format check and tests on every push and PR. Code is on GitHub: `shahramdevops-rgb/my-website` (`origin`).
- **Next task:** `P1-T1` (Tailwind v4 pipeline + design tokens).
- **Dev DB** is published on host port **5433** (Adam has another project's PostgreSQL on 5432). For `dotnet watch` on the host, the connection string lives in **user-secrets** (`ConnectionStrings:Default`); in Docker, `compose.yaml` builds it from `.env`.
- **Tooling note:** when Claude runs locally (VS Code extension) it can use `dotnet` and reach nuget.org; in cloud sandboxes it may not — then Adam runs the `dotnet` commands.
- **Tests** run on Microsoft.Testing.Platform (`global.json` → `test.runner`); `dotnet test` from the repo root (Docker must be running: integration tests start PostgreSQL via Testcontainers).
- Keep this section updated: after finishing a task, set "Next task" to the next unchecked item.

## 3. Communication with Adam

- **Reply to Adam in Persian** (he writes in Persian). Keep technical terms in English where natural (`DbContext`, `middleware`).
- **Everything in the repo is English**: code, identifiers, comments, commit messages, docs.
- **Site content (UI text) is Persian**, stored in `.resx` files — never hard-coded.
- Adam is learning: explain *why*, briefly. Prefer one clear reason over a list of five.
- Ask before decisions that are hard to reverse (data model, URLs, public behaviour, new dependencies).

## 4. Document map

| File | Use it for |
|---|---|
| `architecture.md` | Layers, folders, data model, request flows, routing, ADR decision log |
| `rules.md` | Mandatory coding conventions and checklists (full version of §8 below) |
| `roadmap.md` | Phases and their order/rationale |
| `TASKS.md` | Small executable tasks with acceptance criteria (IDs like `P6-T3`) |
| `learning.md` | Plain-language explanations of concepts & decisions (for Adam) |
| `README.md` | How to run/build/deploy |

## 5. Scope — what the site contains

| # | Feature | Notes | Phase |
|---|---|---|---|
| 1 | Home | Hero + short intro + featured projects + services teaser + latest posts | P2 (+ wiring P5/P6) |
| 2 | About | Localized Razor prose view | P2 |
| 3 | Projects / portfolio | DB + admin CRUD; "Live" badge + link for the deployed project | P5 |
| 4 | Blog | Markdown written in **admin panel** (not DB-direct, not git files); tags, paging | P6 |
| 5 | Comments | Name + email + text; **Pending until Adam approves**; honeypot + timing token + rate limit | P7 |
| 6 | Contact form | Name, email, message → DB + admin inbox; email notify behind flag | P8 |
| 7 | Resume page + PDF | PDF **uploaded from admin**; download button | P2 + P8 |
| 8 | Contact links | Email, GitHub, Telegram only (**no LinkedIn, no phone** for now) | P1 |
| 9 | Newsletter | Model + signup UI now; **sending disabled** behind `Newsletter.Sending` | P11 |
| – | Services page | Freelance services, CTA to contact | P2 |
| – | Admin panel | ASP.NET Identity, single admin, no public registration | P4 |
| – | Analytics | Umami, self-hosted | P10 |
| – | English + geo-based default language | Designed-in now, built later | P13 |

**Out of scope for now:** public user accounts, LinkedIn/phone, payments, newsletter sending, search.

## 6. Stack (short)

ASP.NET Core 10 (LTS) Razor Pages · light Clean Architecture (Domain / Application / Infrastructure / Web) ·
PostgreSQL 17 + EF Core 10 (snake_case) · ASP.NET Identity (single admin) · Tailwind v4 standalone CLI ·
Alpine.js CSP build · Markdig + HtmlSanitizer · FluentValidation · Microsoft.FeatureManagement · Serilog ·
Docker Compose (dev & prod) + Caddy · Umami (self-hosted) · xUnit v3 + Shouldly + NSubstitute + Testcontainers ·
GitHub Actions → GHCR.

## 7. Architecture decisions (summary — full ADRs in `architecture.md §11`)

| ADR | Decision | One-line reason |
|---|---|---|
| 001 | Razor Pages, not MVC | Each URL is a page; code stays together; SSR = good SEO |
| 002 | Light Clean Architecture, 4 projects | Compiler-enforced layering, no CQRS ceremony |
| 003 | No MediatR / AutoMapper / FluentAssertions | Commercial licences + hidden indirection |
| 004 | `IAppDbContext` instead of repositories | DbContext already is repo + unit of work |
| 005 | Markdown in DB, rendered HTML cached | Admin-editable, fast reads, one render path |
| 006 | Culture-prefixed URLs (`/fa/...`) for every language | Adding `/en` later needs no route changes |
| 007 | Self-host every asset | Works under Iranian filtering, strict CSP, privacy |
| 008 | Tailwind standalone CLI | No Node toolchain for the app |
| 009 | One PostgreSQL, separate DB for Umami | One thing to back up |
| 010 | Moderated comments, no third-party service / CAPTCHA | reCAPTCHA unreliable in Iran; privacy |
| 011 | Newsletter behind feature flags | Ship model/UI now, send later without migration |
| 012 | About/Services/Resume prose in localized views | Rarely changes; no admin UI needed |

**Layering:** `Web → Application → Domain`; `Infrastructure → Application`. Page models are thin and call
Application services only — never `AppDbContext`.

**Solution:** `src/PersonalSite.{Domain,Application,Infrastructure,Web}`, `tests/PersonalSite.{UnitTests,IntegrationTests}`.

## 8. Coding rules (essentials — full list in `rules.md`)

- `TreatWarningsAsErrors`, nullable on, file-scoped namespaces, `sealed` classes by default, `record` DTOs.
- Async all the way with `CancellationToken ct` as last parameter; no `.Result` / `.Wait()`.
- Entities: private setters, state changes via methods (`post.Publish(now)`), enums stored as strings, IDs `Guid.CreateVersion7()`.
- Expected failures → `Result<T>`; exceptions only for bugs/infrastructure.
- Reads: `AsNoTracking()` + `Select` to DTOs; every list is paged.
- EF config via `IEntityTypeConfiguration<T>` only; one migration per task; never edit an applied migration.
- Times: `TimeProvider`, UTC in DB, Persian calendar only in views.
- No magic strings: flags, policies, cache tags, routes in constant classes.
- UI text only via `IStringLocalizer`/`IViewLocalizer` (keys like `Blog.Post.CommentsTitle`).
- **RTL-safe CSS**: logical utilities only (`ms/me/ps/pe/start/end`); colors only via design tokens.
- User input always HTML-encoded; `Html.Raw` only for sanitized Markdown output.
- Tests: `Method_State_ExpectedResult`; integration tests on real PostgreSQL (Testcontainers), never EF InMemory.
- Git: branch `feat/P6-T3-short-name`; Conventional Commits.

## 9. Non-negotiables

- **No external runtime dependencies**: no CDNs, Google Fonts, reCAPTCHA, hosted comment/email/analytics APIs, or Iran-specific services. Vendor assets into `wwwroot/lib`.
- **Dark theme is the default**; everything must look right in both themes.
- Public forms: honeypot + signed timing token + rate limit. Comments are `Pending` until approved.
- Don't enable anything behind a feature flag unless Adam asks.
- Secrets never in git. New config → add to `.env.example` and an Options class with `ValidateOnStart`.
- Every admin page/endpoint requires the `Admin` policy.

## 10. Names to reuse (don't invent variants)

| Kind | Names |
|---|---|
| Feature flags | `Newsletter.Signup` (on), `Newsletter.Sending` (off), `Notifications.Email` (off), `Comments.Enabled` (on), `Analytics.Umami` (on in prod) |
| Auth policy | `Admin` |
| Rate-limit policies | `public-forms`, `login` |
| Cache tags | `blog`, `post:{id}`, `projects` |
| Cultures | `fa` (now), `en` (P13) |
| Volumes | `pgdata`, `uploads`, `dpkeys`, `caddy_data` |
| Domains | `mahdiazghandi.ir` (canonical), `shahramazghandi.ir` (301 → canonical) |

## 11. How to execute a task

When Adam says **"Do task Px-Ty"** (or «تسک Px-Ty رو انجام بده»):

1. Read the task in `TASKS.md`, then the relevant sections of `architecture.md` and `rules.md`.
2. If the task is ambiguous or conflicts with the docs, **ask before coding**. Don't silently expand scope.
3. Check dependencies (e.g. `P5-T4` needs `P6-T1`). If a prerequisite is missing, say so.
4. Implement the smallest change that satisfies **Done when**.
5. Add/adjust tests. Run `dotnet build`, `dotnet test`, `dotnet format --verify-no-changes`.
6. Update docs: tick the task in `TASKS.md` (`[x]`), update §2 *Current status* here, and `architecture.md` if structure/model/decisions changed.
7. **Teach:** end your reply with a short *"What we did & why"* section (3–8 bullets, in Persian).
   If a concept is new and important, add a short entry to `learning.md` (in English, with a tiny example).
8. Suggest a Conventional Commit message. Commit only if asked.

### Definition of Done
Build green · tests green · formatting clean · works in dark **and** light · works RTL at 360px and 1440px ·
no new hard-coded Persian strings · docs updated · task ticked.

## 12. Environment facts

- Adam develops on **Windows** (repo at `C:\Users\shahram\source\repos\my-website`). Give PowerShell commands first,
  bash when relevant (server is Linux).
- Production: an **Iranian VPS** (Linux, Docker). Docker Hub/NuGet/GitHub can be slow or blocked from there → images
  are built in GitHub Actions and pulled from GHCR (fallback: `docker save/load`). Never assume the server can `dotnet restore`.
- **Domains (purchased, `.ir`):** **`mahdiazghandi.ir` is canonical.** `shahramazghandi.ir` and all `www.` variants
  301-redirect to it (same path). Caddy gets real Let's Encrypt certificates for all of them. Domain names live only in config (`SiteOptions.BaseUrl`, Caddyfile, env) —
  never hard-coded in C#/Razor. Details: `architecture.md §9.1`.
- Future migration to an international server → all state in volumes + env config, nothing host-specific in code.

## 13. Design direction

Forest-green, botanical, artistic — *not* a generic template. Leaves, vines and small blossoms as SVG line-art motifs
(original art, `currentColor`, `aria-hidden`), organic shapes, calm motion (respect `prefers-reduced-motion`).
Tokens and palette in `architecture.md §8.1`. Fonts: Vazirmatn + JetBrains Mono (self-hosted).
The metaphor "digital garden" fits the blog. Accessibility: WCAG AA contrast, keyboard navigable, visible focus.

## 14. Useful commands (once the solution exists)

```powershell
docker compose up -d db                     # start PostgreSQL only
dotnet watch --project src/PersonalSite.Web # run app with hot reload
./tools/tailwind-watch.ps1                  # CSS watcher (separate terminal)
dotnet ef migrations add <Name> -p src/PersonalSite.Infrastructure -s src/PersonalSite.Web
dotnet test
docker compose up --build                   # full stack in containers
```

## 15. When unsure

Prefer the simpler option that keeps the i18n and server-migration goals intact, explain the trade-off in 2–3
sentences, and ask Adam if the choice is hard to reverse.
