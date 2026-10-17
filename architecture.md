# Architecture

> Source of truth for *how the system is built*. If code and this document disagree, fix one of them in the same PR.
> Decisions are recorded in the **Decision Log** at the bottom (ADR-style, one paragraph each).
>
> **2026-10-18 — full-stack split (ADR-021…027).** The site is now two applications: a **Next.js (React +
> TypeScript) front-end** and an **ASP.NET Core API**. Phase 1 built a Razor Pages front-end; it is retired in
> `P2-T1` (summary in §8.4). Sections below describe the target; anything still in the code from P1 is marked
> *retired*.

---

## 1. System overview

A personal website (resume, portfolio with live demos, blog, services) with a private admin panel. The browser only
ever talks to **one origin**; Caddy splits the traffic between the two apps.

```
                         Internet
                            │  HTTPS (443)
                      ┌─────▼─────┐
                      │   Caddy   │  TLS, compression, routing by path (and User-Agent for `curl /`)
                      └──┬──────┬─┘
     everything else     │      │  /api/*  /mcp  /llms.txt  /media/*  /health*   (+ `curl` on `/`)
          ┌──────────────▼─┐  ┌─▼──────────────┐
          │   frontend     │  │      api       │
          │ Next.js (Node) │──►  ASP.NET Core  │  internal HTTP (server-side fetch, docker network)
          │ React + TS     │  │  10 (.NET)     │
          └──────┬─────────┘  └──┬─────────┬───┘
                 │ revalidate    │         │
                 ◄───────────────┘   ┌─────▼───────┐       ┌──────────┐
                  (internal only)    │ PostgreSQL  │◄──────┤  umami   │  self-hosted analytics (P11)
                                     └─────────────┘       └──────────┘
          volumes: pgdata · uploads · dpkeys · caddy_data
```

- **frontend** renders every HTML page (public site + admin UI) on the server and hydrates the interactive parts.
  It has no database access: all data comes from the API through a typed client (ADR-026).
- **api** owns the data, business rules, authentication (ASP.NET Identity cookie), file uploads, rate limiting and
  the machine-readable endpoints (`/api/resume.json`, `curl` card, `llms.txt`, MCP).
- Nothing on a public request path calls a third-party service (no CDN, no Google Fonts, no hosted comments/email/
  analytics/AI). npm and NuGet packages are bundled at build time — that is not a runtime dependency.

The only outbound HTTP calls are: health checks of Mahdi's **own** deployed projects (P6-T8), and — admin-only,
behind a flag — the AI assistant's provider (ADR-015). Both have timeouts and are never on a public request path.

## 2. Tech stack (pinned majors — exact versions are pinned in the task that adds them)

| Concern | Choice | Notes |
|---|---|---|
| Front-end framework | **Next.js 16 (App Router), React 19, TypeScript (strict)** | SSR in a Node 24 LTS container; ADR-021 |
| Package manager | pnpm 10 | lockfile committed; `frontend/` only |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` | design tokens as CSS variables (§8.1) |
| Animation | Motion (`motion/react`) for layout/UI motion; CSS scroll-driven animations; View Transitions | always respects `prefers-reduced-motion` |
| 3D | React Three Fiber + drei (keyboard hero only) | lazy-loaded, static poster first (§8.3) |
| i18n | next-intl, `/[locale]` segments `fa` / `en` | messages in `frontend/messages/*.json` |
| API contract | OpenAPI document generated at build (`Microsoft.AspNetCore.OpenApi`) → `openapi-typescript` + `openapi-fetch` | ADR-026 |
| Front-end tests | Vitest + Testing Library; Playwright (+ axe) for e2e | |
| Lint/format (TS) | ESLint (Next config) + Prettier | |
| Back-end runtime | .NET 10 (LTS) / ASP.NET Core 10, Minimal APIs | `global.json` pins SDK feature band |
| DB | PostgreSQL 17 | via Npgsql EF Core provider |
| ORM | EF Core 10 + `EFCore.NamingConventions` (snake_case) | code-first migrations |
| Auth | ASP.NET Core Identity (cookie), single admin | same-origin cookie; no JWT in the browser |
| Markdown | Markdig → HtmlSanitizer (in the API) | rendered HTML cached in a DB column |
| Validation | FluentValidation (Application layer) | the API is the real gate; client validation is UX only |
| Feature flags | Microsoft.FeatureManagement (API) | public flags exposed to the front-end by `GET /api/site` |
| Logging | Serilog → console (JSON in prod) (API); Next.js stdout | Docker collects stdout |
| .NET tests | xUnit v3, Shouldly, NSubstitute, Testcontainers (PostgreSQL), WebApplicationFactory | Microsoft.Testing.Platform |
| Reverse proxy | Caddy 2 | automatic HTTPS; one origin for both apps |
| Analytics | Umami (self-hosted) | cookieless |
| Metrics | `System.Diagnostics.Metrics` + in-memory aggregation (P11) | no Prometheus/Grafana stack for one site |
| AI (planned, P12) | Microsoft.Extensions.AI; ONNX Runtime local embeddings; pgvector; MCP C# SDK | each approved by Mahdi in its task |
| CI | GitHub Actions | builds both images **abroad**, pushes to GHCR |

## 3. Repository layout

```
my-website/
├─ CLAUDE.md  README.md  architecture.md  rules.md  roadmap.md  TASKS.md  learning.md
├─ global.json  Directory.Build.props  Directory.Packages.props  PersonalSite.slnx
├─ .editorconfig  .gitignore  .dockerignore  .env.example
├─ compose.yaml                    # services: frontend, api, db (+ caddy); volume definitions
├─ compose.override.yaml           # dev: caddy on 127.0.0.1:8080, db on 127.0.0.1:5433
├─ compose.prod.yaml               # prod: images from GHCR, only caddy publishes ports
├─ deploy/  (Caddyfile, postgres/init/, scripts/)
├─ .github/workflows/ (ci.yml — .NET job + frontend job; release.yml)
├─ openapi/v1.json                 # generated by the API build, committed; source of the TS types (ADR-026)
├─ src/                            # .NET back-end (light Clean Architecture)
│  ├─ PersonalSite.Domain/
│  ├─ PersonalSite.Application/
│  ├─ PersonalSite.Infrastructure/
│  └─ PersonalSite.Api/            # was PersonalSite.Web (renamed in P2-T1)
├─ tests/
│  ├─ PersonalSite.UnitTests/
│  └─ PersonalSite.IntegrationTests/
└─ frontend/                       # Next.js app (pnpm)
   ├─ package.json  pnpm-lock.yaml  next.config.ts  tsconfig.json  Dockerfile
   ├─ messages/ fa.json en.json    # UI strings (next-intl)
   ├─ content/                     # localized prose (MDX): about.fa.mdx, about.en.mdx, services.*.mdx …
   ├─ public/                      # fonts are NOT here (next/font/local reads src/fonts)
   ├─ e2e/                         # Playwright tests
   └─ src/
      ├─ app/[locale]/             # public routes (layout, page, about/, projects/, blog/ …)
      ├─ app/admin/                # admin UI (Persian only)
      ├─ app/internal/revalidate/  # cache revalidation hook, reachable only on the docker network
      ├─ components/ ui/ layout/ bento/ demos/ xray/ keyboard/
      ├─ lib/ api/ (generated schema + client) i18n/ format/ (dates, numbers) site/
      ├─ fonts/                    # self-hosted woff2 + licences
      ├─ styles/globals.css        # Tailwind entry + tokens
      └─ proxy.ts                  # Next.js 16 request hook (formerly middleware): locale redirect, CSP nonce
```

### 3.1 Dependency rule

```
frontend ──HTTP (typed client)──► Api ──► Application ──► Domain
                                   │           ▲
                                   └──► Infrastructure ──┘   (Infrastructure implements Application interfaces)
```

- **Domain** references nothing (no EF, no ASP.NET).
- **Application** references Domain (+ FluentValidation, and `Microsoft.EntityFrameworkCore` *abstractions only* — ADR-004).
- **Infrastructure** references Application + Domain. Implements persistence, files, email, markdown.
- **Api** references Application + Infrastructure (only to call `AddInfrastructure()`). Endpoints are thin: bind,
  call one Application service method, map `Result` to an HTTP result. Never `AppDbContext` in endpoints.
- **frontend** knows the API only through `openapi/v1.json` → generated types. No hand-written URLs or DTO types.

### 3.2 .NET project internals

```
PersonalSite.Domain/
├─ Common/            Entity.cs (Id, CreatedAt, UpdatedAt), IAuditable, Slug.cs (value object), Language.cs
├─ Blog/              Post.cs, PostStatus.cs, Tag.cs, Comment.cs, CommentStatus.cs
├─ Projects/          Project.cs, ProjectStatus.cs
├─ Demos/             CinemaSeat.cs, GymMember.cs, Locker.cs … (sandbox entities for live demos, ADR-027)
├─ Contact/           ContactMessage.cs
├─ Newsletter/        Subscriber.cs, SubscriberStatus.cs
└─ Media/             MediaFile.cs, ResumeDocument.cs

PersonalSite.Application/
├─ Common/            Abstractions/ (IAppDbContext, IFileStorage, IEmailSender, IMarkdownRenderer, ISpamGuard,
│                     IFrontendRevalidator), Results/ (Result, Error), Paging/ (PagedList<T>, PageRequest)
├─ DependencyInjection.cs      (AddApplication)
├─ Site/              SiteInfoService (name, social links, public feature flags → GET /api/site)
├─ Blog/  Projects/  Contact/  Newsletter/  Resume/ (ResumeProfile, ADR-013)  Demos/  Search/ (P12)  Assistant/ (P12)
└─ Features/          FeatureFlags.cs (string constants)

PersonalSite.Infrastructure/
├─ Persistence/       AppDbContext, DatabaseOptions, DatabaseMigrator, Configurations/, Migrations/,
│                     Interceptors/AuditInterceptor.cs, Seed/ (AdminSeeder, DevDataSeeder, DemoSeeder)
├─ Identity/AppUser.cs
├─ Files/LocalFileStorage.cs     (/app/data/uploads volume)
├─ Email/                        SmtpEmailSender, LoggingEmailSender
├─ Markdown/MarkdigRenderer.cs   (Markdig + HtmlSanitizer)
├─ Frontend/HttpFrontendRevalidator.cs  (POST to the front-end's internal revalidate hook)
├─ Monitoring/                   ProjectHealthMonitor (P6), RequestMetrics + DbQueryCounter (P11)
├─ Ai/                           (P12)
└─ DependencyInjection.cs        (AddInfrastructure)

PersonalSite.Api/
├─ Program.cs                    composition root, middleware order
├─ DependencyInjection.cs        (AddApi: Serilog, options, ProblemDetails, OpenAPI, auth, rate limiting, health)
├─ Configuration/                Options classes (SiteOptions, FrontendOptions …), all ValidateOnStart
├─ Endpoints/                    one static class per feature: SiteEndpoints, ProjectEndpoints, BlogEndpoints,
│                                AdminPostEndpoints, AuthEndpoints, DemoEndpoints, ResumeEndpoints, CurlCardEndpoint,
│                                LlmsTxtEndpoint, HealthEndpoints, McpEndpoints (P12) — mapped under MapGroup("/api")
├─ Infrastructure/               SecurityHeadersMiddleware (API responses), HealthProbe, ApiRoutes (path constants)
└─ Content/                      resume.fa.json, resume.en.json (ADR-013)
```

## 4. Data model

All tables use `snake_case` (via naming convention). All timestamps are `timestamptz`, stored in **UTC**,
converted to Persian calendar / Tehran time **only in the presentation layer** (front-end formatters). Primary keys
are `Guid` (UUID v7 via `Guid.CreateVersion7()` — time-ordered, index-friendly, safe to expose in admin URLs).

```
┌──────────────────┐        ┌──────────────┐        ┌────────────┐
│ posts            │ *    * │ post_tags    │ *    1 │ tags       │
│──────────────────│────────│──────────────│────────│────────────│
│ id (uuid) PK     │        │ post_id  FK  │        │ id PK      │
│ language (fa/en) │        │ tag_id   FK  │        │ language   │
│ translation_group│        └──────────────┘        │ name       │
│ slug             │  UNIQUE(language, slug)        │ slug       │ UNIQUE(language, slug)
│ title            │                                └────────────┘
│ excerpt          │
│ body_markdown    │  source of truth (what admin edits)
│ body_html        │  rendered + sanitized cache (what the public sees)
│ cover_image_id FK│──► media_files
│ status           │  Draft | Published | Archived
│ growth_stage     │  Seedling | Budding | Evergreen (digital garden; default Seedling)
│ published_at     │  nullable; set on first publish
│ reading_minutes  │
│ seo_title        │  nullable, falls back to title
│ seo_description  │  nullable, falls back to excerpt
│ allow_comments   │
│ created_at/updated_at
└───────┬──────────┘
        │ 1
        │ *
┌───────▼──────────┐
│ comments         │
│──────────────────│
│ id PK            │
│ post_id FK       │  ON DELETE CASCADE
│ author_name      │  max 80
│ author_email     │  max 254, NEVER returned by public endpoints
│ body             │  plain text, max 3000; rendered as text (React escapes) with line breaks
│ status           │  Pending | Approved | Rejected | Spam
│ ip_hash          │  SHA-256(ip + secret salt) – for rate limiting/abuse, not raw IP (privacy)
│ user_agent       │  truncated 256
│ created_at, moderated_at
└──────────────────┘  INDEX(post_id, status, created_at)

projects
─────────
id, language, translation_group
slug  UNIQUE(language, slug)
title, summary, body_markdown, body_html  (body = case study: Problem · Architecture · Decisions · Results · What went wrong)
status: Live | InProgress | Archived
live_url, source_url (nullable)            contact_messages
health_url (nullable, https; P6-T8)        ────────────────
demo_key (nullable: cinema | gym …)        id, name, email, message
tech_stack (text[])                        type: Hiring | Project | Other
cover_image_id FK → media_files            status: New | Read | Archived
is_featured, sort_order                    ip_hash, created_at
started_on, finished_on (date, nullable)

demo schema (ADR-027) — sandbox data for live demos, never mixed with real content
───────────
demo.cinema_seats (show_id, row, number, status, held_by, version)   demo.gym_members, demo.gym_lockers, demo.gym_checkins
reset by a background job (nightly + when a visitor presses "reset"); rate limited (`public-api`)

content_embeddings (P12)
────────────────────────
id, owner_type (Post | Project), owner_id, language, chunk_index, chunk_text
embedding vector(n)  HNSW index (pgvector)

media_files                                resume_documents
───────────                                ────────────────
id, storage_key (relative path)            id, language, media_file_id FK
original_file_name, content_type           is_current (partial unique index: one current per language)
size_bytes, width, height (images)         uploaded_at
alt_text, created_at

subscribers (newsletter)                   Identity tables (asp_net_users, …)
───────────                                ─────────────────────────────────
id, email UNIQUE (citext)                  standard ASP.NET Core Identity schema;
language                                   only one row in practice (the admin)
status: Pending | Confirmed | Unsubscribed
confirm_token_hash, unsubscribe_token_hash
source (e.g. "footer", "post-page")
created_at, confirmed_at, unsubscribed_at
```

### 4.1 Multilingual content model
- Every *content* entity (Post, Project, Tag, ResumeDocument) has a `language` column (`fa`, `en`).
- The structured résumé is not in the DB: one JSON file per culture in the API project (ADR-013).
- Translations of the same item share a `translation_group` (UUID) → used for `hreflang` alternates and the
  language switcher.
- Slugs are unique **per language**. Adding a language = inserting rows, not migrating schema.

### 4.2 Slugs
Slugs are latin `[a-z0-9-]` only, entered/edited by the admin (with a suggestion field). Reason: Persian
slugs become long percent-encoded URLs when shared (e.g. in Telegram). See learning.md §Slugs.

## 5. Request flow

### 5.1 Public page (e.g. `/fa/blog/my-first-post`)
1. Caddy terminates TLS → path is not an API path → forwards to `frontend:3000`.
2. `proxy.ts` validates the locale, creates the per-request CSP nonce (ADR-025) and sets security headers.
3. The page (React Server Component) calls the API through the typed client at `API_INTERNAL_URL`
   (`http://api:8080` in Docker): `GET /api/posts/fa/my-first-post`. The fetch is cached in Next's data cache with
   tags (`blog`, `post:{id}`).
4. The API service queries via `IAppDbContext` with `AsNoTracking()` + projection to `PostDetailsDto` (cached
   sanitized `body_html`, approved comments) and returns `Server-Timing` (DB time, query count).
5. Next renders HTML (`<html lang="fa" dir="rtl">`, metadata API for title/OG/JSON-LD/canonical) and streams it;
   client components (spotlight, demos, X-Ray) hydrate afterwards.

### 5.2 Admin writes a post
1. `/admin/posts/new` (Next admin UI). `proxy.ts` redirects to `/admin/login` when there is no auth cookie — UX
   only; **the API is the gate**: every `/api/admin/*` endpoint requires the `Admin` policy.
2. Markdown editor + preview pane: the client debounces input → `POST /api/admin/markdown/preview` → the API renders
   with the **same** `IMarkdownRenderer` → preview is identical to production.
3. Save → `POST /api/admin/posts` → `PostAdminService.CreateAsync` → FluentValidation → slug check → render → save →
   `IFrontendRevalidator.RevalidateAsync(["blog", "post:{id}"])` → Next drops those cached fetches.

### 5.3 Comment submission
1. The post page (server) asks the API for a signed form token (Data Protection, issued at render) and renders the
   form with a **honeypot** field (visually hidden, `tabindex=-1`, `autocomplete=off`).
2. `POST /api/posts/{id}/comments` → `ISpamGuard` rejects when: honeypot filled, submitted < 3 s after render or
   token older than 24 h, or the `public-forms` rate limiter trips.
3. Bot-like submissions get the *same* success response as humans (don't teach bots) but are not stored (or stored
   as `Spam` when honeypot-caught, for tuning).
4. Valid → saved as `Pending` → optional admin notification (flag `Notifications.Email`).
5. Admin approves → status `Approved` → revalidate tag `post:{id}`.

### 5.4 Language resolution for `/`
`/` has no locale segment and only **redirects** (302) — in `proxy.ts`, in order:
1. `lang` cookie (explicit choice from the language switcher)
2. *(P15)* GeoIP country → `IR` ⇒ `fa`, else ⇒ `en`
3. `Accept-Language` header, filtered by supported locales
4. Default: `fa` (becomes `en` with the international move, ADR-023)

Exception: Caddy sends `/` from a terminal client (`curl`/`Wget`/`HTTPie` User-Agent, no `text/html` in `Accept`)
to the API, which returns the plain-text résumé card (P10-T5; `Vary: User-Agent, Accept`).

### 5.5 Authentication (same origin)
`POST /api/auth/login` (rate limit `login`, Identity lockout) sets the Identity cookie (`HttpOnly`, `Secure`,
`SameSite=Strict`). Because the browser sees one origin, the cookie is sent to `/api/*` automatically — no CORS, no
token in JavaScript. Server components forward the incoming cookie when they call `/api/admin/*`. Unsafe methods
on the API also require a same-origin `Origin` header (CSRF defence in depth); details fixed in P5-T3.

## 6. Routing

**Front-end (Next.js App Router)** — every public route lives under `app/[locale]/`; `[locale]` accepts only the
configured locales (`fa`, `en`), anything else is a 404. Admin routes live under `app/admin/` (no locale; Persian UI).

| URL | Page |
|---|---|
| `/` | redirect → `/fa` or `/en` (§5.4); `curl` → API card |
| `/{locale}` | Home (Bento grid) |
| `/{locale}/about` · `/services` · `/resume` · `/contact` (`?type=hiring\|project`) | static pages |
| `/{locale}/decisions` | Engineering decisions (ADR cards) |
| `/{locale}/projects`, `/{locale}/projects/{slug}` | Projects + case study + live demo |
| `/{locale}/blog`, `/{locale}/blog/{slug}`, `/{locale}/blog/tag/{slug}` | Blog |
| `/{locale}/under-the-hood` | Architecture scrollytelling + live metrics (P11) |
| `/{locale}/search` | Semantic search (P12, flag `Ai.SemanticSearch`) |
| `/{locale}/_styleguide` | Dev-only UI kit page (404 in production) |
| `/sitemap.xml`, `/robots.txt`, `/{locale}/feed.xml` | Next route handlers (data from the API) |
| `/admin/...` | Admin UI |

**API (ASP.NET Core)** — everything under `/api`, lowercase, no trailing slash; language is part of the path or a
`lang` query parameter, never inferred from headers.

| URL | Purpose |
|---|---|
| `/api/site` | name, social links, public feature flags |
| `/api/projects?lang=`, `/api/projects/{lang}/{slug}` | projects |
| `/api/posts?lang=&page=`, `/api/posts/{lang}/{slug}`, `/api/tags/{lang}/{slug}` | blog |
| `/api/demos/cinema/*`, `/api/demos/gym/*` | live demo sandboxes (ADR-027) |
| `/api/resume.json?lang=`, `/llms.txt`, `curl /` | machine-readable résumé (P10) |
| `/api/status` | public status JSON (P11) |
| `/api/auth/*`, `/api/admin/*` | login/logout/me; admin (policy `Admin`) |
| `/mcp` | MCP server, read-only (P12, flag `Ai.Mcp`) |
| `/media/{key}` | uploaded files (long cache headers) |
| `/health`, `/health/ready` | infra (not routed publicly by Caddy in prod except `/health`) |

`/internal/*` on the front-end (revalidation hook) is blocked by Caddy; only the API calls it over the docker network
with a shared secret (`Revalidate__Secret`).

## 7. Cross-cutting concerns

| Concern | Approach |
|---|---|
| Configuration | API: `appsettings.json` → env vars (`Section__Key`), Options + `ValidateOnStart()`. Front-end: env vars validated at startup in `src/lib/env.ts` (server-only values never prefixed `NEXT_PUBLIC_`). Secrets only in env/.env. |
| Feature flags | API `FeatureManagement` section: `Newsletter.Signup` (true), `Newsletter.Sending` (false), `Notifications.Email` (false), `Comments.Enabled` (true), `Analytics.Umami` (true in prod), `Ai.SemanticSearch`, `Ai.Mcp` (true once built), `Ai.AdminAssistant` (false), `Ai.Chat` (false, backlog). The front-end reads the public ones from `GET /api/site`. |
| API contract | `openapi/v1.json` is generated by the API build and committed; `pnpm gen:api` regenerates the TS types; CI fails when either is stale (ADR-026). |
| Outbound HTTP | Only to Mahdi's own projects (health checks) and the admin AI provider; typed `HttpClient`s with timeouts. |
| Public telemetry | Only numbers this site measures (ADR-018). Never public: CPU/RAM, container names, package versions, internal hostnames. |
| Errors | API: ProblemDetails for every error, `Result<T>` for expected failures. Front-end: `not-found.tsx` / `error.tsx` per locale; API 404 → page 404. |
| Logging | API: Serilog, request logging, correlation via `TraceIdentifier`. No PII (emails, IPs) in logs. |
| Security | HTTPS/HSTS (prod); HTML responses: CSP with per-request nonce from `proxy.ts` (ADR-025), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`; API: same headers + `Cache-Control: no-store` on auth/admin; rate limiting (`public-forms`, `login`, `public-api`); Identity lockout; admin 2FA in P13. |
| Data Protection | API keys persisted to `/app/data/dp-keys` (volume `dpkeys`) — otherwise every restart logs the admin out and invalidates form tokens. |
| Caching | Next data cache with tags for API fetches; the API calls the revalidate hook after writes. HTML is rendered per request (nonce), data is cached. Static assets (`/_next/static`, fonts) are fingerprinted and `immutable`. |
| Files | `IFileStorage` → `LocalFileStorage` (volume). Allow-list of content types + magic bytes, max size, random storage key. |
| Email | `IEmailSender` → `LoggingEmailSender` by default; `SmtpEmailSender` when a mail flag is on. |
| Time | API: `TimeProvider`, UTC everywhere. Front-end: `Intl.DateTimeFormat` with `calendar: 'persian'` and `timeZone: 'Asia/Tehran'` for `fa` (Persian digits come from the locale), Gregorian + Latin digits for `en`. |
| Health | `/health` (liveness) and `/health/ready` (DB) on the API; the front-end container has its own healthcheck route. |

## 8. Front-end architecture

- **Rendering model:** React Server Components by default; `"use client"` only for leaves that need the browser
  (spotlight, demos, keyboard, X-Ray toggle, theme toggle, forms). Pages render on the server per request (the CSP
  nonce makes HTML dynamic, ADR-025); API data is cached in Next's data cache and revalidated by tag.
- **Data access:** only through `src/lib/api/` (generated types + `openapi-fetch` client). Server components use the
  internal API URL; client components call same-origin `/api/...`.
- **i18n:** next-intl; `app/[locale]/layout.tsx` sets `<html lang dir>` (`fa` → `rtl`, `en` → `ltr`). UI strings in
  `messages/{locale}.json` (English dot-notation keys, same key set in both files — test). Long prose (About,
  Services, Decisions) in `content/*.{locale}.mdx`.
- **Styling:** Tailwind v4, tokens in `styles/globals.css` (`@theme`), default palette removed so only tokens exist.
  Logical utilities only (`ms-*`, `pe-*`, `start-*`), so RTL and LTR share every component.
- **Fonts:** self-hosted via `next/font/local` (preloaded, no layout shift): Vazirmatn (UI/body, Persian + Latin),
  JetBrains Mono (code); an optional display face is chosen in P2-T8 (OFL only).
- **Theme:** `data-theme="dark|light"` on `<html>`, dark by default; a tiny pre-paint script (with the CSP nonce)
  applies a saved choice before first paint.
- **Motion:** Motion for layout/UI animation, CSS for scroll-driven effects, View Transitions for page and fa ↔ en
  changes (no animation where unsupported). Every animation checks `prefers-reduced-motion`.
- **Accessibility:** WCAG AA contrast (test), keyboard operable, visible focus, every interactive showpiece
  (keyboard, demos, X-Ray) has a non-visual equivalent.

### 8.1 Design tokens

Token *names* stay stable; *values* are set in P2-T8 when Mahdi picks the accent color (ADR-024).

| Token | Use |
|---|---|
| `--color-bg` | page background (near-black in dark) |
| `--color-surface`, `--color-surface-2` | Bento cards, hover/inputs |
| `--color-border` | hairline card borders (the grid's structure) |
| `--color-text`, `--color-muted` | body and secondary text |
| `--color-accent`, `--color-accent-soft` | the single accent (links, buttons, spotlight glow, focus ring) — Mahdi's choice |
| `--color-success`, `--color-danger` | live status 🟢/🔴, demo outcomes |

All text/background pairs must meet WCAG AA (≥ 4.5:1); the focus ring and other non-text UI ≥ 3:1. A Vitest test
reads `globals.css` and enforces it (port of P1's `ColorContrastTests`).

### 8.2 Signature features (ADR-024)

| Feature | Where | How |
|---|---|---|
| **Bento grid + cursor spotlight** | Home | CSS grid of cards with hairline borders; one pointer listener writes `--x/--y` CSS variables (CSSOM, CSP-safe); radial-gradient glow on borders; off on touch and reduced motion |
| **Mechanical keyboard hero** | Home | React Three Fiber keycaps carrying the tech stack; hover or a real key press pushes the key and opens a glass card with projects that used it; static poster first (§8.3) |
| **Live demos** | Project pages + Home card | React mini-apps against real sandbox endpoints (ADR-027): cinema seat picking with a real "simultaneous purchase" race (one wins via a row lock), gym check-in + locker assignment with live capacity chart |
| **X-Ray mode** | Global toggle | Peels the UI layer back to show what produced it: real code excerpts (extracted at build time from marked regions in the repo, linked to GitHub), the queries and timings of *this* request (`Server-Timing`) |
| **Fluid fa ↔ en** | Language switcher | Navigation to the other locale's URL animated with View Transitions: shared elements slide to their mirrored places; URLs stay separate for SEO (ADR-006) |
| **Scrollytelling request journey** | Under the hood | A scroll-driven line follows a real request: browser → Caddy → Next.js → ASP.NET Core → PostgreSQL → back, annotated with this site's real stack and measured timings — nothing generic (ADR-018) |

### 8.3 Loading heavy parts

First paint is server-rendered HTML + CSS only. Heavy client code (Three.js, demo apps) loads with
`next/dynamic` after hydration or when its card scrolls into view; until then a static poster with the same size is
shown (no layout shift), and the poster stays for reduced-motion users or if WebGL is unavailable.

### 8.4 Retired: Razor Pages front-end (P1, 2026-10)

P1 built a server-rendered Razor front-end: Tailwind standalone CLI pipeline, botanical tokens and SVG motifs,
self-hosted fonts, culture-prefixed routing (`CultureRouteConvention`), resx, Persian formatting helpers
(`DateDisplay`, `<persian-date>`), Alpine.js CSP build, CSP with hashed inline scripts (ADR-020) and a theme toggle.
P2-T1 removes it from `PersonalSite.Api`; the ideas carry over (tokens + contrast test, self-hosted fonts, locale
prefixes, dark default, reduced motion). The code stays in git history (commits up to `eddf10e`).

## 9. Environments & deployment

| | Dev | Prod |
|---|---|---|
| Start | Host: `docker compose up -d db` + `dotnet watch` (API, :5080) + `pnpm dev` (frontend, :3000; rewrites `/api/*` to :5080) — **or** everything in compose behind Caddy on :8080 | `docker compose -f compose.yaml -f compose.prod.yaml up -d` |
| DB migrations | applied at API startup (Development only) | explicit step `docker compose run --rm api --migrate`, run by `deploy.sh` |
| TLS | none | Caddy + Let's Encrypt (§9.1) |
| Seed | `DevDataSeeder` (fake posts/projects), `DemoSeeder` | `AdminSeeder` from env vars, `DemoSeeder` |
| Images | built locally | two images (`api`, `frontend`) built in GitHub Actions, pushed to GHCR, pulled by the server |

**Operational notes for the Iranian server (kept out of application code):** Docker Hub / NuGet / npm / GitHub may
be throttled from Iranian IPs → images are built in CI abroad; the server only *pulls* (GHCR) or receives
`docker save | docker load` over SSH as a fallback. Moving servers = copy volumes + `pg_dump` restore + DNS change.

### 9.1 Domains

**Now (Iranian VPS):**

| Domain | Role |
|---|---|
| `mahdiazghandi.ir` | **canonical** — serves the site (`Site__BaseUrl`) |
| `www.mahdiazghandi.ir` | 301 → `https://mahdiazghandi.ir{path}` |
| `shahramazghandi.ir`, `www.shahramazghandi.ir` | 301 → `https://mahdiazghandi.ir{path}` |

**Later (ADR-023):** when Mahdi starts targeting foreign clients, the stack moves to a server abroad with a `.com`
domain (name chosen then) that becomes canonical and **English-first** (`/` defaults to `en`). What happens to the
`.ir` domains (301 to the `.com`, or a Persian mirror) is decided in P15.

- **One canonical host;** every other hostname answers with a 301 to the same path on it.
- **Config, not code:** the canonical URL is `Site__BaseUrl` (API) / `SITE_URL` (frontend); hostnames appear only in
  `deploy/Caddyfile` and `.env`. Switching domains or servers is a config + DNS change.
- **TLS:** Caddy obtains Let's Encrypt certificates for all hostnames (HTTP-01 on port 80; DNS-01 if needed).
- `.ir` domains are registered at IRNIC (nic.ir) — keep renewal dates in the deploy notes.

## 10. Testing strategy

| Layer | What | Tool |
|---|---|---|
| Domain | invariants (slug format, status transitions, seat holds) | xUnit + Shouldly |
| Application | services with validation & rules on real PostgreSQL (no EF InMemory) | xUnit, Testcontainers.PostgreSql |
| API | status codes, auth/policies, rate limits, honeypot, OpenAPI document is current | WebApplicationFactory + Testcontainers |
| Front-end units | formatters (Persian dates/digits), components, message-key parity, token contrast | Vitest + Testing Library |
| End-to-end | both locales × both themes × 360/1440 px, no CSP violations, axe accessibility, key journeys (contact, admin login, demo) | Playwright + @axe-core/playwright, against the compose stack |
| Manual | Lighthouse, visual check of signature features | Chrome DevTools |

Integration tests share one `WebAppFactory` (xUnit assembly fixture) that owns one PostgreSQL container and runs the
API in a `Testing` environment (production-like: no user-secrets, no auto-migrate).

## 11. Decision log (ADRs)

- **ADR-001 Razor Pages over MVC.** *Superseded by ADR-021 (2026-10-18).* Content pages mapped 1:1 to URLs; Razor Pages kept page + handler together. Replaced by a Next.js front-end + ASP.NET Core API.
- **ADR-002 Light Clean Architecture (4 projects).** Enforces dependency direction at compile time — valuable for learning — without CQRS/MediatR overhead. Services per feature instead of one handler per use case. The fourth project is now `PersonalSite.Api`.
- **ADR-003 No MediatR / AutoMapper / FluentAssertions.** All three went commercial for new versions in 2025 and add indirection. Plain services + hand-written `ToDto()` projections are explicit and fast.
- **ADR-004 `IAppDbContext` instead of repositories.** EF Core's `DbContext` already *is* a unit of work + repository. Application depends on `IAppDbContext`. Trade-off accepted: Application references EF Core; in exchange we skip a layer of pass-through code.
- **ADR-005 Markdown stored in DB, rendered HTML cached.** Admin-editable, fast reads, one render path (the API). The front-end inserts only this sanitized HTML (the single allowed `dangerouslySetInnerHTML`).
- **ADR-006 Locale-prefixed URLs for every language (`/fa/...`, `/en/...`).** Unambiguous, cache-friendly, SEO-friendly (hreflang). Now implemented by Next.js `[locale]` segments.
- **ADR-007 Self-host every runtime asset.** No CDNs/Google Fonts/hosted widgets at runtime: works under filtering, strict CSP, privacy, no migration surprises. Build-time packages (npm/NuGet) are fine — they ship inside our images.
- **ADR-008 Tailwind standalone CLI.** *Superseded by ADR-021.* Avoided a Node toolchain while the UI was Razor; the front-end is now a Node app, so Tailwind runs through PostCSS there.
- **ADR-009 Single PostgreSQL instance, separate DB for Umami.** One thing to back up and monitor; isolation via separate database + user. Demo sandboxes use a separate `demo` schema in the site DB.
- **ADR-010 Comments moderated, no third-party service.** Honeypot + timing token + rate limit stops most bots without CAPTCHAs (reCAPTCHA is unreliable in Iran).
- **ADR-011 Newsletter behind feature flags.** Data model and signup ship first; sending is off until an email provider is chosen. Double opt-in designed in.
- **ADR-012 About/Services prose in localized files, not DB.** These change rarely; keeping them in git avoids an admin UI. *Amended:* now localized MDX in `frontend/content/` (was localized Razor views); résumé data per ADR-013.
- **ADR-013 Structured résumé as one source, many renderings.** A typed `ResumeProfile` loaded from one JSON file per culture in the API project, validated at startup. The Resume page, About skills grid, `/api/resume.json`, the `curl` card, `llms.txt`, the keyboard hero's tech cards and MCP all render the same data, so they can never disagree.
- **ADR-014 AI is an optional, local-first layer.** Visitor-facing AI (semantic search, related posts, MCP) uses a small in-process ONNX embedding model and pgvector — no external API. Every AI feature sits behind an `Ai.*` flag; with all flags off the site is complete.
- **ADR-015 Admin-only AI assistant via an OpenAI-compatible Iranian gateway (AvalAI).** Narrow exception to "no Iran-specific services": only Mahdi uses it; flag off by default, token budget, never auto-publishes. Behind `IChatClient`, switching providers after moving abroad is a config change.
- **ADR-016 Bilingual from the start of the new front-end.** European employers are a main audience; every page is written in `fa` and `en` as it is built (English enabled in P2-T6). Only GeoIP language selection stays late (P15).
- **ADR-017 One public identity: Mahdi Azghandi.** "Shahram Azghandi" is `alternateName` in JSON-LD, `shahramazghandi.ir` 301-redirects, and About mentions it once.
- **ADR-018 Honest public telemetry.** Only numbers the site actually measures are shown. No CPU/RAM, container names or package versions, no availability percentage the site can't measure. Applies to X-Ray and scrollytelling too: they show this site's real stack and this request's real timings.
- **ADR-019 Two audiences via two paths, not a persona toggle.** Recruiters and clients get clear paths from Home and a request type on the contact form.
- **ADR-020 Inline scripts allowed by CSP hash, not nonce.** *Superseded by ADR-025.* Was right for cached Razor HTML; Next.js emits per-page inline scripts that a fixed hash can't cover.
- **ADR-021 Two applications: Next.js front-end + ASP.NET Core API, one origin.** Mahdi's positioning is now full-stack (ADR-022), and React/TypeScript must be shown in real, production-shaped code — the separated SPA/SSR front-end + Web API split is what full-stack roles use. Caddy serves both under one domain (`/api/*` → API, rest → Next.js), so the Identity cookie works without CORS or tokens in JavaScript. Cost accepted: two runtimes in production, a Node toolchain, and P1's Razor UI rebuilt in React. Rejected alternative: Razor Pages + React islands (smaller change, but less representative of full-stack work).
- **ADR-022 Positioning: full-stack engineer (.NET + React/TypeScript).** The site sells both halves: back-end depth (concurrency, data, deployment under constraints) made visible by a front-end worth looking at. Every showpiece must reveal something real about the back-end.
- **ADR-023 Hosting now in Iran, later abroad with `.com` and English-first.** The site launches on the Iranian VPS with the `.ir` domains and Persian as default. When Mahdi targets foreign clients, it moves to a foreign server with a `.com` domain and English as the default language. Everything that would change (hostnames, base URL, default locale) is configuration, and all state lives in volumes, so the move is a runbook (P15), not a rewrite.
- **ADR-024 Design direction: dark Bento grid, single accent, strong typography.** The botanical direction (P1) is retired. The new look: near-black background, hairline-bordered Bento cards with a cursor spotlight, one accent color chosen by Mahdi, large confident Persian/English typography, and the signature features in §8.2. Dark is the default; the light theme must still work.
- **ADR-025 CSP with a per-request nonce; HTML rendered per request.** Next.js needs inline scripts that differ per page, so scripts are allowed by a nonce created in `proxy.ts` (`script-src 'nonce-…' 'strict-dynamic'`, no `unsafe-eval`). A nonce makes every HTML response unique, so pages render per request and caching happens at the data layer (tagged fetches) instead. Styles allow `'unsafe-inline'`: React, Motion and `next/image` set `style` attributes, and style injection is far less dangerous than script injection — scripts stay strict.
- **ADR-026 Typed API contract from OpenAPI.** The API generates `openapi/v1.json` at build time; the front-end generates TypeScript types and a typed client from it. A renamed field breaks the front-end build instead of production. CI fails if the committed document or the generated types are stale.
- **ADR-027 Live demos run against real endpoints with sandboxed data.** A demo that only animates is a video; the point is to show the back-end working. Demos call `/api/demos/*`, which use real services and a real database in a separate `demo` schema with fake data, rate-limited and reset regularly. The gym demo uses invented members only (client permission given for the case study). Labelled "Live demo — sandbox data".
