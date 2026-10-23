# Tasks

> Each task is small, independent and ends in a working, committed state.
> To run one, tell Claude: **"Do task P1-T3"**. Claude reads `CLAUDE.md` → the task → relevant sections of `architecture.md`/`rules.md`, implements it, and ticks the box.
> Format: **Scope** (what to build) · **Done when** (acceptance criteria) · **Learn** (concept to note in `learning.md`, if new).
> Status: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` cancelled

---

## Phase 0 — Foundation & tooling

- [x] **P0-T1 Repository hygiene**
  Scope: `git init`, `.gitignore` (VisualStudio + `wwwroot/css/app.css` + `.env`), `.editorconfig`, `.dockerignore`, `global.json` (.NET 10 SDK, `rollForward: latestFeature`), `Directory.Build.props` (Nullable, ImplicitUsings, TreatWarningsAsErrors, AnalysisLevel latest), `Directory.Packages.props` (CPM enabled, empty).
  Done when: files exist; first commit made.
  Learn: Central Package Management, `global.json`.

- [x] **P0-T2 Solution & projects**
  Scope: `PersonalSite.slnx`; `src/` Domain, Application, Infrastructure (classlib), Web (Razor Pages, `--no-https` template then clean up); `tests/` UnitTests, IntegrationTests (xUnit v3). Project references per architecture §3.1. Remove template boilerplate.
  Done when: `dotnet build` and `dotnet test` pass; reference graph matches the dependency rule.
  Learn: dependency rule / Clean Architecture.

- [x] **P0-T3 Web host basics**
  Scope: `Program.cs` structure (`AddApplication`, `AddInfrastructure`, `AddWeb` extension methods), Serilog (console; JSON in Production), `/health` endpoint, `LowercaseUrls`, ProblemDetails, exception handler page, strongly-typed options pattern example with `ValidateOnStart`.
  Done when: `dotnet run` → `/health` returns `Healthy`; logs are structured.
  Learn: middleware pipeline order, Options pattern.

- [x] **P0-T4 Docker for development**
  Scope: multi-stage `Dockerfile` (sdk → `aspnet:10.0-noble-chiseled-extra`, non-root, port 8080), `compose.yaml` (web, db `postgres:17-alpine` with healthcheck & `pgdata` volume), `compose.override.yaml` (dev ports, env), `.env.example`.
  Done when: `docker compose up --build` serves `/health`; DB healthy; data survives `docker compose down`/`up`.
  Learn: images vs containers, volumes, multi-stage builds, why ICU matters.

- [x] **P0-T5 EF Core & PostgreSQL**
  Scope: packages (Npgsql EF provider, NamingConventions, Design), `AppDbContext` implementing `IAppDbContext`, `AuditInterceptor`, snake_case, connection string from config, `InitialCreate` migration, auto-migrate **only in Development**, `/health/ready` with DB check.
  Done when: tables created in the container DB; readiness check reports DB status.
  Learn: DbContext lifetime, migrations, why auto-migrate is dev-only.

- [x] **P0-T6 Test infrastructure**
  Scope: Shouldly, NSubstitute; `PostgresFixture` using Testcontainers; `WebAppFactory : WebApplicationFactory<Program>` wired to the container DB; one smoke test (`GET /health` → 200). Remove the temporary `--ignore-exit-code 8` from `PersonalSite.IntegrationTests.csproj`.
  Done when: `dotnet test` spins up Postgres and passes (Docker required).
  Learn: unit vs integration tests, why not EF InMemory.

- [x] **P0-T7 CI pipeline**
  Scope: `.github/workflows/ci.yml` — restore, build, `dotnet format --verify-no-changes`, test (on push & PR).
  Done when: CI green on GitHub.

## Phase 1 — Razor front-end (retired)

> Done in Razor Pages, then retired by ADR-021 (2026-10-18): the front-end is now Next.js (Phase 2). P2-T1 removes
> this code; what carries over is in `architecture.md §8.4`. Kept here as history.

- [x] **P1-T1 Tailwind v4 pipeline + design tokens**
  Scope: download Tailwind standalone CLI (script `tools/get-tailwind.ps1` + `.sh`, version pinned), `Styles/app.css` with `@theme` tokens from architecture §8.1, `data-theme` dark/light variants, MSBuild target to compile on build, watch script for dev; Docker build stage runs the CLI with `--minify`.
  Done when: utilities like `bg-surface text-primary` work; both themes' contrast pairs verified ≥ 4.5:1 (list results in PR).
  Learn: utility-first CSS, CSS variables, Tailwind v4 `@theme`.

- [x] **P1-T2 Fonts & base typography**
  Scope: self-host Vazirmatn (variable woff2) and JetBrains Mono in `wwwroot/fonts`, `@font-face` with `font-display: swap`, preload main font, base type scale, Persian-friendly line-height, `code`/`pre` always `dir="ltr"`.
  Done when: no network requests leave the site's origin for fonts.

- [x] **P1-T3 Culture routing & localization plumbing**
  Scope: `SupportedCultures` option (`["fa"]`), `CultureRouteConstraint`, page route convention adding `{culture}` prefix to public pages, `RequestLocalization` with route provider, `ILanguageResolver` (cookie → Accept-Language → default) and `/` redirect, `SharedResource` + `SharedResource.fa.resx`, `AddViewLocalization`, `<html lang dir>` from current culture.
  Done when: `/` → 302 `/fa`; `/en/...` → 404 for now; integration tests cover both.
  Learn: request culture providers, resx, why every language gets a prefix.

- [x] **P1-T4 Persian formatting helpers**
  Scope: `<persian-date>` tag helper / `DateDisplay` (UTC → Tehran time → culture calendar, relative "۳ روز پیش" option), number formatting via culture, reading-time formatting helper.
  Done when: unit tests show a known UTC date renders as the correct Persian date in `fa` culture.
  Learn: calendars in .NET, time zones, ICU.

- [x] **P1-T5 Base layout, header, footer**
  Scope: `_Layout` (skip-link, landmarks, `@RenderSection("Head")`), `_Header` (logo/name, nav: خانه، درباره من، نمونه‌کارها، بلاگ، خدمات، رزومه، تماس; mobile menu with Alpine), `_Footer` (Email, GitHub, Telegram icons + links from config `SiteOptions.Social`, copyright with Persian year).
  Done when: layout works 360px → 1440px, keyboard navigable, all strings from resx.

> P1-T7 was done before P1-T6: the theme toggle needs Alpine.

- [x] **P1-T6 Theme toggle (dark default)** — requires P1-T7
  Scope: inline head script sets `data-theme` before paint (localStorage → default **dark**), allowed by its CSP hash (ADR-020), Alpine store `theme` + `_ThemeToggle` button (sun/moon-leaf icon, `aria-pressed`), smooth color transition (motion-safe).
  Done when: no flash of wrong theme on reload; preference persists; works with JS disabled (stays dark); runs under the CSP (no `unsafe-inline`).
  Learn: FOUC, why the script must be inline & tiny.

- [x] **P1-T7 Alpine.js (CSP build) setup**
  Scope: vendor `@alpinejs/csp` into `wwwroot/lib/alpine-3.x.y/`, `wwwroot/js/app.js` bootstraps components from `wwwroot/js/components/`, `defer` loading (ES module). Baseline CSP header (`SecurityHeadersMiddleware`; hardened in P12-T1).
  Done when: mobile menu runs under a CSP without `unsafe-eval` (theme toggle: P1-T6).

- [x] **P1-T8 Botanical motif library**
  Scope: Razor partials in `Shared/Motifs/`: `_LeafDivider`, `_VineCorner`, `_Sprig`, `_BloomCluster`, `_HeroBotanical` (larger line-art composition). `currentColor`-based, `aria-hidden`, subtle motion-safe sway animation for hero leaves. Original art only (hand-authored SVG paths).
  Done when: motifs recolor with theme; zero layout shift.

- [-] **P1-T9 UI component partials + style guide page** — cancelled, replaced by P2-T10.
- [-] **P1-T10 Error pages** — cancelled, replaced by P2-T9.
- [-] **P1-T11 English culture & language switcher** — cancelled, replaced by P2-T6 and P2-T9.

## Phase 2 — Full-stack foundation

> ADR-021: a Next.js front-end (`frontend/`) and an ASP.NET Core API (`src/PersonalSite.Api`) behind one origin.
> Front-end tasks: verify the current stable versions at the start of the task and pin them exactly.
> From here on every public page ships in **`fa` and `en`** (strings in both `messages/*.json`).

- [x] **P2-T1 API project: rename and retire the Razor UI**
  Scope: rename `PersonalSite.Web` → `PersonalSite.Api` (folder, csproj, namespaces, `.slnx`, Dockerfile, compose service `web` → `api`, CI, test references; keep the user-secrets id). Remove the P1 front-end: `Pages/`, `Styles/`, `wwwroot/` (move `wwwroot/fonts/*` with their licences to `frontend/src/fonts/`), `Localization/` (culture routing, `LanguageResolver`), `Resources/` + `SharedResource`, `Formatting/`, tag helpers, `InlineScripts`, Alpine, the Tailwind MSBuild target and `tools/*tailwind*`, the language-redirect endpoint. Delete the tests that cover removed code; keep the Persian date test vectors in a note for P2-T6 and the contrast test for P2-T8. `SecurityHeadersMiddleware` becomes the API variant (`default-src 'none'; frame-ancestors 'none'`). `.env.example` and README updated.
  Done when: build, tests and format are green; `/health` and `/health/ready` work; no `.cshtml`, `wwwroot` or Tailwind reference is left in `src/` (grep in PR).
  Learn: what an API-only ASP.NET Core app needs (and doesn't).

- [x] **P2-T2 OpenAPI document + `GET /api/site`**
  Scope: `Microsoft.AspNetCore.OpenApi`; build-time generation (`Microsoft.Extensions.ApiDescription.Server`) to `openapi/v1.json` (committed); all endpoints under `MapGroup("/api")` in per-feature `Endpoints/*` classes; ProblemDetails responses documented; first endpoint `GET /api/site` (`SiteInfoService`: site name per language, social links from `Site:Social`, public feature flags). Integration test: the endpoint returns the configured values; CI step fails when the committed document differs from the generated one.
  Done when: `openapi/v1.json` describes `/api/site`; CI catches a stale document.
  Learn: OpenAPI, code-first contracts.

- [x] **P2-T3 Next.js app scaffold**
  Scope: `frontend/` — Next.js 16 App Router, React 19, TypeScript (`strict`, `noUncheckedIndexedAccess`), `src/` dir, pnpm 10 (`packageManager` field, Corepack), Node 24 LTS (`.nvmrc`, `engines`), `output: 'standalone'`; ESLint (Next config) + Prettier; Vitest + Testing Library (one component test); Playwright (one smoke test); scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `e2e`, `format`; `.gitignore`/`.dockerignore`. CI: a `frontend` job (frozen-lockfile install → lint → typecheck → test → build) next to the .NET job.
  Done when: `pnpm dev` serves a page; both CI jobs green.
  Learn: App Router basics; server vs client components.

- [x] **P2-T4 Typed API client**
  Scope: `openapi-typescript` → `src/lib/api/schema.d.ts` (`pnpm gen:api` from `../openapi/v1.json`), `openapi-fetch` client factory (server: `API_INTERNAL_URL`; browser: same-origin `/api`), forwarding of the incoming cookie for server calls (helper, used from P5), env validation in `src/lib/env.ts` (fails startup on missing values); the placeholder home page shows the site name from `/api/site`. CI fails when generated types are stale.
  Done when: renaming a field of the `/api/site` DTO breaks `pnpm typecheck` (shown in the PR).
  Learn: one contract, two languages.

- [x] **P2-T5 One origin: Docker + Caddy for development**
  Scope: `frontend/Dockerfile` (multi-stage, standalone output, non-root, healthcheck); compose services `frontend`, `api`, `db`, `caddy` (dev Caddyfile routing per architecture §1/§6: `/api/*`, `/media/*`, `/health*`, `/llms.txt`, `/mcp` → api, `/internal/*` → 404, rest → frontend); dev ports: Caddy `127.0.0.1:8080`, db `127.0.0.1:5433`. Host workflow: Next `rewrites` send `/api/*` to `http://localhost:5080` in development only. README "Getting started" rewritten for both workflows.
  Done when: `docker compose up --build` → `http://localhost:8080/` is Next.js and `http://localhost:8080/api/site` is the API; host workflow works on `:3000`.
  Learn: reverse proxy routing, why one origin removes CORS.

- [x] **P2-T6 i18n (fa + en) & formatting**
  Scope: next-intl with `app/[locale]` (`fa`, `en`; other values → 404), `messages/fa.json` + `messages/en.json` (English dot-notation keys), key-parity test, `<html lang dir>` per locale, `/` redirect in `proxy.ts` (cookie `lang` → `Accept-Language` → `fa`), `src/lib/format/`: dates (`fa`: Persian calendar, `Asia/Tehran`, Persian digits from `Intl`; `en`: Gregorian, Latin digits), relative time ("۳ روز پیش" / "3 days ago"), numbers, reading time — with tests that reuse P1's vectors (`tests/PersonalSite.UnitTests/Formatting/*Tests.cs` at commit `fe205aa`).
  Done when: `/` → 302 `/fa` (or `/en` for an English browser); `/de` → 404; a key missing in one file fails a test; formatter tests green.
  Learn: `Intl` APIs, locale routing in Next.js.

- [x] **P2-T7 Security headers & CSP with nonce** (ADR-025)
  Scope: `proxy.ts` creates a nonce per request and sets `Content-Security-Policy` (`default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`; dev additions for HMR only in development), plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. Playwright test visits every route and fails on any CSP violation in the console.
  Done when: no `unsafe-eval`, no `unsafe-inline` for scripts; zero CSP violations in e2e.
  Learn: nonces vs hashes, `strict-dynamic`.

- [x] **P2-T8 Design tokens, fonts & theme** (ADR-024)
  Scope: Tailwind v4 (`@tailwindcss/postcss`), `styles/globals.css` with the token values of architecture §8.1 (electric-blue accent) for dark (default) and light, default palette removed (`--color-*: initial`), contrast test in Vitest (port of P1's `ColorContrastTests`, `tests/PersonalSite.UnitTests/Design/` at commit `fe205aa`: text ≥ 4.5:1, focus/non-text ≥ 3:1); fonts via `next/font/local` (Vazirmatn variable, JetBrains Mono; optional display face picked by Mahdi, OFL only, licence file kept); type scale with Persian line-heights; `code, pre` always LTR; theme: pre-paint script with the nonce (saved choice before first paint), toggle button (`aria-pressed`), color fade only when motion is allowed.
  Done when: no theme flash on reload; contrast test green in both themes; no font request leaves the origin.
  Learn: CSS variables as a theme API, FOUC.

- [x] **P2-T9 Layout shell & language switcher**
  Scope: per-locale layout: skip link, header (name, nav: Home, About, Projects, Blog, Services, Resume, Contact; theme toggle; language switcher), accessible mobile menu (Esc, focus return), footer (social links from `/api/site`, copyright with the year in the locale's calendar); language switcher goes to the same page in the other locale with the `lang` cookie set and a **View Transition** that slides shared elements to their mirrored places (plain navigation where unsupported); `not-found.tsx` and `error.tsx` (request id only in development); close the P2-T6 gap: `/de` (unknown language) answers 404 with an **empty body** today — `notFound()` comes from the `[locale]` root layout itself, which no `not-found.tsx` catches (`global-not-found` didn't help in Next 16.4; a `proxy.ts` rewrite of unknown first segments to an unmatched path works).
  Done when: keyboard navigable; 360 px and 1440 px in both locales and themes; unknown URL → 404 page with status 404.
  Learn: logical properties for RTL/LTR, View Transitions.

- [x] **P2-T10 UI kit & style guide**
  Scope: `Button` (primary/ghost/link), `Card`, **`BentoGrid` + `BentoCard` with cursor spotlight** (one pointer listener writes `--x/--y`; radial glow on border/surface; disabled on touch and reduced motion), `Tag`, `Badge` (Live/InProgress/Archived), `SectionHeader`, `FormField` (label, input/textarea, error), `Alert`; component tests; `/[locale]/_styleguide` dev-only page (404 in production) showing everything.
  Done when: the style guide renders every component in both themes and both directions; spotlight off with reduced motion (test).

## Phase 3 — Static pages, Bento home & keyboard hero (bilingual)

> Mahdi provides the facts; Claude drafts the English text for Mahdi to edit. Prose lives in `frontend/content/*.{locale}.mdx`.

- [x] **P3-T1 Structured résumé in the API**
  Scope: `ResumeProfile` record (experience, education, skills with categories, tech stack, links) loaded from `Content/resume.fa.json` + `resume.en.json` (ADR-013), validated at startup; `GET /api/resume?lang=` for the pages; regenerated OpenAPI + TS types.
  Done when: an invalid or incomplete file fails startup (test); endpoint test for both languages.
  Learn: single source of truth, many renderings.

- [x] **P3-T2 Home — Bento grid**
  Scope: hero card (name, a **concrete** value proposition), **two audience paths** ("Hiring?" → Resume / Decisions, "Have a project?" → Services / Contact `?type=project`), slot for the keyboard hero (P3-T3), cards with placeholders wired later: featured projects (P6), live demo (P6), latest posts (P7), status line (P11); grid reflows from 1 column (360 px) to the full Bento layout.
  Done when: responsive, both themes, both languages, Lighthouse a11y ≥ 90.

- [x] **P3-T3 Keyboard hero (3D)**
  Scope: React Three Fiber + drei mechanical keyboard; keycaps show the tech stack from the résumé (C#, .NET, React, TypeScript, PostgreSQL, Docker, AI …); hover or pressing the matching real key depresses the keycap and opens a glass card (what it is, projects that used it); soft RGB lighting; loaded with `next/dynamic` after hydration and only on Home; a static poster of the same size renders first and stays for reduced-motion users and when WebGL is unavailable; an accessible equivalent (list of buttons with the same cards) for keyboard and screen-reader users.
  Done when: poster appears with the first paint (no layout shift); real key presses work; the accessible list exposes every card.
  Learn: 3D on the web, progressive enhancement, lazy loading.

- [x] **P3-T4 About — "From circuits to cloud"**
  Scope: `about.{fa,en}.mdx`, photo slot, skills grid from the résumé, timeline: BSc Electrical Engineering (University of Guilan) → MSc Electrical Engineering (Shahid Beheshti University) → software engineering, with 2–3 concrete bridges (control systems & feedback → observability; state machines → domain invariants); one line "also known as Shahram" (ADR-017).
  Done when: complete in both languages with real text or clearly marked placeholders.

- [x] **P3-T5 Services page**
  Scope: services as cards (full-stack web apps, .NET APIs, React front-ends, performance/DB optimization, code review/consulting), "how I work" steps, CTA to `/{locale}/contact?type=project`; prose in MDX.
  Done when: renders in both languages.

- [x] **P3-T6 Resume page**
  Scope: renders `/api/resume`, print-friendly basics, download button placeholder (disabled until P9).
  Done when: clean in both languages and prints legibly.

- [x] **P3-T7 Contact page (links only)**
  Scope: email (obfuscated `mailto`), GitHub, Telegram cards from `/api/site`; placeholder for the form (P9).
  Done when: links correct; both languages.

- [x] **P3-T8 Engineering decisions page**
  Scope: `/{locale}/decisions` with 5–6 cards **Challenge → Decision → Why** across projects (this site's front-end/API split, gym system, cinema reservation, microservices platform — e.g. modular monolith for an MVP, no generic repository over EF Core, PostgreSQL + MongoDB split); MDX per locale; linked from the hiring path, About and Resume.
  Done when: both languages and themes; readable without interaction.

## Phase 4 — First deployment (walking skeleton)

- [x] **P4-T1 Production compose & Caddy**
  Scope: `compose.prod.yaml` (images from GHCR, restart policies, no DB/app ports exposed, volumes `pgdata`/`uploads`/`dpkeys`/`caddy_data`), `deploy/Caddyfile` (routing as in dev, `/internal/*` blocked, `curl` User-Agent on `/` → API, `mahdiazghandi.ir` with Let's Encrypt, `shahramazghandi.ir` + `www.` → 301 canonical per architecture §9.1, hostnames from env), compression.
  Done when: `docker compose -f compose.yaml -f compose.prod.yaml config` validates; runs locally.

- [ ] **P4-T2 API production settings**
  Scope: `ForwardedHeaders` (trust the Caddy network only), HSTS, Data Protection keys in `/app/data/dp-keys` with app name, `appsettings.Production.json`, migrations only via `--migrate`.
  Done when: restarting `api` doesn't invalidate cookies (verify after P5); migrations run only when asked.
  Learn: reverse proxy headers, Data Protection.

- [ ] **P4-T3 Release workflow**
  Scope: `.github/workflows/release.yml` — on tag `v*` or manual: build **both** images (`api`, `frontend`), tag version + `sha`, push to GHCR.
  Done when: both images appear in GHCR.
  Learn: why build outside Iran; image tagging.

- [ ] **P4-T4 Server setup & deploy script**
  Scope: `deploy/README.md` (Ubuntu LTS, Docker, firewall 22/80/443, deploy user, SSH keys, registry login), `deploy/scripts/deploy.sh` (pull → migrate → up -d → health check → prune), `docker save | ssh docker load` fallback.
  Done when: Mahdi deploys with one command and the site loads over HTTPS.

- [ ] **P4-T5 Backups**
  Scope: `backup.sh` (`pg_dump -Fc` + tar of `uploads`, 14-day rotation), cron, `restore.sh`, off-server copy step.
  Done when: a restore into a fresh DB has been performed once and documented.

## Phase 5 — Admin panel & authentication

- [ ] **P5-T1 Identity setup**
  Scope: `AppUser : IdentityUser<Guid>`, `AppDbContext : IdentityDbContext<…>`, password & lockout options (5 attempts, 15 min), cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, 7-day sliding; API returns 401/403 instead of redirects), migration.
  Done when: Identity tables created.

- [ ] **P5-T2 Admin seeding & no registration**
  Scope: `AdminSeeder` from `Admin__Email`/`Admin__Password`, creates user + `Admin` role once; no registration endpoint exists.
  Done when: fresh DB + env → admin can log in; without env vars a warning, no crash.

- [ ] **P5-T3 Auth endpoints & CSRF defence**
  Scope: `POST /api/auth/login` (rate limit `login`, generic error), `POST /api/auth/logout`, `GET /api/auth/me`; unsafe methods require a same-origin `Origin` header; no open redirect (return URLs handled by the front-end, local paths only).
  Done when: integration tests: wrong password → 401; 5× → locked; cross-origin POST rejected.
  Learn: cookie auth on one origin, CSRF, open redirects.

- [ ] **P5-T4 Authorization convention**
  Scope: `/api/admin` group with `RequireAuthorization("Admin")`; a test enumerates every admin endpoint from the endpoint data source and asserts 401 for anonymous calls.
  Done when: the test covers all admin endpoints automatically.

- [ ] **P5-T5 Admin shell in Next.js**
  Scope: `/admin/login` page, `proxy.ts` redirect to login without the auth cookie (UX only), admin layout (sidebar: داشبورد، پست‌ها، نمونه‌کارها، کامنت‌ها، پیام‌ها، رزومه، مشترکین), toast/flash messages, dashboard counts (`GET /api/admin/dashboard`, zeros until features exist), `noindex`, `Cache-Control: no-store`.
  Done when: login → dashboard → logout works in the browser; e2e test.

## Phase 6 — Projects, case studies & live demos

- [ ] **P6-T1 Domain: Project & MediaFile**
  Scope: entities per architecture §4 (nullable `HealthUrl` https only, nullable `DemoKey`), `ProjectStatus`, `Slug` value object, domain methods (`Feature()`, `Archive()`, `Reorder()`), unit tests.
  Done when: tests pass.

- [ ] **P6-T2 Persistence for projects & media**
  Scope: EF configurations (indexes, `text[]` tech stack, unique `(language, slug)`), migration.
  Done when: migration applied; SQL reviewed.

- [ ] **P6-T3 File storage & image upload**
  Scope: `IFileStorage` + `LocalFileStorage`, upload validator (jpg/png/webp, magic bytes, ≤ 5 MB), dimensions, `MediaFile`, `GET /media/{key}` with long cache headers.
  Done when: tests reject a renamed `.exe`; a valid image is stored and served.
  Learn: never trust extensions or content-type.

- [ ] **P6-T4 Result pattern & ProjectAdminService**
  Scope: `Result`/`Error`, create/update commands + FluentValidation, Markdown body via `IMarkdownRenderer`, slug uniqueness, admin endpoints.
  Depends on: **P7-T1** (Markdown renderer) — do that first; it has no other dependencies.
  Done when: service tests cover create/update/duplicate slug.

- [ ] **P6-T5 Admin CRUD for projects**
  Scope: React list (sortable order, featured toggle) and form (title, slug suggestion, summary, Markdown body with the **case-study template**, status, live/health/source URLs, demo key, tech tags, cover upload, dates), delete with confirmation dialog.
  Done when: full CRUD works in the browser.

- [ ] **P6-T6 Cache revalidation across apps**
  Scope: `IFrontendRevalidator` (API → `POST {FRONTEND_INTERNAL_URL}/internal/revalidate`, shared secret `Revalidate__Secret`, timeout, failure logged not thrown), Next route handler revalidating tags; tags `projects`, `project:{id}`, `blog`, `post:{id}` as constants on both sides.
  Done when: integration test with a fake front-end; e2e: edit in admin shows on the public page on the next request.
  Learn: cache invalidation across services.

- [ ] **P6-T7 Public project pages**
  Scope: `/{locale}/projects` (Bento cards: cover, title, summary, tech tags, "Live" badge + status, demo badge), `/{locale}/projects/{slug}` (case study, demo slot), featured projects on Home.
  Done when: your live project is visible with a working link.

- [ ] **P6-T8 Live status monitor**
  Scope: `ProjectHealthMonitor : BackgroundService` (`PeriodicTimer` 5 min, 5 s timeout, typed `HttpClient`), last result in memory (`Up`/`Down`/`Unknown` + checked-at), exposed by the project endpoints; badge 🟢/🔴 "checked N min ago".
  Done when: tests with a fake handler cover up, down and timeout; failures never break a page.
  Learn: background services, `IHttpClientFactory`.

- [ ] **P6-T9 Gym system — flagship case study (content)**
  Scope: client permission is given — record it (date, scope) in the admin record; case study with the template in both languages; screenshots/video with fake data; public site link + health URL; the client's admin panel is never linked.
  Done when: case study published in both languages.

- [ ] **P6-T10 Demo sandbox infrastructure** (ADR-027)
  Scope: `demo` schema + migration, `DemoSeeder`, reset job (nightly + `POST /api/demos/{key}/reset` with cooldown), `/api/demos` group with rate limit `public-api`, session-free design (a visitor gets a random demo session id in a cookie), "Live demo — sandbox data" label component.
  Done when: integration tests for reset and rate limiting; demo data never appears in public content queries.

- [ ] **P6-T11 Cinema live demo**
  Scope: seat map UI (screen, rows, seat states, price total updating instantly), hold → purchase flow on real endpoints with a concurrency guard (row lock or optimistic `version` column — decide and explain in the task), **"simulate simultaneous purchase"** fires two parallel purchases for the same seat: one succeeds, the other gets a clean "seat already taken", and the UI explains why with a link to the code excerpt; Motion for seat feedback; keyboard operable; text summary for reduced motion.
  Done when: a test fires N parallel purchases for one seat and always gets exactly one success; demo works in both languages.
  Learn: race conditions, row locks vs optimistic concurrency.

- [ ] **P6-T12 Gym live demo**
  Scope: mini dashboard: check in an invented member, assign a free locker from a visual locker grid, capacity chart updates live (Server-Sent Events or short polling — decide in task); all data invented.
  Done when: two browser tabs see each other's check-ins; works in both languages and themes.
  Learn: real-time updates over HTTP.

## Phase 7 — Blog

- [ ] **P7-T1 Markdown renderer**
  Scope: `IMarkdownRenderer` → `MarkdigRenderer` (advanced extensions, `DisableHtml`, heading ids, `dir="auto"` on paragraphs, `dir="ltr"` on code blocks, external links `rel="noopener nofollow"`), HtmlSanitizer allow-list, TOC extraction, reading time; unit tests with XSS payloads.
  Done when: `<script>`/`javascript:` payloads are stripped in tests.
  Learn: XSS, defense in depth.

- [ ] **P7-T2 Domain & persistence: Post, Tag**
  Scope: entities, `PostStatus` transitions, `GrowthStage` (default `Seedling`, `post.SetGrowthStage(stage)`), many-to-many tags, indexes, migration.
  Done when: domain tests pass.

- [ ] **P7-T3 PostAdminService**
  Scope: create/update/publish/unpublish/delete, tag upsert, SEO fields, re-render HTML on save, revalidation (P6-T6), admin endpoints.
  Done when: service tests pass.

- [ ] **P7-T4 Admin post editor with live preview**
  Scope: React list (filter by status, search) and editor (title, slug, excerpt, tags, growth stage, cover, SEO fields, Markdown editor in monospace), debounced `POST /api/admin/markdown/preview`, side-by-side on desktop / tabs on mobile, image upload inserting `![alt](/media/...)` at the cursor, save draft / publish.
  Done when: preview matches the published output exactly.

- [ ] **P7-T5 Public blog list & tag pages**
  Scope: `/{locale}/blog` paged (10/page), post cards (title, excerpt, date, reading time, tags, growth-stage badge 🌱/🌿/🌳), filter `?stage=`, tag pages, latest 3 posts on Home.
  Done when: pagination correct; empty state designed.

- [ ] **P7-T6 Post page**
  Scope: title, meta line, cover, TOC (collapsible; sticky on desktop), body typography for RTL with LTR code, server-side code highlighting (Shiki — decide API vs front-end in the task), copy-code button, prev/next, tags.
  Done when: mixed Persian text + English code renders correctly; no highlighting JS shipped to the browser.
  Learn: bidi text (`dir="auto"`, isolation).

- [ ] **P7-T7 Blog caching**
  Scope: tagged fetches (`blog`, `post:{id}`) on all blog pages; revalidation from `PostAdminService`; API `Cache-Control` for public reads; no caching for authenticated requests.
  Done when: edit in admin shows on the next request; repeated reads don't hit the DB (logs).
  Learn: caching & invalidation.

- [ ] **P7-T8 Translations for posts & projects**
  Scope: admin "Add translation" (new row, same `translation_group`, other language), per-language lists, language switcher links to the translated URL when one exists (else that language's list page).
  Done when: a Persian post and its English translation link to each other; untranslated items fall back cleanly.

## Phase 8 — Comments with moderation

- [ ] **P8-T1 Domain & persistence: Comment**
  Scope: entity + `CommentStatus` + `Approve/Reject/MarkSpam`, `ip_hash` (salted SHA-256), migration, index.
  Done when: domain tests pass.

- [ ] **P8-T2 Spam guard**
  Scope: `ISpamGuard` (honeypot, Data-Protection-signed render timestamp, min 3 s / max 24 h), `GET /api/forms/token` used by server components, rate limiter `public-forms`, reusable `AntiSpamFields` React component.
  Done when: tests: filled honeypot → dropped; instant submit → dropped; 4th submit in window → 429.
  Learn: honeypots, time traps, rate limiting.

- [ ] **P8-T3 Comment form & display**
  Scope: form under posts (if `allow_comments` and flag `Comments.Enabled`), "awaits approval" message, approved list (name, localized date, text with line breaks), count.
  Done when: pending not visible; approved visible; emails never in any public response.

- [ ] **P8-T4 Moderation queue**
  Scope: `/admin/comments` tabs (Pending/Approved/Rejected/Spam), per-item + bulk actions, link to post, pending badge, revalidation on approve.
  Done when: an approved comment shows publicly on the next request.

- [ ] **P8-T5 Email notification (flagged off)**
  Scope: `IEmailSender`, `LoggingEmailSender` (default), `SmtpEmailSender` (MailKit), notify on new comment when `Notifications.Email` is on.
  Done when: flag off → log line only; flag on + local MailPit → email received.

## Phase 9 — Contact form & resume PDF

- [ ] **P9-T1 Contact form**
  Scope: `ContactMessage` + migration (`type`: `Hiring` | `Project` | `Other`), `ContactService`, form on `/{locale}/contact` with anti-spam and the type preselected from `?type=`, success state, admin notification via `IEmailSender`.
  Done when: submission stored with its type; spam protections tested.

- [ ] **P9-T2 Admin inbox**
  Scope: list (New/Read/Archived, filter by type), detail marks as read, reply via `mailto:`, archive, new-count badge.
  Done when: workflow works end to end.

- [ ] **P9-T3 Resume PDF management**
  Scope: `ResumeDocument` + migration, admin upload/replace (PDF only, magic bytes, ≤ 10 MB), history, one current per language.
  Done when: uploading a new file switches current.

- [ ] **P9-T4 Resume download endpoint**
  Scope: `GET /api/resume/{lang}/download` streams the current file (`Content-Disposition: attachment; filename="Resume-<Name>.pdf"`, `ETag`), 404 if none; enable the buttons on Resume and Home.
  Done when: download works; buttons hidden without a file.

## Phase 10 — SEO & machine-readable → MVP launch

- [ ] **P10-T1 Metadata & structured data**
  Scope: Next.js metadata per page (title template, description, canonical, OG, Twitter, `og:locale` `fa_IR`/`en_US`), JSON-LD `Person` (`name` Mahdi Azghandi, `alternateName` Shahram Azghandi + Persian forms, `sameAs` from `/api/site`; ADR-017) + `WebSite` + `BlogPosting`.
  Done when: Rich Results Test and OG previews pass.

- [ ] **P10-T2 Sitemap, robots, feeds, hreflang**
  Scope: `sitemap.ts` (pages, projects, posts, tags with `lastmod` and language alternates), `robots.ts` (disallow `/admin`), Atom feed per locale (route handler), `<link rel="alternate">` for feeds, hreflang for translated pairs + `x-default`.
  Done when: feeds validate; hreflang pairs are reciprocal (test).

- [ ] **P10-T3 OG images**
  Scope: per-page OG images (1200×630) in the site's style. Persian shaping in `next/og` (Satori) must be verified first; if it breaks Persian text, render them in the API (SkiaSharp + HarfBuzzSharp) instead.
  Done when: Persian and English titles render correctly in Telegram/LinkedIn previews.

- [ ] **P10-T4 Performance pass**
  Scope: `next/image` with responsive sizes for uploads, lazy loading, bundle analysis (heavy parts only where used), font preload check, compression in Caddy, cache headers review.
  Done when: Lighthouse ≥ 90 in all categories on Home, a blog post and Projects (mobile).

- [ ] **P10-T5 Machine-readable résumé: JSON, `curl`, `llms.txt`**
  Scope: from the structured résumé (P3-T1): `GET /api/resume.json?lang=fa|en` (JSON Resume schema); `curl mahdiazghandi.ir` (Caddy routes terminal User-Agents without `text/html` in `Accept` on `/` to the API) returns a plain-text card with ANSI colours, `Vary: User-Agent, Accept`; `/llms.txt`. Rate limit `public-api`.
  Done when: integration tests for each; browsers still get the normal redirect.
  Learn: content negotiation, `Vary`.

- [ ] **P10-T6 Launch checklist**
  Scope: real content in **both languages** (about, services, decisions, résumé data + PDF, gym case study, demos live, at least 2 posts), favicon/app icons, final backup check, admin password rotated, dev seeders off in prod.
  Done when: every item ticked → 🚀

## Phase 11 — Under the hood: X-Ray, scrollytelling, metrics & analytics

> Honest telemetry only (ADR-018): every number shown is measured by this site; X-Ray and scrollytelling show the
> real stack. Never public: CPU/RAM, container names, package versions, internal hostnames.

- [ ] **P11-T1 Umami service**: compose (pinned tag), init script creates the `umami` DB/user, `APP_SECRET`, Caddy route (`analytics.<domain>`). Done when: dashboard reachable, admin password changed.
- [ ] **P11-T2 Tracking integration**: script served from our own domain with the CSP nonce, behind `Analytics.Umami`, excluded on admin, respects DNT. Done when: page views appear.
- [ ] **P11-T3 Custom events & privacy page**: resume download, contact submit (with type), live-project click, demo run, `curl` card hit; short privacy page. Done when: events visible.

- [ ] **P11-T4 Request metrics & build info**
  Scope: `System.Diagnostics.Metrics` + in-memory rolling window (1 h / 24 h): request count, p50/p95 latency, error rate, cache hit ratio; build info (version, commit SHA, build time) stamped by CI into both images; "deployed at".
  Done when: percentile window unit-tested; numbers match a local load test.
  Learn: percentiles vs averages.

- [ ] **P11-T5 Per-page timing line**
  Scope: API emits `Server-Timing` (handler time, DB query count via a `DbCommandInterceptor`, cache hit); the front-end collects the timings of the API calls made while rendering the page plus its own render time and shows "this page: 12 ms · 2 queries" in the footer (server-rendered).
  Done when: correct on cached and uncached data.
  Learn: `Server-Timing`, EF Core interceptors.

- [ ] **P11-T6 Status API & "Under the hood" page**
  Scope: `GET /api/status` (P11-T4 + project statuses, cached 10 s, `public-api`); `/{locale}/under-the-hood`: live numbers (poll 30 s, paused when hidden), architecture section, "what is measured and what isn't", links to CI and decisions.
  Done when: both languages and themes; numbers update.

- [ ] **P11-T7 Hero status line**
  Scope: `🟢 online · p95 38 ms · deployed 2 h ago` in the Home slot, from `/api/status` after first paint, linking to under-the-hood.
  Done when: Home LCP unchanged.

- [ ] **P11-T8 X-Ray mode**
  Scope: global toggle "See behind the scenes"; the UI layer peels back (CSS 3D / Motion) to show, per section: the real code excerpt that produced it (extracted at build time from regions marked `// xray:<name>` in the repo, with a GitHub link at the build's commit), and the API calls, queries and timings of *this* request (P11-T5). Keyboard operable; reduced motion → instant switch.
  Done when: every Home section has an X-Ray view; excerpts can't drift from the code (build fails on a missing marker).
  Learn: build-time code extraction, honest demos.

- [ ] **P11-T9 Scrollytelling request journey**
  Scope: on under-the-hood: a scroll-driven line follows a real request — browser → Caddy → Next.js → ASP.NET Core → PostgreSQL → back — each stop annotated with what it does on this site and the visitor's own measured timings; CSS scroll-driven animations with a static diagram fallback.
  Done when: both languages; readable as a static page without animation.

## Phase 12 — AI layer

> AI is optional (ADR-014): every feature is behind an `Ai.*` flag; with all off the site is complete. New
> dependencies (pgvector, ONNX Runtime, MCP C# SDK, Microsoft.Extensions.AI) are approved by Mahdi at the start of
> the task that adds them. Public features never call an external AI service.

- [ ] **P12-T1 Local embedding model**
  Scope: `IEmbeddingGenerator<string, Embedding<float>>` with ONNX Runtime and a small multilingual model with good Persian support (licence checked); model file in the image or a mounted volume — never downloaded at runtime.
  Done when: two Persian sentences with the same meaning score closer than an unrelated pair; one embedding < 100 ms on the VPS CPU.
  Learn: embeddings, cosine similarity.

- [ ] **P12-T2 Vector storage & indexing**
  Scope: pgvector (DB image becomes a pgvector build of PostgreSQL 17), `content_embeddings`, HNSW index, indexing on publish via a background queue, admin "re-index all".
  Done when: publishing a post creates its chunks; integration test with pgvector.

- [ ] **P12-T3 Semantic search page**
  Scope: `/{locale}/search?q=` hybrid ranking (vector + full-text with Persian normalization: ي→ی, ك→ک, ZWNJ), rate limit `public-api`, flag `Ai.SemanticSearch`; "found in 40 ms by a local model".
  Done when: a query sharing no words with a post still finds it; works without JS (plain form).
  Learn: hybrid search, Persian normalization.

- [ ] **P12-T4 Related posts**: nearest neighbours computed on publish and stored; shown at the end of posts; fallback to shared tags.

- [ ] **P12-T5 Ctrl+K command palette**
  Scope: React palette: go to pages/projects, switch language and theme, download résumé, copy email, search (P12-T3); visible search button on touch devices.
  Done when: fully keyboard operable (`Esc` closes, focus restored); usable at 360 px.

- [ ] **P12-T6 MCP server**
  Scope: official MCP C# SDK, Streamable HTTP at `/mcp`; read-only tools `get_resume`, `list_projects`, `get_project`, `search_posts`, `get_post` over the same Application services; rate limit `public-api`; flag `Ai.Mcp`.
  Done when: an MCP client lists and calls every tool; integration test per tool.
  Learn: the Model Context Protocol.

- [ ] **P12-T7 Admin AI assistant**
  Scope: `IChatClient` against an OpenAI-compatible endpoint (AvalAI today; `Ai:Chat:BaseUrl|ApiKey|Model`, validated when the flag is on, in `.env.example`); admin-only: suggest excerpt + SEO description, suggest tags, draft an English translation (never auto-published); daily token budget; flag `Ai.AdminAssistant` (off). ADR-015.
  Done when: tests with a fake `IChatClient`; budget exceeded → actions disabled; no AI endpoint reachable without `Admin`.

## Phase 13 — Hardening & polish

- [ ] **P13-T1 CSP & security headers audit** (ADR-025) — securityheaders.com A on HTML and API responses.
- [ ] **P13-T2 Admin 2FA (TOTP)** with recovery codes.
- [ ] **P13-T3 Dependabot (NuGet + npm)** + `dotnet list package --vulnerable` and `pnpm audit` in CI.
- [ ] **P13-T4 Accessibility audit** (keyboard pass, NVDA smoke test, contrast re-check, signature features' fallbacks).
- [ ] **P13-T5 Resume print stylesheet** & page polish.
- [ ] **P13-T6 Backup restore drill #2** + documented RPO/RTO.

## Phase 14 — Newsletter (signup only)

- [ ] **P14-T1 Subscriber model**: entity per architecture §4, token hashing, unique email (citext), migration, domain tests.
- [ ] **P14-T2 Signup UI**: component (footer + end of post), `/{locale}/newsletter` page, anti-spam, flag `Newsletter.Signup`; stored as `Pending`; idempotent (no enumeration leak).
- [ ] **P14-T3 Admin subscribers**: list, filter, CSV export, manual unsubscribe/delete.
- [ ] **P14-T4 Sending scaffold (disabled)**: `INewsletterSender`, confirm/unsubscribe handlers behind `Newsletter.Sending` (false → 404/no-op), tests for both flag states.

## Phase 15 — International move (ADR-023)

- [ ] **P15-T1 Domain & server choice**: `.com` name, foreign VPS, DNS plan; decide the `.ir` domains' role (301 to `.com` or a Persian mirror).
- [ ] **P15-T2 Migration runbook & move**: volumes + `pg_dump` restore + DNS switch, rehearsed once on a staging host; downtime noted.
- [ ] **P15-T3 English-first default**: `/` defaults to `en`, canonical `Site__BaseUrl`/`SITE_URL` = `.com`, hreflang/sitemaps updated, redirects per P15-T1.
- [ ] **P15-T4 GeoIP language step** on `/` only (GeoLite2 file mounted, refreshed monthly; `IR → fa`, else `en`).
- [ ] **P15-T5 Provider review**: AI assistant provider (ADR-015), optional English display font, public chat reconsidered (Backlog).

## Content track (parallel, writing only)

> No code. Drafts are written by Mahdi (Claude helps with structure and the English versions) and published through
> the admin once P7 exists. Two posts must be ready for the launch (P10-T6).

- [ ] **C-T1 Series ".NET under Iranian constraints"**: outline + first two posts (images built abroad and pulled from GHCR; `docker save | docker load`; mirrors; Let's Encrypt on a `.ir` domain).
- [ ] **C-T2 Series "Building this site"**: one post per finished phase — now a full-stack story (Next.js + .NET on one origin), made from the ADRs and `learning.md`.
- [ ] **C-T3 Case-study texts**: gym system (P6-T9), cinema reservation, microservices platform — Problem · Architecture · Key decisions · Results · What went wrong.
