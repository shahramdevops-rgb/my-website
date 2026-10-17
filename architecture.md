# Architecture

> Source of truth for *how the system is built*. If code and this document disagree, fix one of them in the same PR.
> Decisions are recorded in the **Decision Log** at the bottom (ADR-style, one paragraph each).

---

## 1. System overview

A server-rendered personal website (resume, portfolio, blog, services) with a private admin panel.

```
                 Internet
                    │  HTTPS (443)
              ┌─────▼─────┐
              │   Caddy   │  reverse proxy, automatic TLS, gzip/zstd, static cache headers
              └──┬─────┬──┘
     /*          │     │  analytics.<domain>/*  (or /stats proxied)
        ┌────────▼─┐ ┌─▼────────┐
        │   web    │ │  umami   │  self-hosted analytics
        │ ASP.NET  │ │ (Node)   │
        │ Core 10  │ └────┬─────┘
        └──┬────┬──┘      │
           │    │         │
           │  ┌─▼─────────▼──┐
           │  │  PostgreSQL  │  two databases: `site` and `umami`, separate users
           │  └──────────────┘
           │
   ┌───────▼────────┐    ┌─────────────────┐
   │ volume: uploads│    │ volume: dp-keys │  Data Protection keys (auth cookies survive restarts)
   └────────────────┘    └─────────────────┘
```

Everything runs from one `docker compose` stack. There are **no** runtime calls to third-party services
(no CDN, no Google Fonts, no external comment service, no hosted email API required). This is what makes
the site both reliable on an Iranian server *and* trivial to move to an international one later.

The only outbound HTTP calls are: health checks of Mahdi's **own** deployed projects (P5-T7), and — admin-only,
behind a flag — the AI assistant's provider (ADR-015). Both have timeouts and are never on a public request path.
The AI layer for visitors (search, related posts, MCP) runs **in-process** with a local model (ADR-014).

## 2. Tech stack (pinned majors)

| Concern | Choice | Notes |
|---|---|---|
| Runtime | .NET 10 (LTS) / ASP.NET Core 10 | `global.json` pins SDK feature band |
| UI | Razor Pages (+ Areas for admin) | Server-rendered HTML, great for SEO |
| CSS | Tailwind CSS v4, **standalone CLI** | No Node.js needed in the .NET build |
| JS | Alpine.js v3 **CSP build**, vendored in `wwwroot/lib` | No CDN; strict CSP without `unsafe-eval` |
| Fonts | Vazirmatn (UI/body), JetBrains Mono (code) — self-hosted woff2 | Both OFL-licensed |
| DB | PostgreSQL 17 | via Npgsql EF Core provider |
| ORM | EF Core 10 + `EFCore.NamingConventions` (snake_case) | Code-first migrations |
| Auth | ASP.NET Core Identity (cookie), single admin | Public registration disabled |
| Markdown | Markdig → HtmlSanitizer | Rendered HTML cached in DB column |
| Code highlighting | highlight.js (vendored, loaded only on post pages) | |
| Validation | FluentValidation (Application layer) | |
| Feature flags | Microsoft.FeatureManagement | Config-driven |
| Logging | Serilog → console (JSON in prod) | Docker collects stdout |
| Tests | xUnit v3, Shouldly, NSubstitute, Testcontainers (PostgreSQL), WebApplicationFactory | Run on Microsoft.Testing.Platform (opt-in in `global.json`) |
| Reverse proxy | Caddy 2 | Automatic HTTPS (Let's Encrypt) for the site domains |
| Analytics | Umami (self-hosted) | Cookieless |
| Metrics | `System.Diagnostics.Metrics` + in-memory aggregation (P10) | No Prometheus/Grafana stack needed for one app |
| AI (planned, P11) | Microsoft.Extensions.AI abstractions; ONNX Runtime local embedding model; pgvector; MCP C# SDK | Each added only after Mahdi approves it in its task |
| CI | GitHub Actions | Builds images **outside Iran**, pushes to GHCR |

## 3. Solution layout (light Clean Architecture)

```
my-website/
├─ CLAUDE.md  README.md  architecture.md  rules.md  roadmap.md  TASKS.md  learning.md
├─ global.json                     # pins .NET SDK
├─ Directory.Build.props           # Nullable, ImplicitUsings, TreatWarningsAsErrors, LangVersion
├─ Directory.Packages.props        # Central Package Management: every NuGet version lives here
├─ .editorconfig  .gitignore  .dockerignore  .env.example
├─ PersonalSite.slnx                # new XML solution format (.NET 9+/VS 17.13+)
├─ Dockerfile                      # multi-stage: sdk → aspnet:10.0-noble-chiseled-extra (non-root, :8080)
├─ compose.yaml                    # shared service definitions (web, db + pgdata volume)
├─ compose.override.yaml           # dev (auto-loaded): ports 127.0.0.1:8080 (web), 127.0.0.1:5433 (db)
├─ compose.prod.yaml               # prod (`docker compose -f compose.yaml -f compose.prod.yaml up -d`)
├─ deploy/
│  ├─ Caddyfile
│  ├─ postgres/init/01-create-umami-db.sh
│  └─ scripts/ (backup.sh, restore.sh, deploy.sh)
├─ .github/workflows/ (ci.yml, release.yml)
├─ src/
│  ├─ PersonalSite.Domain/
│  ├─ PersonalSite.Application/
│  ├─ PersonalSite.Infrastructure/
│  └─ PersonalSite.Web/
└─ tests/
   ├─ PersonalSite.UnitTests/
   └─ PersonalSite.IntegrationTests/
```

### 3.1 Dependency rule

```
Web ──► Application ──► Domain
 │           ▲
 └──► Infrastructure ──┘   (Infrastructure implements Application interfaces)
```

- **Domain** references nothing (no EF, no ASP.NET).
- **Application** references Domain (+ FluentValidation, and `Microsoft.EntityFrameworkCore` *abstractions only* — see ADR-004).
- **Infrastructure** references Application + Domain. Implements persistence, files, email, markdown.
- **Web** references Application + Infrastructure (only to call `AddInfrastructure()` in `Program.cs`). Page models talk to **Application services**, never to `AppDbContext` directly.

### 3.2 Project internals

```
PersonalSite.Domain/
├─ Common/            Entity.cs (Id, CreatedAt, UpdatedAt), IAuditable, Slug.cs (value object), Language.cs
├─ Blog/              Post.cs, PostStatus.cs, Tag.cs, Comment.cs, CommentStatus.cs
├─ Projects/          Project.cs, ProjectStatus.cs
├─ Contact/           ContactMessage.cs
├─ Newsletter/        Subscriber.cs, SubscriberStatus.cs
└─ Media/             MediaFile.cs, ResumeDocument.cs

PersonalSite.Application/
├─ Common/
│  ├─ Abstractions/   IAppDbContext, IFileStorage, IEmailSender, IMarkdownRenderer, ISpamGuard   (time: built-in TimeProvider)
│  ├─ Results/        Result.cs, Error.cs
│  └─ Paging/         PagedList<T>, PageRequest
├─ DependencyInjection.cs      (AddApplication)
├─ Blog/              PostService (public reads), PostAdminService, CommentService, DTOs, Validators
├─ Projects/          ProjectService, ProjectAdminService, DTOs, Validators
├─ Contact/           ContactService
├─ Newsletter/        NewsletterService (signup only; sending behind flag)
├─ Resume/            ResumeService, ResumeProfile (structured résumé, ADR-013)
├─ Search/            SearchService, RelatedPostsService (P11; IEmbeddingGenerator abstraction)
├─ Assistant/         AdminAssistantService (P11; IChatClient abstraction, admin only)
└─ Features/          FeatureFlags.cs  (string constants for flag names)

PersonalSite.Infrastructure/
├─ Persistence/
│  ├─ AppDbContext.cs            (IdentityDbContext<AppUser> + IAppDbContext; plain DbContext until P4)
│  ├─ DatabaseOptions.cs         (ConnectionStrings:Default, validated on start)
│  ├─ DatabaseMigrator.cs        (MigrateDatabaseAsync – called at startup in Development only)
│  ├─ Configurations/            one IEntityTypeConfiguration<T> per entity
│  ├─ Migrations/
│  ├─ Interceptors/AuditInterceptor.cs  (sets CreatedAt/UpdatedAt)
│  └─ Seed/                      AdminSeeder, DevDataSeeder
├─ Identity/AppUser.cs
├─ Files/LocalFileStorage.cs     (writes to /app/data/uploads volume)
├─ Email/SmtpEmailSender.cs, LoggingEmailSender.cs
├─ Markdown/MarkdigRenderer.cs   (Markdig pipeline + HtmlSanitizer)
├─ Monitoring/                   ProjectHealthMonitor (P5), RequestMetrics + DbQueryCounter interceptor (P10)
├─ Ai/                           OnnxEmbeddingGenerator, OpenAI-compatible chat client setup (P11)
└─ DependencyInjection.cs        (AddInfrastructure)

PersonalSite.Web/
├─ Program.cs                    composition root: AddApplication → AddInfrastructure → AddWeb, middleware order
├─ DependencyInjection.cs        (AddWeb: Serilog, options, routing, ProblemDetails, health checks, Razor Pages)
├─ Configuration/                Options classes bound from config (SiteOptions, CultureOptions …), all with ValidateOnStart
├─ SharedResource.cs             marker type for shared UI strings (root namespace → Resources/SharedResource.fa.resx)
├─ Pages/                        public Razor Pages
│  ├─ Index.cshtml               Home
│  ├─ About.cshtml
│  ├─ Services.cshtml
│  ├─ Resume.cshtml
│  ├─ Contact.cshtml
│  ├─ Projects/Index, Projects/Details
│  ├─ Blog/Index, Blog/Post, Blog/Tag
│  ├─ Newsletter/Subscribe (+ Confirm, Unsubscribe placeholders)
│  ├─ Error.cshtml, NotFound.cshtml
│  └─ Shared/ _Layout, _Header, _NavLinks, _Footer, _ThemeToggle, _SeoHead, Icons/ (_Mail, _GitHub, _Telegram, _Menu), Components/ (_Button, _Card, _Tag…), Motifs/ (_LeafDivider, _Vine…)
├─ Areas/Admin/Pages/            Dashboard, Posts/*, Projects/*, Comments/*, Messages/*, Resume/*, Subscribers/*, Account/Login
├─ Localization/                 CultureRouteConstraint, CultureRouteConvention (adds {culture} prefix), LanguageResolver
├─ Resources/                    SharedResource.fa.resx (later SharedResource.en.resx), view resx files
├─ Formatting/                   DateDisplay (UTC → Site:TimeZone → culture calendar, relative text), NumberDisplay (numbers, reading time), NativeDigits
├─ Infrastructure/               Routes (path constants), PageNames + MainNavigation (menu), HealthProbe (container healthcheck), SecurityHeadersMiddleware, SeoHelpers, TagHelpers (<persian-date>)
├─ Endpoints/                    minimal APIs: / (language redirect, or curl card), /sitemap.xml, /feed.xml, /robots.txt, /llms.txt, /health, /api/resume.json, /api/status, /mcp, /admin/api/markdown-preview, /resume/download
├─ Styles/app.css                Tailwind v4 input (tokens via @theme; compiled by the TailwindBuild MSBuild target)
└─ wwwroot/                      css/app.css (generated, git-ignored), js/app.js + js/components/*.js, lib/alpine-<version>/, lib/hljs, fonts/<name>-<version>/, img/
```

## 4. Data model

All tables use `snake_case` (via naming convention). All timestamps are `timestamptz`, stored in **UTC**,
converted to Persian calendar / Tehran time **only in the view layer**. Primary keys are `Guid` (UUID v7 via
`Guid.CreateVersion7()` — time-ordered, index-friendly, safe to expose in admin URLs).

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
│ author_email     │  max 254, NEVER rendered publicly
│ body             │  plain text, max 3000; rendered HTML-encoded with line breaks
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
health_url (nullable, https; P5-T7)        ────────────────
tech_stack (text[])                        id, name, email, message
cover_image_id FK → media_files            type: Hiring | Project | Other
is_featured, sort_order                    status: New | Read | Archived
started_on, finished_on (date, nullable)   ip_hash, created_at

content_embeddings (P11)
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
- Every *content* entity (Post, Project, Tag, ResumeDocument) has a `language` column (`fa`, and `en` from P1-T11).
- The structured résumé is not in the DB: one JSON file per culture in git (ADR-013).
- Translations of the same item share a `translation_group` (UUID). A Persian post and its future English
  version are two rows with the same `translation_group` → used to emit `<link rel="alternate" hreflang>`.
- Slugs are unique **per language**. This means adding English = inserting rows, not migrating schema.

### 4.2 Slugs
Slugs are latin `[a-z0-9-]` only, entered/edited by the admin (with a suggestion field). Reason: Persian
slugs become long percent-encoded URLs when shared (e.g. in Telegram). See learning.md §Slugs.

## 5. Request flow

### 5.1 Public page (e.g. `/fa/blog/my-first-post`)
1. Caddy terminates TLS → forwards to `web:8080` with `X-Forwarded-*`.
2. `ForwardedHeaders` middleware restores scheme/client IP.
3. `RequestLocalization` with `RouteDataRequestCultureProvider` reads `{culture}` from the route → sets `CultureInfo` (`fa-IR`).
4. Razor Page `Blog/Post` → `PostService.GetPublishedBySlugAsync("fa", "my-first-post")`.
5. Service queries via `IAppDbContext` with `AsNoTracking()` + projection to `PostDetailsDto` (includes cached `body_html` and approved comments).
6. Page renders with `_Layout` (sets `<html lang="fa" dir="rtl">`), `_SeoHead` emits title/meta/OG/JSON-LD/canonical.
7. Output caching (tag `post:{id}`) serves repeats; admin edits evict the tag.

### 5.2 Admin writes a post
1. `/admin/posts/new` (requires `[Authorize(Policy = "Admin")]` on the whole Area via convention).
2. Textarea (Markdown) + preview pane. Alpine debounces input → `POST /admin/api/markdown-preview` (antiforgery-protected) → server renders using the **same** `IMarkdownRenderer` → preview is identical to production.
3. Submit → `PostAdminService.CreateAsync(command)` → FluentValidation → slug uniqueness check → render markdown → save → evict output cache.

### 5.3 Comment submission
1. Form on post page includes: name, email, body, **honeypot** field (visually hidden, `tabindex=-1`, `autocomplete=off`), and a **signed timestamp** (Data Protection-protected, issued at render).
2. `ISpamGuard` rejects when: honeypot filled, form submitted < 3 s after render or token older than 24 h, or rate limiter (`comments` policy: 3 per 10 min per IP) trips.
3. Rejected-as-bot submissions get the *same* success message as humans (don't teach bots) but are not stored (or stored as `Spam` when honeypot-caught, for tuning).
4. Valid → saved as `Pending` → optional admin notification (flag `Notifications.Email`).
5. Admin approves in `/admin/comments` → status `Approved` → output-cache tag for that post evicted.

### 5.4 Language resolution for `/` (i18n-ready from day one)
`/` has no culture segment and only **redirects** (302) using `ILanguageResolver`, in order:
1. `lang` cookie (explicit user choice from the language switcher)
2. *(future)* GeoIP country → `IR` ⇒ `fa`, else ⇒ `en` (MaxMind GeoLite2 local DB file, no network call)
3. `Accept-Language` header, filtered by supported cultures
4. Default: `fa`

Today only step 1, 3, 4 exist and only `fa` is supported, so everything lands on `/fa`. From P1-T11 `en` is
supported too (English browsers land on `/en`). Adding step 2 (P14-T1) is one class.

Exception: a request to `/` from a terminal client (`curl`/`Wget`/`HTTPie` user agent, no `text/html` in `Accept`)
gets the plain-text résumé card instead of the redirect (P9-T5; response carries `Vary: User-Agent, Accept`).

## 6. Routing

All public routes are culture-prefixed: `@page "/{culture:culture}/blog/{slug}"` is avoided in favour of a
**page route convention** that prefixes every public page with `{culture:culture}` automatically, so page
files stay clean (`@page "{slug}"`).

- `CultureRouteConvention` skips area pages (admin) and an explicit list of technical pages (today `/Error`,
  which the exception handler re-executes without a culture).
- `CultureRouteConstraint` (`{culture:culture}`) accepts only `CultureOptions.SupportedCultures` (config section
  `Localization`), so `/en/...` is a 404 until English is enabled (P1-T11).
- `RequestLocalization` uses **only** the route-data provider: the URL decides the page language; cookie and
  `Accept-Language` matter only for the `/` redirect. Responses carry `Content-Language`.
- `WebEncoderOptions` allows all Unicode ranges, so Persian text is emitted as letters, not `&#x...;` entities
  (HTML-significant characters are still encoded).

| URL | Page |
|---|---|
| `/` | redirect → `/fa` |
| `/fa` | Home |
| `/fa/about` | About |
| `/fa/services` | Services |
| `/fa/projects`, `/fa/projects/{slug}` | Projects |
| `/fa/blog`, `/fa/blog/{slug}`, `/fa/blog/tag/{slug}` | Blog |
| `/fa/resume` | Resume page |
| `/fa/resume/download` | Current PDF for language (tracked download) |
| `/fa/contact` | Contact form (`?type=hiring|project` preselects the request type) |
| `/fa/decisions` | Engineering decisions (ADR cards) |
| `/fa/under-the-hood` | Live metrics + architecture (P10) |
| `/fa/search` | Semantic search (P11, flag `Ai.SemanticSearch`) |
| `/fa/newsletter` | Subscribe (flag `Newsletter.Signup`) |
| `/feed.xml`, `/fa/feed.xml` | RSS/Atom |
| `/api/resume.json`, `/llms.txt` | Machine-readable résumé (P9) |
| `/api/status` | Public status JSON (P10) |
| `/mcp` | MCP server, read-only (P11, flag `Ai.Mcp`) |
| `/sitemap.xml`, `/robots.txt`, `/health` | infra |
| `/admin/...` | Admin area (no culture prefix; admin UI is Persian-only via resx) |

URLs use lowercase (`RouteOptions.LowercaseUrls = true`) and no trailing slash.

## 7. Cross-cutting concerns

| Concern | Approach |
|---|---|
| Configuration | `appsettings.json` → `appsettings.{Env}.json` → env vars (`Section__Key`). Strongly-typed via Options pattern + `ValidateOnStart()`. Secrets only in env/.env (never committed). |
| Feature flags | `FeatureManagement` section: `Newsletter.Signup` (true), `Newsletter.Sending` (false), `Notifications.Email` (false), `Comments.Enabled` (true), `Analytics.Umami` (true in prod), `Ai.SemanticSearch` (true once built), `Ai.Mcp` (true once built), `Ai.AdminAssistant` (false until Mahdi enables), `Ai.Chat` (false, backlog). |
| Outbound HTTP | Only to Mahdi's own projects (health checks) and the admin AI provider; typed `HttpClient`s with timeouts; never awaited while rendering a public page. |
| Public telemetry | Only numbers this site measures (ADR-018). Never public: CPU/RAM, container names, package versions, internal hostnames. |
| Errors | `UseExceptionHandler("/Error")` + `UseStatusCodePagesWithReExecute("/NotFound")`; Application returns `Result<T>` for expected failures, exceptions only for bugs. |
| Logging | Serilog, request logging middleware, correlation via `TraceIdentifier`. No PII (emails) in logs. |
| Security | HTTPS/HSTS (prod), CSP (inline scripts by hash, ADR-020), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, antiforgery (default in Razor Pages), rate limiting, Identity lockout, admin 2FA (TOTP) in hardening phase. |
| Data Protection | Keys persisted to `/app/data/dp-keys` volume (`PersistKeysToFileSystem`) — otherwise every container restart logs the admin out and invalidates comment tokens. |
| Caching | Output caching for public pages with tag-based eviction; `Cache-Control: immutable` for fingerprinted static assets (`asp-append-version`). |
| Files | `IFileStorage` → `LocalFileStorage` (volume). Upload rules: allow-list of content types + magic-byte check, max size, random storage key, never serve from user-supplied names. Swappable for S3-compatible storage later. |
| Email | `IEmailSender` → `LoggingEmailSender` by default; `SmtpEmailSender` when `Notifications.Email` or `Newsletter.Sending` is on. |
| Time | `TimeProvider` (built-in .NET abstraction) injected everywhere; never `DateTime.Now`. |
| Health | `/health` (liveness, runs no checks) for the Docker healthcheck; `/health/ready` (readiness: runs all checks, today the DB) returns JSON `{"status","checks":{"database":…}}`, 503 when unhealthy. |
| Globalization | Container image **must include ICU** (`aspnet:10.0-noble-chiseled-extra` or non-chiseled); `fa-IR` culture gives Persian calendar. |

## 8. Front-end architecture

- **Tailwind v4** input file `Styles/app.css` declares design tokens with `@theme static` and custom `dark`/`light`
  variants. The standalone CLI compiles it to `wwwroot/css/app.css`. An MSBuild target (`TailwindBuild` in the Web
  csproj) runs the CLI on every build — minified in Release, skipped when no input changed; in dev
  `tools/tailwind-watch.ps1` runs alongside `dotnet watch`.
- **CLI pinning:** `tools/get-tailwind.ps1|.sh` download the version in `tools/tailwind-version` into `tools/bin/`
  (git-ignored) and verify it against `tools/tailwind-checksums.txt` (the release's `sha256sums.txt`). CI and the
  Docker build stage run the `.sh` script before building. Upgrade = change both files.
- **Scanned sources:** `source(none)` + explicit `@source` lines (today `../Pages`). New markup folders
  (`Areas/`, `wwwroot/js/`) must be added there, or their classes are silently missing.
- **Palette lock-down:** `--color-*: initial` removes Tailwind's default colors, so only token utilities exist
  (`bg-surface`, `text-primary`, `border-border`…). Same for `--font-*` and `--text-*` (our own type scale).
- **Fonts:** vendored in `wwwroot/fonts/<name>-<version>/` with their `OFL.txt` — Vazirmatn 33.003 (one variable
  woff2, weights 100–900, has Latin glyphs) and JetBrains Mono 2.304 (static Regular + Bold woff2; no official
  variable woff2). `@font-face` uses `font-display: swap`; `_Layout` preloads Vazirmatn with a plain `/fonts/…`
  href — `~/` would be rewritten to the fingerprinted name and the font would download twice
  (`SelfHostedFontsTests` guards this). Persian line-heights: 1.85 for body text, tighter for large headings.
- **Layout (P1-T5):** skip link → `header` (name + `nav`) → `main#main` → `footer`. The menu is
  `MainNavigation.Items` rendered by `_NavLinks`; an item whose page doesn't exist yet (`Url.Page` returns null)
  shows as plain text and becomes a link once the page is added. Mobile menu = native `<details>` (works without
  JS and under CSP). Footer links come from `Site:Social` (optional, validated) and are hidden when unset.
  `:focus-visible` draws a `sun` outline on every focusable element.
- **Code is always LTR:** `code, kbd, samp, pre` get `direction: ltr; unicode-bidi: isolate` in the base layer, so it
  also holds inside rendered Markdown.
- **Theme (P1-T6):** `data-theme="dark|light"` on `<html>`, server-rendered as `dark` (the no-JS state). A tiny
  inline script in `<head>` (before the stylesheet; source in `Infrastructure/InlineScripts.cs`, allowed by its CSP
  hash) applies a saved `localStorage["theme"]` *before first paint*. Alpine `$store.theme`
  (`wwwroot/js/stores/theme.js`) switches and saves it; `_ThemeToggle` (`themeToggle` component, `aria-pressed` =
  light on) is rendered `invisible` and revealed by Alpine, so no-JS visitors never see a dead button. The icon
  (moon-leaf / sun) follows `data-theme` via the `dark:`/`light:` variants. Colors fade for 300 ms only while
  switching (`.theme-transition` on `<html>`, motion-safe).
- **RTL:** layout uses logical utilities only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`),
  so English LTR later needs zero CSS changes.
- **Alpine CSP build (P1-T7):** `@alpinejs/csp` 3.17.4, its ESM build vendored as
  `wwwroot/lib/alpine-3.17.4/alpine-csp.esm.min.js` (+ `LICENSE.md`; npm `dist/module.esm.min.js`, sha256
  `8f73b4b3…f38a99`). `_Layout` loads `wwwroot/js/app.js` as `<script type="module">` (deferred, fingerprinted via
  `asp-append-version`); it imports Alpine and every component from `wwwroot/js/components/*.js` (each a
  default-exported factory), registers them with `Alpine.data('name', …)`, then calls `Alpine.start()` once.
  Imported files are not fingerprinted; static assets serves them with an ETag, so browsers revalidate them.
  Markup references names only (`x-data="mobileMenu"`) and uses `x-on:` (Razor reads `@` as C#).
  `ScriptsTests` checks that every import resolves and every `x-data` name is registered.
- **CSP (P1-T7 baseline):** `SecurityHeadersMiddleware` sends `default-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self'; frame-ancestors 'none'` on every response (Development adds `connect-src`
  for the `dotnet watch` WebSocket). No `unsafe-inline`/`unsafe-eval`. Our own inline scripts (`InlineScripts`)
  are added to `script-src` by SHA-256 hash (ADR-020); `ScriptsTests` fails if an inline script's hash is missing.
  Strict audit in P12-T1.
- **Motifs:** botanical SVGs are Razor partials (`Shared/Motifs/`) using `currentColor`, so they re-color with the theme.
  Animations are CSS-only and wrapped in `@media (prefers-reduced-motion: no-preference)`.

### 8.1 Design tokens (initial)

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--color-bg` | `#0B1410` forest night | `#F5F1E6` parchment | page background |
| `--color-surface` | `#12211A` | `#FFFDF7` | cards |
| `--color-surface-2` | `#1A2E24` | `#ECE6D6` | hover, inputs |
| `--color-text` | `#E6EFE7` | `#1C2A22` | body text |
| `--color-muted` | `#9DB3A4` | `#56675C` | secondary text |
| `--color-primary` | `#5FB37C` moss | `#2C7246` fern | links, buttons |
| `--color-primary-soft` | `#1F3D2C` | `#D6EBDC` | tag backgrounds |
| `--color-bloom` | `#E8A0B4` blossom | `#A44567` | floral accent, highlights |
| `--color-sun` | `#E9B44C` marigold | `#A8741A` | small accents, focus rings |
| `--color-border` | `#24392E` | `#D5CCB6` | dividers |

All text/background pairs must meet WCAG AA (≥ 4.5:1); `sun` (focus rings, non-text) needs ≥ 3:1.
`ColorContrastTests` (unit tests) reads `Styles/app.css` and enforces this, so a failing token breaks the build.
P1-T1 darkened light `primary` (`#2F7A4B` → `#2C7246`) and light `bloom` (`#B8577A` → `#A44567`), same hue, because
they fell below 4.5:1 on `surface-2`/`primary-soft`.

## 9. Environments & deployment

| | Dev | Prod |
|---|---|---|
| Start | `docker compose up` (db + umami) + `dotnet watch` locally, **or** everything in compose | `docker compose -f compose.yaml -f compose.prod.yaml up -d` |
| DB migrations | applied automatically at startup (Development only) | explicit step: `docker compose run --rm web --migrate` (migration bundle / flag), run by `deploy.sh` before switching |
| TLS | none | Caddy + Let's Encrypt for both domains (§9.1); `tls internal` only for IP-based testing |
| Seed | `DevDataSeeder` fake posts/projects | only `AdminSeeder` from env vars |
| Images | built locally | built in GitHub Actions, pushed to GHCR, pulled by server |

**Iran-specific operational notes (kept out of application code):**
- Docker Hub / NuGet / GitHub downloads may be throttled or blocked from Iranian IPs → images are built in CI
  abroad; the server only *pulls* (GHCR) or receives `docker save | docker load` over SSH as a fallback.
  Registry mirrors, if any, are configured in the server's `/etc/docker/daemon.json`, never in the repo.
- Nothing in the app depends on Iranian services (payment gateways, SMS panels, Iranian CDNs). Moving servers =
  copy volumes + `pg_dump` restore + DNS change. See `deploy/README` (created in Phase 3).

### 9.1 Domains

| Domain | Role |
|---|---|
| `mahdiazghandi.ir` | **canonical** — serves the site (`SiteOptions.BaseUrl = https://mahdiazghandi.ir`) |
| `www.mahdiazghandi.ir` | 301 → `https://mahdiazghandi.ir{path}` |
| `shahramazghandi.ir`, `www.shahramazghandi.ir` | 301 → `https://mahdiazghandi.ir{path}` |

- **One canonical host.** Search engines treat two domains with the same content as duplicates, so exactly one
  serves the site; the other domain and every `www.` variant answer with a **301** to the same path on the canonical
  host (`https://<other>/fa/blog/x` → `https://<canonical>/fa/blog/x`).
- **DNS:** `A` records (apex + `www`) for both domains → the VPS IP. Analytics later uses `analytics.<canonical>`.
- **TLS:** Caddy obtains Let's Encrypt certificates for all four hostnames (HTTP-01 on port 80, which must stay
  open). If validation from abroad is unreliable, switch to the DNS-01 challenge — a Caddyfile change only.
- **Config, not code:** the canonical URL is `SiteOptions.BaseUrl` (env `Site__BaseUrl`), used for canonical links,
  sitemap, feed and OG tags. Hostnames appear only in `deploy/Caddyfile` and `.env`. Switching the canonical
  domain or moving servers is a config + DNS change.
- `.ir` domains are registered at IRNIC (nic.ir) — keep renewal dates in the deploy notes.

## 10. Testing strategy

| Layer | What | Tool |
|---|---|---|
| Domain | invariants (slug format, status transitions) | xUnit + Shouldly |
| Application | services with validation & rules; DB via Testcontainers (no EF InMemory — it lies about SQL behaviour) | xUnit, Testcontainers.PostgreSql |
| Web | page returns 200, auth redirects, antiforgery, honeypot behaviour, culture routing | WebApplicationFactory + Testcontainers |
| Manual | Lighthouse (perf/SEO/a11y ≥ 90), RTL visual check, dark/light check | Chrome DevTools |

Integration tests share one `WebAppFactory` (xUnit assembly fixture) that owns one PostgreSQL container and runs the app in a `Testing` environment (production-like: no user-secrets, no auto-migrate; the fixture applies migrations itself).

## 11. Decision log (ADRs)

- **ADR-001 Razor Pages over MVC.** Content pages map 1:1 to URLs; Razor Pages keeps page + handler together, less ceremony than controllers. MVC is still available if an API is ever needed (minimal APIs cover the few JSON endpoints).
- **ADR-002 Light Clean Architecture (4 projects).** Enforces dependency direction at compile time — valuable for learning — without CQRS/MediatR overhead. Services per feature instead of one handler per use case.
- **ADR-003 No MediatR / AutoMapper / FluentAssertions.** All three went commercial for new versions in 2025 and add indirection. Plain services + hand-written `ToDto()` projections are explicit and fast.
- **ADR-004 `IAppDbContext` instead of repositories.** EF Core's `DbContext` already *is* a unit of work + repository. Application depends on `IAppDbContext` (exposing `DbSet<T>`s and `SaveChangesAsync`). Trade-off accepted: Application references EF Core; in exchange we skip a layer of pass-through code. Revisit only if a second persistence technology appears.
- **ADR-005 Markdown stored in DB, rendered HTML cached.** Admin-editable (requirement), fast reads, and render logic lives in one place. Re-render all posts via an admin action if the pipeline changes.
- **ADR-006 Culture-prefixed URLs for every language (`/fa/...`).** Unambiguous, cache-friendly, SEO-friendly (hreflang), and adding `/en` needs no route changes.
- **ADR-007 Self-host every asset.** No CDNs/Google Fonts: works under Iranian filtering, strict CSP, better privacy, no migration surprises.
- **ADR-008 Tailwind standalone CLI.** Avoids a Node toolchain for the main app; the only Node process in the stack is Umami's own container.
- **ADR-009 Single PostgreSQL instance, separate DB for Umami.** One thing to back up and monitor; isolation via separate database + user.
- **ADR-010 Comments moderated, no third-party service.** Disqus-style services are heavy, track users, and may be blocked. Honeypot + timing token + rate limit stops most bots without CAPTCHAs (Google reCAPTCHA is unreliable in Iran).
- **ADR-011 Newsletter behind feature flags.** Data model and signup ship now; sending is off until an email provider is chosen. Double opt-in is designed in so no data migration is needed later.
- **ADR-012 About/Services/Resume prose via localized Razor views, not DB (for now).** These change rarely; view localization (`About.fa.cshtml` partials) keeps them in git with no admin UI to build. Blog/Projects (frequent edits) are DB + admin. Can be moved to DB later without URL changes. *Amended by ADR-013 for the résumé data.*
- **ADR-013 Structured résumé as one source, many renderings.** The résumé (experience, education, skills, links) is a typed `ResumeProfile` loaded from one JSON file per culture in git and validated at startup. The Resume page, About skills grid, `/api/resume.json`, the `curl` card, `llms.txt` and the MCP `get_resume` tool all render the same data, so they can never disagree. Prose around it (About story, Services) stays in localized views.
- **ADR-014 AI is an optional, local-first layer.** Visitor-facing AI (semantic search, related posts, MCP) uses a small embedding model running in-process via ONNX Runtime and pgvector in the existing PostgreSQL — no external API, so it works on the Iranian server and costs nothing per request. Every AI feature sits behind an `Ai.*` flag and Microsoft.Extensions.AI abstractions (`IEmbeddingGenerator`, `IChatClient`); with all flags off the site is complete. The point is to show *engineered* AI, not a thin wrapper.
- **ADR-015 Admin-only AI assistant via an OpenAI-compatible Iranian gateway (AvalAI).** A deliberate, narrow exception to "no Iran-specific services": major AI APIs don't serve Iran, and only Mahdi uses this feature, so there is no public abuse surface and an outage only disables a helper button. Guard rails: flag `Ai.AdminAssistant` (off by default), daily token budget, prepaid credit, never auto-publishes. Behind `IChatClient`, switching providers (e.g. after moving abroad) is a config change. Public features must never depend on it.
- **ADR-016 Bilingual from P2 (English moved up from P13).** European employers are a main audience. The i18n plumbing already exists, so every page is written in `fa` and `en` as it is built — cheaper than translating everything later. Only GeoIP language selection stays late (P14).
- **ADR-017 One public identity: Mahdi Azghandi.** The legal name matches degrees, contracts and background checks. "Shahram Azghandi" is recorded as `alternateName` in JSON-LD, `shahramazghandi.ir` 301-redirects to the canonical domain, and About mentions it once. All UI text uses the primary name.
- **ADR-018 Honest public telemetry.** Only numbers the site actually measures are shown (latency percentiles, error rate, cache hit ratio, deploy info, own projects' health). No CPU/RAM, container names or package versions (reconnaissance value for attackers, no value for visitors), and no availability percentage the site can't measure from inside itself.
- **ADR-019 Two audiences via two paths, not a persona toggle.** Recruiters and clients get clear paths from Home (Resume/Decisions vs Services/Contact) and a request type on the contact form. A toggle would hide half the content, double the maintenance and confuse search engines.
- **ADR-020 Inline scripts are allowed by CSP hash, not nonce.** The only inline script (the pre-paint theme script) is a constant in `InlineScripts`; its SHA-256 goes into `script-src` once at startup. A nonce must be new per response, which breaks as soon as HTML is served from a cache (output caching for the blog, P6) — a hash stays valid for every copy of the page. Cost: the script text must be byte-identical to what was hashed, so it is rendered from the same constant and guarded by a test.
