# Architecture

> Source of truth for *how the system is built*. If code and this document disagree, fix one of them in the same PR.
> Decisions are recorded in the **Decision Log** at the bottom (ADR-style, one paragraph each).
>
> **2026-10-18 — full-stack split (ADR-021…027).** The site is now two applications: a **Next.js (React +
> TypeScript) front-end** and an **ASP.NET Core API**. Phase 1 built a Razor Pages front-end; `P2-T1` removed it
> (summary in §8.4). Sections below describe the target; what is not built yet is tied to its task.

---

## 1. System overview

A personal website (resume, portfolio with live demos, blog, services) with a private admin panel. The browser only
ever talks to **one origin**; Caddy splits the traffic between the two apps (in production: the server's shared edge
proxy, §9 and ADR-028).

```
                         Internet
                            │  HTTPS (443)
                      ┌─────▼─────┐
                      │   Caddy   │  TLS, compression, routing by path (and User-Agent for `curl /`); prod: shared edge
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
          volumes: pgdata · uploads · dpkeys  (edge: caddy_data)
```

- **frontend** renders every HTML page (public site + admin UI) on the server and hydrates the interactive parts.
  It has no database access: all data comes from the API through a typed client (ADR-026).
- **api** owns the data, business rules, authentication (ASP.NET Identity cookie), file uploads, rate limiting and
  the machine-readable endpoints (`/api/resume.json`, `curl` card, `llms.txt`, MCP).
- Nothing on a public request path calls a third-party service (no CDN, no Google Fonts, no hosted comments/email/
  analytics/AI). npm and NuGet packages are bundled at build time — that is not a runtime dependency.

The only outbound HTTP calls are: health checks of Shahram's **own** deployed projects (P6-T8), and — admin-only,
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
| AI (planned, P12) | Microsoft.Extensions.AI; ONNX Runtime local embeddings; pgvector; MCP C# SDK | each approved by Shahram in its task |
| CI | GitHub Actions | builds both images **abroad**, pushes to GHCR |

## 3. Repository layout

```
my-website/
├─ CLAUDE.md  README.md  architecture.md  rules.md  roadmap.md  TASKS.md  learning.md
├─ global.json  Directory.Build.props  Directory.Packages.props  PersonalSite.slnx
├─ .editorconfig  .gitignore  .dockerignore  .env.example
├─ compose.yaml                    # services: frontend, api, db; volume definitions
├─ compose.override.yaml           # dev: caddy on 127.0.0.1:8080, db on 127.0.0.1:5433
├─ compose.prod.yaml               # prod: GHCR images (IMAGE_TAG), restart, log caps, limits, loopback ports for the edge
├─ deploy/  (Caddyfile.dev (P2-T5), personalsite.caddy (prod routes, template), edge/ (shared edge proxy, ADR-028),
│           SHARED-SERVER.md, postgres/init/, scripts/)
├─ .github/workflows/ (ci.yml — .NET job + frontend job; release.yml — CI, then both images → GHCR)
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
   ├─ content/                     # localized prose (MDX): about.fa.mdx, about.en.mdx, services.*.mdx, decisions.*.mdx
   ├─ public/                      # fonts are NOT here (next/font/local reads src/fonts)
   ├─ e2e/                         # Playwright tests
   └─ src/
      ├─ app/[locale]/             # public routes (layout, page, about/, projects/, blog/ …)
      ├─ app/admin/                # admin UI (Persian only)
      ├─ app/internal/             # health/ (container healthcheck), revalidate/ (P7) — Caddy answers 404
      ├─ components/ ui/ layout/ (HtmlDocument) theme/ (ThemeScript, ThemeToggle) bento/ (home cards) demos/ xray/ keyboard/
      │              about/ (Timeline, Bridges, Skills, PhotoSlot — the components content/about.*.mdx may use)
      │              services/ (ServiceList, Service, Steps, Step for content/services.*.mdx; ProjectCta)
      │              resume/ (ResumeExperience, ResumeEducation, ResumeSkills, DownloadPdf; period.ts)
      │              contact/ (ContactLinks, EmailLink — obfuscated mailto, FormPlaceholder)
      │              decisions/ (DecisionList, Decision, Challenge/Choice/Why for content/decisions.*.mdx)
      ├─ mdx-components.tsx        # @next/mdx: how every MDX element (h2, p, a …) renders; internal links via next-intl Link
      ├─ lib/ api/ (schema.d.ts generated; server.ts, browser.ts clients) env.ts
      │       i18n/ (config.ts: locales, cookie, time zone; request.ts; resolve-locale.ts) format/ (date, number)
      │       site/ (getSiteInfo) resume/ (getResume) contact/ (request-type, email, display-url) theme/ (theme.ts: pre-paint script, switchTheme) fonts.ts security/nonce.ts
      ├─ instrumentation.ts        # server start: validates env (instrumentation-node.ts exits on a bad value)
      ├─ fonts/                    # self-hosted woff2 + licences
      ├─ styles/globals.css        # Tailwind entry + tokens
      ├─ lib/security/headers.ts   # CSP builder + static security headers (used by proxy.ts)
      └─ proxy.ts                  # Next.js 16 request hook (formerly middleware): `/` redirect, CSP nonce per page
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
├─ Common/            Entity.cs (Id, CreatedAt, UpdatedAt), IAuditable, Slug.cs (value object), Language.cs (enum Fa/En)
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
├─ Site/              SiteOptions, SiteInfoService + DTOs (name, social links, public feature flags → GET /api/site)
├─ Resume/            ResumeProfile records, ResumeContent (options: fa + en), ResumeContentValidator, ResumeService
├─ Blog/  Projects/  Contact/  Newsletter/  Demos/  Search/ (P12)  Assistant/ (P12)
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
├─ Configuration/                Api-only Options classes (FrontendOptions …), all ValidateOnStart; options that
│                                Application services read (SiteOptions) live in Application, bound + validated here
│                                ResumeContentLoader: reads Content/resume.{fa,en}.json (strict JSON) → ResumeContent
├─ Endpoints/                    one static class per feature: SiteEndpoints, ProjectEndpoints, BlogEndpoints,
│                                AdminPostEndpoints, AuthEndpoints, DemoEndpoints, ResumeEndpoints, CurlCardEndpoint,
│                                LlmsTxtEndpoint, HealthEndpoints, McpEndpoints (P12) — mapped under MapGroup("/api")
├─ Infrastructure/               SecurityHeadersMiddleware (API responses), HealthProbe, Routes (path constants),
│                                LanguageParameter (strict fa|en binding for `lang`),
│                                OpenApiGeneration (build-time doc run), OpenApiLineEndings (
 in descriptions)
└─ Content/                      resume.fa.json, resume.en.json (ADR-013): read once at startup, validated
                                 (ValidateOnStart), served by GET /api/resume; both files must state the same facts
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
on the API also pass a same-origin check (CSRF defence in depth, P5-T3, below).

**Setup (P5-T1):** `AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>`; `AppUser : IdentityUser<Guid>`
(`Infrastructure/Identity`, Id = UUID v7). Tables `asp_net_users`, `asp_net_roles`, `asp_net_user_roles`, `…_claims`,
`…_logins`, `…_tokens`, `asp_net_role_claims` (renamed in `Persistence/Configurations/IdentityConfigurations.cs`:
Identity sets explicit names the snake_case convention leaves alone). `Api/Configuration/AdminAuthentication.cs`:
`AddIdentityCore` (no Razor UI defaults) + roles + EF stores + `SignInManager`; password = length ≥ 12, no composition
rules; lockout 5 failures → 15 min; cookie `__Host-admin` (`HttpOnly`, `Secure` always, `SameSite=Strict`, 7 days
sliding) as the default scheme; challenge → 401 and forbid → 403 (no redirect), turned into ProblemDetails by
`UseStatusCodePages`. `UseAuthentication`/`UseAuthorization` run after request logging.

**Endpoints (P5-T3):** `POST /api/auth/login` `{email, password}` → 204 + cookie (persistent, 7 days sliding);
empty or over-long fields (> 256) → 400; anything else wrong — unknown email, wrong password, locked out, not in the
`Admin` role — → one `401 auth.invalid_credentials`, and an unknown email runs a decoy hash so timing tells nothing
(`Api/Auth/AdminSignIn.cs`). `POST /api/auth/logout` → 204 (also without a session). `GET /api/auth/me` → `{email}`
or 401. Every `/api/auth/*` response has `Cache-Control: no-store` (`SecurityHeadersMiddleware`, by path, so 401s
from the authorization middleware get it too). Return URLs after login are the front-end's job, local paths only.
**Rate limit `login`** (`Api/Configuration/RateLimiting.cs`): fixed window, 10 per client IP per 15 min, no queue;
rejected → 429 `request.rate_limited` + `Retry-After`. The IP is the one `UseForwardedHeaders` accepted from the edge.
**Cross-origin check** (`Api/Infrastructure/CrossOriginProtectionMiddleware.cs`, the algorithm of Go's
`http.CrossOriginProtection`), for POST/PUT/PATCH/DELETE on every path: `Sec-Fetch-Site` present → only
`same-origin`/`none` pass; otherwise `Origin` present → must equal the request's scheme + host; neither header → not
a browser (Next.js server, curl), passes. Rejected → 403 `request.cross_origin`. Pipeline: … request logging →
cross-origin check → rate limiter → authentication → authorization → endpoint.
**Error codes** live in `Api/Infrastructure/ErrorCodes.cs` (ProblemDetails member `code`).

**Authorization convention (P5-T4):** policy `Admin` = signed in + role `Admin` (`Api/Configuration/AuthorizationPolicies.cs`).
It is set once on the `/api/admin` group in `ApiEndpoints` (also 401/403 in the OpenAPI document), never per
endpoint; `GET /api/auth/me` uses it too. `Auth/AdminAuthorizationTests` reads every `/api/admin*` route from the
routing table and checks the policy metadata, anonymous → 401 and a signed-in non-admin → 403, so new admin endpoints
are covered without editing the test. First endpoint: `GET /api/admin/dashboard` → `AdminDashboardDto` (counts; zero
until each feature exists, `Application/Admin/AdminDashboardService`). `no-store` covers `/api/admin/*` too.

**Admin seeding (P5-T2):** `Persistence/Seed/AdminSeeder` runs right after migrations (the `--migrate` step;
Development startup), never on a normal production start. In one transaction: ensure role `Admin` (`AppRoles.Admin`)
→ any member already? `AlreadyExists` (settings ignored; a seeded password is never overwritten) → `Admin:Email` +
`Admin:Password` unset? `NotConfigured` + warning, exit 0 → else create the user (email confirmed, lockout on) and add
it to the role; an Identity error (e.g. short password) throws, so the deploy step fails. `AdminSeedOptions`:
both or neither (`ValidateOnStart`; in `--migrate` on first use). No registration endpoint exists (a test scans the
endpoint data source for `register`/`signup`).

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
| `/admin`, `/admin/login`, `/admin/...` | Admin panel (no language prefix, `noindex`; P5-T5, §8.5) |

**API (ASP.NET Core)** — everything under `/api`, lowercase, no trailing slash; language is part of the path or a
`lang` query parameter, never inferred from headers.

| URL | Purpose |
|---|---|
| `/api/site` | name, social links, public feature flags |
| `/api/resume?lang=fa\|en` | structured résumé for the pages (ADR-013); unknown `lang` → 400 |
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
| Configuration | API: `appsettings.json` → env vars (`Section__Key`), Options + `ValidateOnStart()`. Front-end: env vars validated at startup in `src/lib/env.ts` (server-only values never prefixed `NEXT_PUBLIC_`; `API_INTERNAL_URL` = where the Next server reaches the API; host defaults in the committed `frontend/.env.development`); a bad value makes the server exit (1) at start, `next build` needs none. Secrets only in env/.env. |
| Feature flags | API `FeatureManagement` section: `Newsletter.Signup` (true), `Newsletter.Sending` (false), `Notifications.Email` (false), `Comments.Enabled` (true), `Analytics.Umami` (true in prod), `Ai.SemanticSearch`, `Ai.Mcp` (true once built), `Ai.AdminAssistant` (false), `Ai.Chat` (false, backlog). The front-end reads the public ones from `GET /api/site`. |
| API contract | `openapi/v1.json` is generated by every API build (`Microsoft.Extensions.ApiDescription.Server`, not in the Docker image build) and committed; `pnpm gen:api` regenerates the TS types; CI fails when either is stale (ADR-026). During generation the app runs without config, so `ValidateOnStart` and the dev migration are skipped and the production keys directory is ignored (`OpenApiGeneration.IsRunning`). A 500 ProblemDetails response is declared once on the `/api` group. |
| Outbound HTTP | Only to Shahram's own projects (health checks) and the admin AI provider; typed `HttpClient`s with timeouts. |
| Public telemetry | Only numbers this site measures (ADR-018). Never public: CPU/RAM, container names, package versions, internal hostnames. |
| Errors | API: ProblemDetails for every error, `Result<T>` for expected failures. Front-end: `not-found.tsx` / `error.tsx` per locale; API 404 → page 404. |
| Logging | API: Serilog, request logging, correlation via `TraceIdentifier`. No PII (emails, IPs) in logs. |
| Security | HTTPS/HSTS (prod); HTML responses: CSP with per-request nonce from `proxy.ts` (ADR-025), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`; API: same headers + `Cache-Control: no-store` on auth/admin; rate limiting (`public-forms`, `login`, `public-api`); Identity lockout; admin 2FA in P13. |
| Data Protection | API keys persisted to `/app/data/dp-keys` (volume `dpkeys`; `DataProtection:KeysDirectory` in `appsettings.Production.json`), application name `PersonalSite` — otherwise every restart logs the admin out and invalidates form tokens. Unset in dev/tests (per-user default). |
| Reverse proxy | `UseForwardedHeaders` first in the pipeline (`X-Forwarded-For`, `X-Forwarded-Proto`); trusted only from loopback + `ReverseProxy:TrustedNetworks` (prod: the compose network pinned to `172.30.0.0/24` in `compose.prod.yaml` — the edge's connections arrive through the published loopback ports from its gateway `172.30.0.1`). HSTS (`UseHsts`, defaults: 30 days, no subdomains/preload) outside Development (Caddy also sets it on every response, incl. Next.js pages); no HTTPS redirection in the API — Caddy does it. |
| Container isolation | Prod (P4-T7, `deploy/SHARED-SERVER.md §6`): every service `cap_drop: [ALL]` (db adds back 5 for its entrypoint), `no-new-privileges`, read-only root filesystem + tmpfs, `pids_limit 256`; db only on the `internal` network `backend` (api ↔ db). Request bodies: edge 10 MB, API (Kestrel) 1 MB. |
| Caching | Next data cache with tags for API fetches; the API calls the revalidate hook after writes. HTML is rendered per request (nonce), data is cached. Static assets (`/_next/static`, fonts) are fingerprinted and `immutable`. |
| Files | `IFileStorage` → `LocalFileStorage` (volume). Allow-list of content types + magic bytes, max size, random storage key. |
| Email | `IEmailSender` → `LoggingEmailSender` by default; `SmtpEmailSender` when a mail flag is on. |
| Time | API: `TimeProvider`, UTC everywhere. Front-end: `Intl.DateTimeFormat` with `calendar: 'persian'` and `timeZone: 'Asia/Tehran'` for `fa` (Persian digits come from the locale), Gregorian + Latin digits for `en`. |
| Health | `/health` (liveness) and `/health/ready` (DB) on the API; the front-end container has its own healthcheck route. |

## 8. Front-end architecture

- **CSP (ADR-025, P2-T7):** `proxy.ts` runs for every page (not `/api`, `/_next/static`, `/internal`, prefetches),
  creates a 128-bit nonce, and sends `script-src 'self' 'nonce-…' 'strict-dynamic'` on the request (Next reads it and
  stamps the nonce on its scripts) and on the response (the browser enforces it). Dev adds only `'unsafe-eval'` and
  `ws:`. Hence every page is dynamic: `await connection()` in `app/[locale]/layout.tsx` (and `app/not-found.tsx`).
  `e2e/csp.spec.ts` (in CI) fails on any violation; new HTML routes are added to its `routes` list.
- **Rendering model:** React Server Components by default; `"use client"` only for leaves that need the browser
  (spotlight, demos, keyboard, X-Ray toggle, theme toggle, forms). Pages render on the server per request (the CSP
  nonce makes HTML dynamic, ADR-025); API data is cached in Next's data cache and revalidated by tag.
- **Data access:** only through `src/lib/api/` (generated types + `openapi-fetch` client). Server components use the
  internal API URL; client components call same-origin `/api/...`.
- **i18n:** next-intl **without its middleware** (only messages, `getTranslations`, typed keys); `app/[locale]/layout.tsx`
  is the root layout and sets `<html lang dir>` (`fa` → `rtl`, `en` → `ltr`); `generateStaticParams` + `dynamicParams =
  false` make any other first segment a 404; `proxy.ts` only redirects `/` (302, §5.4). Dates/numbers: `src/lib/format/`
  on `Intl` (fa: `persian` calendar + `arabext` digits, en: `gregory` + `latn`, both in `Asia/Tehran`), rendered on the
  server so the browser's ICU never decides. UI strings in
  `messages/{locale}.json` (English dot-notation keys, same key set in both files — test). Long prose (About,
  Services, Decisions) in `content/*.{locale}.mdx`, compiled at build time by `@next/mdx` (P3-T4; `@content/*` path
  alias, no frontmatter, no imports inside MDX — pages pass the allowed components in). `src/lib/content/content.test.ts`
  checks every page exists in both languages with the same components, headings and internal links. Prettier skips
  `*.mdx` (its MDX 1 parser corrupts MDX 3 comments).
- **Styling:** Tailwind v4, tokens in `styles/globals.css` (`@theme`), default palette removed so only tokens exist.
  Logical utilities only (`ms-*`, `pe-*`, `start-*`), so RTL and LTR share every component.
- **Fonts:** self-hosted via `next/font/local` in `src/lib/fonts.ts` (served from `/_next/static/media`, size-adjusted
  fallback, no layout shift): Vazirmatn variable (UI/body, Persian + Latin, preloaded), JetBrains Mono 400/700 (code,
  not preloaded — few pages show code). Their CSS variables feed `--font-sans`/`--font-mono` (`@theme inline`).
  `code, kbd, samp, pre` are always LTR and bidi-isolated. Display face: none yet (optional, Shahram's pick, OFL only).
- **Layout shell (P2-T9):** `app/[locale]/layout.tsx` renders `SkipLink` → `SiteHeader` (name, `mainNav` from
  `src/lib/site/navigation.ts` with `aria-current`, `LanguageSwitcher`, `ThemeToggle`, `MobileMenu` below `lg`) →
  `<main id="main">` → `SiteFooter` (configured social links from `/api/site`, year via `formatYear`). Links use
  next-intl's `Link` from `src/lib/i18n/navigation.ts`. The language switcher is a plain `<a>` (full document load)
  to the same path + query in the other locale; its click sets the `lang` cookie; cross-document View Transitions
  (`@view-transition` in `globals.css`, off for reduced motion) slide the `site-*` named parts to their mirrored places.
  404s: `app/[locale]/[...rest]` → `notFound()` → `app/[locale]/not-found.tsx` inside the layout; `proxy.ts` rewrites
  an unknown first segment (`/de/x`) to `/{visitor locale}/de/x`, so it gets the same page in the visitor's language.
  `app/[locale]/error.tsx` replaces only the page (digest shown in development only); errors in the layout itself
  (e.g. `/api/site` down) are not caught by it.
- **UI kit (P2-T10):** `src/components/ui/` — `Button` (`<button>`, `type="button"` by default) and `ButtonLink`
  (locale-aware `Link`) share `button-styles.ts` (primary/ghost/link); `Card`; `BentoGrid` (the only client
  component: 1 → 2 → 4 columns, one `pointermove` listener writes `--x/--y` per `.bento-card` once per frame,
  enabled by `matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)")` via
  `data-spotlight`) + `BentoCard` (`columns`/`rows` spans; glow drawn in `globals.css`); `Tag` (`dir="auto"`, so
  `C#` stays `C#` in RTL); `Badge` (`live`/`inProgress`/`archived`, labels from `ui.badge.*`); `SectionHeader`;
  `FormField` (`useId`, `aria-describedby` → hint + error, `aria-invalid`); `Alert` (danger `role="alert"`, else
  `status`). Classes joined by `src/lib/ui/cn.ts` (no tailwind-merge: a caller's `className` adds, never overrides).
  Every color pair used is one `contrast.test.ts` checks. Dev-only style guide: `app/[locale]/%5Fstyleguide`
  (`%5F` because `_folders` are private) → `/{locale}/_styleguide`, `notFound()` in production (e2e proves the 404);
  its sample text is in `samples.ts`, not `messages/*.json` (those reach the browser on every page).
- **Home (P3-T2):** `app/[locale]/page.tsx` fetches `/api/site` and `/api/resume?lang=` in parallel (`getSiteInfo`,
  `getResume`, both React-`cache()`d) and renders `components/bento/HomeBento` — a `BentoGrid` of, at lg:
  hero 2×2 (résumé headline, name as the page's only h1, pitch from `home.hero.pitch`, the reserved status-line slot
  for P11-T7) + keyboard 2×2 (`StackCard` → keyboard hero, below) / the two audience paths (`PathCard`: Resume + Decisions; Contact
  `?type=project` + Services) / `UpcomingCard`s for featured projects (2 wide, P6), live demo (P6), latest posts (P7)
  with an "In progress" badge instead of sample data (ADR-018). Each card is a `section` named by its heading
  (`Card`'s `labelledBy`). DOM order = reading order = the 1-column phone order. `e2e/home.spec.ts` checks the
  reflow (360/1440, RTL mirroring) and the path links.
- **About (P3-T4):** `app/[locale]/about/page.tsx` renders a header (eyebrow, h1 "From circuits to cloud", lead from
  `about.*` messages, `PhotoSlot` placeholder) and the language's MDX story with `{ Timeline, Bridges, Bridge, Skills }`.
  `Timeline` and `Skills` are async Server Components that read the locale (`getLocale`) and the résumé (`getResume`,
  cached per request): the timeline is the résumé's education reversed to oldest first (no dates shown) + a "today"
  step; the skills grid is `resume.skills`. `Bridge from to` cards say "In electrical engineering: … / In software: …"
  to screen readers; the arrow flips in RTL. The alternate name appears once, in the prose (ADR-017).
- **Services (P3-T5):** `app/[locale]/services/page.tsx` renders a header (`services.*` messages), the language's MDX
  with `{ ServiceList, Service, Steps, Step }` (five service cards under "What I offer", four `<ol>` step cards under
  "How I work") and `ProjectCta`, a `section` card whose button goes to `/contact?type=project` (same target as the
  home page's project path). Step numbers are a CSS counter (`.steps`/`.step`/`.step-number` in `globals.css`), so the
  prose never numbers steps and `:lang(fa)` switches to the built-in `persian` counter style (۱ ۲ ۳). The CTA's words
  are UI strings in messages, not prose: the page owns them, so every language gets the same call to action.
- **Resume (P3-T6):** `app/[locale]/resume/page.tsx` fetches the résumé once (`getResume`) and renders one column
  (`max-w-4xl`): header (eyebrow, h1 = `basics.name`, headline, summary, "Based in …", `links` only when non-empty) +
  `DownloadPdf` (a disabled `Button` described by a hint until P9) + `components/resume/` `ResumeExperience` (role h3,
  organization, period, location, highlights, `tech` ids → techStack names as `Tag`s), `ResumeEducation`,
  `ResumeSkills`, each a `section` named by its h2 and given its part as props (an empty part renders nothing).
  Periods come from `formatPeriod` (`components/resume/period.ts`: `formatYearMonth` → fa `شهریور ۱۳۹۹`, end `null`
  → "Present"). Print: `@media print` in `globals.css` sets the light palette on `:root` (a test keeps it equal to the
  light theme) + `@page` margins; `print:hidden` on `SiteHeader`, `SiteFooter` and the download button;
  `break-inside-avoid` on entries. Text in the `resume.*` messages.
- **Contact (P3-T7):** `app/[locale]/contact/page.tsx` renders a header whose intro line depends on `?type=` —
  `parseContactRequestType` (`lib/contact/request-type.ts`) accepts only `hiring`/`project`, anything else gets the
  general line and is never echoed — then `components/contact/` `ContactLinks` (a `section` with one `Card` per
  configured `site.social` link, `auto-fit` grid; none configured → an info `Alert`) and `FormPlaceholder` (the P9
  form's slot, "In progress" `Badge`, no fake form). Email obfuscation: the server passes `encodeEmail(address)`
  (reversed character codes, so neither the HTML nor the RSC payload holds the address) to `EmailLink`, a client
  leaf that renders the fallback on the server and during hydration (`user [at] domain`, or the footer's "Email"
  label linking to the contact page) and the real `mailto:` right after (`useSyncExternalStore`, no effect). The
  footer uses the same component, so no page's HTML contains the address. Text in the `contact.*` messages.
- **Decisions (P3-T8):** `app/[locale]/decisions/page.tsx` renders a header (`decisions.*` messages) and the
  language's MDX with `{ DecisionList, Decision, Challenge, Choice, Why }`: six `Decision project title` cards (two
  across from md), each an `article` named by its h2, its three parts a `<dl>` whose `<dt>` labels (Challenge /
  Decision / Why) come from `decisions.parts` — so every language has the same structure, and three named part
  components let `content.test.ts` catch a translation that drops or swaps one. Nothing is collapsed (readable
  without interaction). Three cards are this site's ADRs (021, 026, 004); the gym, cinema and microservices cards
  carry visible `[placeholder]` facts for Shahram to confirm (ADR-018). Linked from the home hiring path, the About
  prose and the end of the Resume page (`resume.decisions`, a `t.rich` sentence with a `Link`; hidden in print);
  not in the main navigation.
- **Keyboard hero (P3-T3):** `lib/keyboard/keycaps.ts` turns the résumé into `Keycap`s on the server (`buildKeycaps`:
  each tech gets the first free letter/digit of its name as its key — C# → C, Next.js → X once N is taken — and the
  `experience` entries whose `tech` lists it; `keyboardLayout`: ≤ 4 per row). `components/keyboard/KeyboardHero`
  (client) owns the state (selected / hovered / held) and renders: a stage with fixed `aspect-ratio` (16/10, 5/4 at
  lg; `dir="ltr"`, `aria-hidden`) holding `KeyboardPoster` (HTML/CSS keycaps with a CSS perspective, first paint) and,
  when `useSceneAllowed` says so (WebGL + no reduced motion; false on the server), `KeyboardScene` via
  `next/dynamic({ ssr: false })` — R3F + drei `RoundedBox` keycaps, legends drawn on 2D canvases with the page's own
  fonts (no troika/font download/worker), colors read from the CSS tokens and re-read on theme change, soft hue-cycling
  underglow + point lights, `frameloop="never"` while off screen, error boundary → poster; then a hint, the
  accessible list (one `<button>` per tech: `aria-expanded`, `aria-controls` → card, `aria-keyshortcuts`) and the glass
  `TechCard` (after the list in the DOM; floats over the stage's top from sm, in flow below the list on phones).
  Real keys (`KeyboardEvent.code`) work while the pointer is over the stage or focus is in the hero (WCAG 2.1.4);
  modifiers and editable targets are ignored; Esc closes. `e2e/keyboard.spec.ts`: poster without JS, zero layout
  shift while the scene loads, real keys, every card reachable from the list, reduced motion → no canvas.
- **Theme (P2-T8):** `data-theme="dark|light"` on `<html>`; no attribute = dark (the `dark:` variant matches "not
  light"). `components/layout/HtmlDocument.tsx` is the shared `<html>` shell (locale layout + 404). In `<head>`,
  `ThemeScript` writes the inline pre-paint script (`src/lib/theme/theme.ts`) with this request's nonce, which
  `proxy.ts` also passes in an `x-nonce` request header; it applies the `localStorage` choice before first paint.
  `ThemeToggle` (client leaf, `aria-pressed`, label "Dark theme") reads the attribute via `useSyncExternalStore`; the
  icon is chosen by CSS so it is right before hydration; `.theme-transition` fades colors only without
  `prefers-reduced-motion`. `e2e/theme.spec.ts` proves no flash with every JS bundle blocked.
- **Motion:** Motion for layout/UI animation, CSS for scroll-driven effects, View Transitions for page and fa ↔ en
  changes (no animation where unsupported). Every animation checks `prefers-reduced-motion`.
- **Accessibility:** WCAG AA contrast (test), keyboard operable, visible focus, every interactive showpiece
  (keyboard, demos, X-Ray) has a non-visual equivalent.

### 8.1 Design tokens

Accent: **electric blue** — reads as "engineering", glows well as a spotlight on near-black, and stays clear of the
status colors. Picked by Claude on Shahram's request (2026-10-18); changing it later = two values here + `globals.css`.
Neutrals are slightly cool so the blue feels at home.

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--color-bg` | `#0A0B0E` | `#F6F7F9` | page background |
| `--color-surface` | `#111318` | `#FFFFFF` | Bento cards |
| `--color-surface-2` | `#181B22` | `#ECEFF4` | hover, inputs |
| `--color-border` | `#262A33` | `#D9DEE6` | hairline card borders (the grid's structure) |
| `--color-text` | `#E8EAEF` | `#111419` | body text |
| `--color-muted` | `#9AA2B1` | `#566070` | secondary text |
| `--color-accent` | `#4DB5FF` | `#0A63C9` | links, buttons, spotlight glow, focus ring |
| `--color-accent-soft` | `#0F2638` | `#DCEBFC` | tag/badge backgrounds |
| `--color-success` | `#3DD68C` | `#137A45` | live 🟢, demo success |
| `--color-danger` | `#FF6B6B` | `#C42B2B` | down 🔴, demo conflict |

All text/background pairs must meet WCAG AA (≥ 4.5:1); the focus ring and other non-text UI ≥ 3:1. A Vitest test
(`src/styles/contrast.test.ts`) reads `globals.css` and enforces it (port of P1's `ColorContrastTests`). Checked for these values: the weakest
pairs are light `success` on `surface-2` (4.67), light `accent` on `accent-soft` (4.76) and light `accent` on
`surface-2` (5.00); everything in dark is ≥ 6.2.

### 8.2 Signature features (ADR-024)

| Feature | Where | How |
|---|---|---|
| **Bento grid + cursor spotlight** | Home | CSS grid of cards with hairline borders; one pointer listener writes `--x/--y` CSS variables (CSSOM, CSP-safe); radial-gradient glow on borders; off on touch and reduced motion |
| **Mechanical keyboard hero** | Home | React Three Fiber keycaps carrying the tech stack; hover or a real key press pushes the key and opens a glass card with projects that used it; static poster first (§8.3); a synthesized mechanical-key sound (Web Audio, no files) for every key down/up, after the visitor's first interaction, mute switch in the header (`data-sound` on `<html>`, P3-T9) |
| **Live demos** | Project pages + Home card | React mini-apps against real sandbox endpoints (ADR-027): cinema seat picking with a real "simultaneous purchase" race (one wins via a row lock), gym check-in + locker assignment with live capacity chart |
| **X-Ray mode** | Global toggle | Peels the UI layer back to show what produced it: real code excerpts (extracted at build time from marked regions in the repo, linked to GitHub), the queries and timings of *this* request (`Server-Timing`) |
| **Fluid fa ↔ en** | Language switcher | Navigation to the other locale's URL animated with View Transitions: shared elements slide to their mirrored places; URLs stay separate for SEO (ADR-006) |
| **Scrollytelling request journey** | Under the hood | A scroll-driven line follows a real request: browser → Caddy → Next.js → ASP.NET Core → PostgreSQL → back, annotated with this site's real stack and measured timings — nothing generic (ADR-018) |

### 8.3 Loading heavy parts

First paint is server-rendered HTML + CSS only. Heavy client code (Three.js, demo apps) loads with
`next/dynamic` after hydration or when its card scrolls into view; until then a static poster with the same size is
shown (no layout shift), and the poster stays for reduced-motion users or if WebGL is unavailable.

### 8.5 Admin panel (P5-T5)
- **Routes:** `app/admin/` is a second root layout beside `app/[locale]` (own `<html>`, `HtmlDocument`). No language
  in the URL: the language comes from the `lang` cookie → `Accept-Language` → `fa` (`setupAdminLocale()` in every
  admin layout *and* page — Next renders them in parallel). `app/admin/login/page.tsx`; `app/admin/(panel)/` (a route
  group, not in the URL) = every other page, wrapped in `AdminShell` (sidebar from `lg`, the same links + account +
  sign-out in `MobileMenu` below it).
- **Access:** `proxy.ts` sends any `/admin/*` request without the `__Host-admin` cookie (except the login page) to
  `/admin/login?next=…` (302) — UX only. The `(panel)` layout asks the API (`GET /api/auth/me` with the forwarded
  cookie) and redirects an expired/revoked session the same way; pages that fetch data handle 401 themselves
  (`redirectToLogin()`), because layout and page render in parallel. The API is the gate (§5.2). Every admin
  response: CSP nonce, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`, `<meta name="robots">`.
- **Sign-in:** `LoginForm` (client, `useActionState`) posts from the browser to `/api/auth/login`, so the API's
  `Set-Cookie` reaches the browser; errors map from ProblemDetails `code`/status (`src/lib/admin/login-error.ts`).
  `next` is reduced to a path inside `/admin` (`safeNextPath`) — no open redirect.
- **Feedback:** `ToastProvider`/`useToast()` (one polite live region); `setFlash()` parks a message in
  sessionStorage for the next page (read on every path change).
- **Sections:** `src/lib/admin/navigation.ts` lists all seven; `ready: false` = shown with a "soon" mark, not a
  link. Each later task flips its own entry. Dashboard = `GET /api/admin/dashboard`.
- **e2e:** `e2e/admin.spec.ts`; the browser's `/api/*` calls are forwarded to `e2e/mock-api.ts` with `page.route`
  (no Caddy in e2e), so the session cookie round-trips like in production.

### 8.4 Retired: Razor Pages front-end (P1, 2026-10)

P1 built a server-rendered Razor front-end: Tailwind standalone CLI pipeline, botanical tokens and SVG motifs,
self-hosted fonts, culture-prefixed routing (`CultureRouteConvention`), resx, Persian formatting helpers
(`DateDisplay`, `<persian-date>`), Alpine.js CSP build, CSP with hashed inline scripts (ADR-020) and a theme toggle.
P2-T1 removed it (the project became `PersonalSite.Api`; fonts moved to `frontend/src/fonts/`); the ideas carry over (tokens + contrast test, self-hosted fonts, locale
prefixes, dark default, reduced motion). The code stays in git history (commits up to `eddf10e`).

## 9. Environments & deployment

| | Dev | Prod |
|---|---|---|
| Start | Host: `docker compose up -d db` + `dotnet watch` (API, :5080) + `pnpm dev` (frontend, :3000; rewrites `/api/*` to :5080) — **or** everything in compose behind Caddy on :8080 | `docker compose -f compose.yaml -f compose.prod.yaml up -d` |
| DB migrations | applied at API startup (Development only) | explicit step `docker compose run --rm api --migrate` (`MigrationCommand`: builds the host, migrates, exits without serving), run by `deploy.sh` |
| TLS | none | the server's shared edge Caddy + Let's Encrypt (§9.1, ADR-028) |
| Seed | `AdminSeeder` (user-secrets / `.env`) at startup, `DevDataSeeder` (fake posts/projects), `DemoSeeder` | `AdminSeeder` from `Admin__*` in the `--migrate` step, `DemoSeeder` |
| Images | built locally | two images (`api`, `frontend`) built in GitHub Actions, pushed to GHCR, pulled by the server |

**Production compose (P4-T1):** `compose.prod.yaml` drops the dev `build:` (`!reset`), pins both images to one
`IMAGE_TAG`, adds `restart: unless-stopped`, capped json-file logs (3 × 10 MB) and limits (`cpus: 1`, `mem_limit:
384m`, `oom_score_adj: 500` — the kernel kills this site before the other app on the server) to every service,
publishes `frontend` and `api` on `127.0.0.1` only (`FRONTEND_HOST_PORT` 13000, `API_HOST_PORT` 18080), mounts
`uploads` → `/app/data/uploads` and `dpkeys` → `/app/data/dp-keys` in `api` (the Dockerfile creates both owned by
the app user), sets `Site__BaseUrl=https://${SITE_HOST}` and hands `.env` to `api` as an `env_file`. There is no Caddy
in the production stack (the dev one lives in `compose.override.yaml`).

**Shared edge proxy (ADR-028):** the server runs one Caddy for every app on it (`deploy/edge/`, copied to `/opt/edge`,
its own compose project). It uses the host network: it binds 80/443/443-udp itself and reaches each app at
`127.0.0.1:<port>`, so apps share no docker network (no service-name clashes, e.g. two `api`s). Its Caddyfile only
sets the ACME email, puts the admin API on a root-only unix socket, and does `import sites/*.caddy`; each app owns
one file there and reloads the edge (`docker exec edge-caddy caddy reload`) — Caddy validates the whole config first,
so a broken file is refused and the old config keeps serving. This site's file is rendered by `deploy.sh` from
`deploy/personalsite.caddy` (`SITE_HOST`, `REDIRECT_HOSTS` from `.env`; upstreams from `docker compose port`); its
routes match `Caddyfile.dev` plus: `curl`/`Wget`/`HTTPie` on `/` → API, `/health/*` (readiness) blocked, `/health`
public. Security headers stay in the apps, except HSTS: the edge sets `Strict-Transport-Security: max-age=2592000` on
every response (`defer`, so it replaces the API's copy) — Next.js pages included. The production server is shared
with the gym system (real data); the plan and cut-over are in `deploy/SHARED-SERVER.md`.

**Release (P4-T3):** `.github/workflows/release.yml` runs on a `v*` tag or by hand. It first calls `ci.yml` (reusable
via `workflow_call`), then a two-entry matrix builds `personalsite-api` (`Dockerfile`) and `personalsite-frontend`
(`frontend/Dockerfile`) for `linux/amd64` with Buildx + the GitHub Actions layer cache and pushes them to
`ghcr.io/<owner>/` with the job's `GITHUB_TOKEN` (`packages: write`). Tags from `docker/metadata-action`: the git tag
(`v0.1.0`) and `sha-<short>`; never `latest`. The packages are public (linked to the public repository via the
`org.opencontainers.image.source` label), so the server pulls without logging in; first release `v0.1.0` on 2026-10-23.

**Deploy (P4-T4):** the server holds a git clone in `/opt/personalsite` plus the git-ignored `.env`.
`deploy/scripts/deploy.sh vX.Y.Z` (one command from the PC over SSH): refuses if tracked files changed → `git fetch`
+ `checkout` of the tag (compose files and Caddyfile match the images) → `compose pull` → `compose run --rm api
--migrate` → writes `IMAGE_TAG` to `.env` → `up -d --wait` (image HEALTHCHECKs) → renders and installs the edge site
file + reload (a refused reload restores the previous file) → `curl` of `/health` and `/fa` through the edge with
`--resolve` to 127.0.0.1 (valid certificate required) → removes this app's images except the current and previous
release. It first checks that the edge runs and its `sites/` is writable, and refuses tags without
`deploy/personalsite.caddy` (`v0.1.0` would start its own Caddy on 80/443). `--offline` skips fetch and pull for the fallback (tag pushed to the clone over SSH,
images via `docker save | ssh docker load`). Rollback = deploy the previous tag; migrations are never undone.
Server setup: `deploy/README.md`.

**Backups (P4-T5):** `deploy/scripts/backup.sh` (cron, nightly) → `/var/backups/personalsite/<UTC time>.db.dump`
(`pg_dump -Fc` inside the db container, verified with `pg_restore --list`) + `<UTC time>.uploads.tar.gz` (the
`uploads` volume read-only through a throwaway container of the postgres image); both renamed from `.partial` only when
both succeeded; 14-day rotation after a successful run. Off-server copy = the PC pulls with `scp` (pull, not push:
the server holds no credentials elsewhere). `restore.sh <time>|latest --yes`: safety backup → stop frontend/api →
`dropdb --force` + `createdb` → `pg_restore --single-transaction --exit-on-error` → replace uploads → `up --wait`.
Not backed up: `.env`, the edge's `caddy_data`, `dpkeys`.

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

**Later (ADR-023):** when Shahram starts targeting foreign clients, the stack moves to a server abroad with a `.com`
domain (name chosen then) that becomes canonical and **English-first** (`/` defaults to `en`). What happens to the
`.ir` domains (301 to the `.com`, or a Persian mirror) is decided in P15.

- **One canonical host;** every other hostname answers with a 301 to the same path on it.
- **Config, not code:** the canonical URL is `Site__BaseUrl` (API) / `SITE_URL` (frontend); hostnames appear only in
  `.env` (filled into `deploy/personalsite.caddy` by `deploy.sh`). Switching domains or servers is a config + DNS change.
- **TLS:** the server's edge Caddy obtains Let's Encrypt certificates for all hostnames (HTTP-01 on port 80; DNS-01
  if needed). DNS records point straight at the server — no CDN/proxy mode, so the edge stays the only proxy.
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
- **ADR-013 Structured résumé as one source, many renderings.** A typed `ResumeProfile` loaded from one JSON file per culture in the API project, validated at startup. The Resume page, About skills grid, `/api/resume.json`, the `curl` card, `llms.txt`, the keyboard hero's tech cards and MCP all render the same data, so they can never disagree. Two technology lists: `techStack` (the main stack the site sells, ADR-022: the keyboard's big keys) and `alsoUsed` (P3-T10, at most 8: a smaller, muted top row like a function row, and a separate list under the buttons); one id space across both, `experience[].tech` may use either.
- **ADR-014 AI is an optional, local-first layer.** Visitor-facing AI (semantic search, related posts, MCP) uses a small in-process ONNX embedding model and pgvector — no external API. Every AI feature sits behind an `Ai.*` flag; with all flags off the site is complete.
- **ADR-015 Admin-only AI assistant via an OpenAI-compatible Iranian gateway (AvalAI).** Narrow exception to "no Iran-specific services": only Shahram uses it; flag off by default, token budget, never auto-publishes. Behind `IChatClient`, switching providers after moving abroad is a config change.
- **ADR-016 Bilingual from the start of the new front-end.** European employers are a main audience; every page is written in `fa` and `en` as it is built (English enabled in P2-T6). Only GeoIP language selection stays late (P15).
- **ADR-017 One public identity: Mahdi Azghandi.** "Shahram Azghandi" is `alternateName` in JSON-LD, `shahramazghandi.ir` 301-redirects, and About mentions it once.
- **ADR-018 Honest public telemetry.** Only numbers the site actually measures are shown. No CPU/RAM, container names or package versions, no availability percentage the site can't measure. Applies to X-Ray and scrollytelling too: they show this site's real stack and this request's real timings.
- **ADR-019 Two audiences via two paths, not a persona toggle.** Recruiters and clients get clear paths from Home and a request type on the contact form.
- **ADR-020 Inline scripts allowed by CSP hash, not nonce.** *Superseded by ADR-025.* Was right for cached Razor HTML; Next.js emits per-page inline scripts that a fixed hash can't cover.
- **ADR-021 Two applications: Next.js front-end + ASP.NET Core API, one origin.** Shahram's positioning is now full-stack (ADR-022), and React/TypeScript must be shown in real, production-shaped code — the separated SPA/SSR front-end + Web API split is what full-stack roles use. Caddy serves both under one domain (`/api/*` → API, rest → Next.js), so the Identity cookie works without CORS or tokens in JavaScript. Cost accepted: two runtimes in production, a Node toolchain, and P1's Razor UI rebuilt in React. Rejected alternative: Razor Pages + React islands (smaller change, but less representative of full-stack work).
- **ADR-022 Positioning: full-stack engineer (.NET + React/TypeScript).** The site sells both halves: back-end depth (concurrency, data, deployment under constraints) made visible by a front-end worth looking at. Every showpiece must reveal something real about the back-end.
- **ADR-023 Hosting now in Iran, later abroad with `.com` and English-first.** The site launches on the Iranian VPS with the `.ir` domains and Persian as default. When Shahram targets foreign clients, it moves to a foreign server with a `.com` domain and English as the default language. Everything that would change (hostnames, base URL, default locale) is configuration, and all state lives in volumes, so the move is a runbook (P15), not a rewrite.
- **ADR-024 Design direction: dark Bento grid, single accent, strong typography.** The botanical direction (P1) is retired. The new look: near-black background, hairline-bordered Bento cards with a cursor spotlight, one accent color (electric blue, §8.1; Shahram may change it), large confident Persian/English typography, and the signature features in §8.2. Dark is the default; the light theme must still work.
- **ADR-025 CSP with a per-request nonce; HTML rendered per request.** Next.js needs inline scripts that differ per page, so scripts are allowed by a nonce created in `proxy.ts` (`script-src 'nonce-…' 'strict-dynamic'`, no `unsafe-eval`). A nonce makes every HTML response unique, so pages render per request and caching happens at the data layer (tagged fetches) instead. Styles allow `'unsafe-inline'`: React, Motion and `next/image` set `style` attributes, and style injection is far less dangerous than script injection — scripts stay strict.
- **ADR-026 Typed API contract from OpenAPI.** The API generates `openapi/v1.json` at build time; the front-end generates TypeScript types and a typed client from it. A renamed field breaks the front-end build instead of production. CI fails if the committed document or the generated types are stale.
- **ADR-027 Live demos run against real endpoints with sandboxed data.** A demo that only animates is a video; the point is to show the back-end working. Demos call `/api/demos/*`, which use real services and a real database in a separate `demo` schema with fake data, rate-limited and reset regularly. The gym demo uses invented members only (client permission given for the case study). Labelled "Live demo — sandbox data".
- **ADR-028 One shared edge proxy per server; the site runs beside the gym system.** For cost, the site runs on Shahram's existing VPS, which already serves the gym system in production with real data. Only one process can own ports 80/443, so neither app's Caddy faces the internet: a separate edge Caddy (`/opt/edge`, host network) terminates TLS for every hostname and routes to each app on a loopback port; each app owns one site file there and reloads it on deploy. Rejected: adding this site's hostnames to the gym's Caddy (every routing change here would need a gym release), making this site's Caddy the edge (each deploy here would restart the gym's front door), a shared docker network (service names like `api` resolve across projects), SNI passthrough (custom Caddy build + PROXY protocol). Isolation on one host is limited — this stack has CPU/memory caps and a higher OOM score so it can't starve the gym; moving to its own server later (ADR-023) means only removing its site file.
