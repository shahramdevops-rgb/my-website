# Tasks

> Each task is small, independent and ends in a working, committed state.
> To run one, tell Claude: **"Do task P1-T3"**. Claude reads `CLAUDE.md` → the task → relevant sections of `architecture.md`/`rules.md`, implements it, and ticks the box.
> Format: **Scope** (what to build) · **Done when** (acceptance criteria) · **Learn** (concept to note in `learning.md`, if new).
> Status: `[ ]` todo · `[~]` in progress · `[x]` done

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

## Phase 1 — Design system, layout & i18n infrastructure

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

- [ ] **P1-T6 Theme toggle (dark default)**
  Scope: nonce'd inline head script sets `data-theme` before paint (localStorage → default **dark**), Alpine store `theme` + `_ThemeToggle` button (sun/moon-leaf icon, `aria-pressed`), smooth color transition (motion-safe).
  Done when: no flash of wrong theme on reload; preference persists; works with JS disabled (stays dark).
  Learn: FOUC, why the script must be inline & tiny.

- [ ] **P1-T7 Alpine.js (CSP build) setup**
  Scope: vendor `@alpinejs/csp` into `wwwroot/lib/alpine-3.x.y/`, `wwwroot/js/app.js` bootstraps components from `wwwroot/js/components/`, `defer` loading.
  Done when: mobile menu + theme toggle run under a CSP without `unsafe-eval`.

- [ ] **P1-T8 Botanical motif library**
  Scope: Razor partials in `Shared/Motifs/`: `_LeafDivider`, `_VineCorner`, `_Sprig`, `_BloomCluster`, `_HeroBotanical` (larger line-art composition). `currentColor`-based, `aria-hidden`, subtle motion-safe sway animation for hero leaves. Original art only (hand-authored SVG paths).
  Done when: motifs recolor with theme; zero layout shift.

- [ ] **P1-T9 UI component partials + style guide page**
  Scope: `_Button` (primary/ghost/link), `_Card`, `_Tag`, `_SectionHeader` (with leaf motif), `_FormField` (label, input/textarea, validation message), `_Alert`, `_Badge` (Live/InProgress/Archived); dev-only `/fa/_styleguide` page showing everything.
  Done when: style guide renders all components in both themes (and in LTR at `/en/_styleguide` once P1-T11 is done).

- [ ] **P1-T10 Error pages**
  Scope: `NotFound` (friendly botanical "this path hasn't grown yet"), `Error` (500, shows request id in dev only), status code re-execute.
  Done when: unknown URL shows 404 page with correct status code.

- [ ] **P1-T11 English culture & language switcher** (moved from P13, ADR-016)
  Scope: `SupportedCultures` → `["fa", "en"]`; `SharedResource.en.resx` with every key of the `fa` file; `_LanguageSwitcher` in the header (sets the `lang` cookie, links to the same page in the other language — DB content gets "translation if it exists, else that language's home" in P6-T8); LTR check at 360px and 1440px; dates/numbers in `en` use the Gregorian calendar and Latin digits through the existing `Formatting/` helpers; English text keeps Vazirmatn's Latin glyphs for now (pairing optional, P14-T2). Update the P1-T3 test that expects `/en` → 404.
  Done when: `/en` renders LTR with English chrome; a test fails when a key exists in `fa` but not in `en`; `/` with `Accept-Language: en` → 302 `/en`.
  Learn: LTR/RTL with logical properties, resource fallback.

## Phase 2 — Static public pages (bilingual)

> Every page in this phase ships in **`fa` and `en`** (prose partials `.fa.cshtml` + `.en.cshtml`, strings in both resx files).
> Mahdi provides the facts; Claude drafts the English text for Mahdi to edit. Requires P1-T11.

- [ ] **P2-T1 Home page**
  Scope: Hero (name, a **concrete** value proposition instead of a generic "backend developer" line, `_HeroBotanical`); **two audience paths**: "Hiring?" → Resume / Decisions and "Have a project?" → Services / Contact (`?type=project`); short intro; sections with placeholders to be wired later: featured projects, services teaser, latest posts. Leave a slot for the status line (P10-T7).
  Done when: responsive, both themes, both languages, Lighthouse a11y ≥ 90.

- [ ] **P2-T2 About page — "From circuits to cloud"**
  Scope: localized prose partials `_AboutContent.fa.cshtml` / `.en.cshtml`, photo slot, skills/tech grid (from the structured résumé, P2-T4), timeline component: BSc Electrical Engineering (University of Guilan) → MSc Electrical Engineering (Shahid Beheshti University) → backend engineering, with at most 2–3 concrete bridges (e.g. control systems & feedback → observability; state machines → domain invariants); one line "also known as Shahram" (ADR-017).
  Done when: page complete in both languages with real text or clearly marked placeholders.

- [ ] **P2-T3 Services page**
  Scope: services list (e.g. API development, .NET backend, performance/DB optimization, code review/consulting) as cards with icons, "how I work" steps, CTA to `/{culture}/contact?type=project`.
  Done when: page renders in both languages; content in localized partials.

- [ ] **P2-T4 Structured résumé + Resume page**
  Scope: `ResumeProfile` record (experience, education, skills, links) loaded from one JSON file per culture in the Web project (`resume.fa.json`, `resume.en.json`; ADR-013), validated at startup; Resume page renders it; print-friendly basics; download button placeholder (disabled until P8). The same data later feeds the About skills grid, `/api/resume.json`, the `curl` card, `llms.txt` (P9-T5) and MCP (P11-T6).
  Done when: page renders cleanly in both languages and prints legibly; an invalid or incomplete file fails startup (test).
  Learn: single source of truth, many renderings.

- [ ] **P2-T5 Contact page (links only)**
  Scope: email (obfuscated `mailto` to reduce scraping), GitHub, Telegram cards; placeholder area for form (P8).
  Done when: links correct from `SiteOptions`; both languages.

- [ ] **P2-T6 Engineering decisions page**
  Scope: `/{culture}/decisions` with 5–6 cards **Challenge → Decision → Why**, picked across projects (this site, gym system, cinema reservation, microservices platform — e.g. modular monolith instead of microservices for an MVP, no generic repository over EF Core, PostgreSQL + MongoDB split); localized prose partials; linked from the Home hiring path, About and Resume.
  Done when: renders in both languages and themes; all card content readable without interaction.

## Phase 3 — First deployment (walking skeleton)

- [ ] **P3-T1 Production compose & Caddy**
  Scope: `compose.prod.yaml` (image from GHCR, restart policies, no DB port exposed, volumes `pgdata`/`uploads`/`dpkeys`/`caddy_data`), `deploy/Caddyfile` (`mahdiazghandi.ir` served with Let's Encrypt; `shahramazghandi.ir` + `www.` variants 301 → canonical per architecture §9.1; hostnames from env), security headers baseline, compression.
  Done when: `docker compose -f compose.yaml -f compose.prod.yaml config` validates; runs locally.

- [ ] **P3-T2 App production settings**
  Scope: `ForwardedHeaders` (trust Caddy network only), HSTS (prod), Data Protection keys persisted to `/app/data/dp-keys` with app name set, `appsettings.Production.json`, migrations run via `--migrate` CLI flag (not at normal startup).
  Done when: restart of `web` container doesn't invalidate cookies (verify after P4); migrations run only when asked.
  Learn: reverse proxy headers, Data Protection.

- [ ] **P3-T3 Release workflow**
  Scope: `.github/workflows/release.yml` — on tag `v*` or manual: build image, tag with version + `sha`, push to GHCR.
  Done when: an image appears in GHCR.
  Learn: why build outside Iran; image tagging.

- [ ] **P3-T4 Server setup & deploy script**
  Scope: `deploy/README.md` (Ubuntu LTS setup: Docker install via mirror if needed, firewall 22/80/443, non-root deploy user, SSH keys, registry login), `deploy/scripts/deploy.sh` (pull → migrate → up -d → health check → prune), fallback `docker save | ssh docker load` instructions.
  Done when: Mahdi deploys with one command and site loads over HTTPS (IP/temporary host).

- [ ] **P3-T5 Backups**
  Scope: `backup.sh` (`pg_dump -Fc` + tar of `uploads`, 14-day rotation), cron entry, `restore.sh`, documented off-server copy step.
  Done when: a restore into a fresh DB has been performed once and documented.

## Phase 4 — Admin panel & authentication

- [ ] **P4-T1 Identity setup**
  Scope: `AppUser : IdentityUser<Guid>`, `AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>`, password & lockout options (5 attempts, 15 min), cookie settings (HttpOnly, Secure, SameSite=Lax, 7-day sliding), migration.
  Done when: Identity tables created.

- [ ] **P4-T2 Admin seeding & no registration**
  Scope: `AdminSeeder` reads `Admin__Email`/`Admin__Password` from env, creates user + `Admin` role once; no register page exists at all.
  Done when: fresh DB + env vars → admin can log in; without env vars app logs a warning, doesn't crash.

- [ ] **P4-T3 Login / logout pages**
  Scope: custom `Areas/Admin/Pages/Account/Login` + `Logout` (POST only), Persian UI, generic error message, rate-limit policy `login`, return-URL validation (local only).
  Done when: integration tests: wrong password → error; 5× → locked; open-redirect attempt blocked.
  Learn: cookie auth flow, open redirects.

- [ ] **P4-T4 Authorization convention**
  Scope: `Admin` policy; `AuthorizeAreaFolder("Admin", "/")` with `AllowAnonymous` only on Login; `/admin/api/*` endpoints require policy.
  Done when: test proves every admin page redirects anonymous users.

- [ ] **P4-T5 Admin layout & dashboard**
  Scope: `_AdminLayout` (sidebar: داشبورد، پست‌ها، نمونه‌کارها، کامنت‌ها، پیام‌ها، رزومه، مشترکین), TempData flash messages partial, dashboard cards (counts: posts, pending comments, new messages — show 0 until features exist), `noindex` meta.
  Done when: navigation works; admin pages never cached publicly.

## Phase 5 — Projects, portfolio & case studies

- [ ] **P5-T1 Domain: Project & MediaFile**
  Scope: entities per architecture §4 (including nullable `HealthUrl`, https only), `ProjectStatus`, `Slug` value object with validation, domain methods (`Feature()`, `Archive()`, `Reorder()`), unit tests.
  Done when: tests pass.

- [ ] **P5-T2 Persistence for projects & media**
  Scope: EF configurations (indexes, `text[]` tech stack, unique `(language, slug)`), migration.
  Done when: migration applied; SQL reviewed.

- [ ] **P5-T3 File storage & image upload**
  Scope: `IFileStorage` + `LocalFileStorage` (volume path from options), upload validator (jpg/png/webp, magic bytes, ≤ 5 MB), dimensions read, `MediaFile` record, static serving of `/media/{key}` with long cache headers.
  Done when: tests reject a renamed `.exe`; valid image stored and served.
  Learn: why never trust file extensions/content-type.

- [ ] **P5-T4 Result pattern & ProjectAdminService**
  Scope: `Result`/`Error` types, `CreateProjectCommand`/`UpdateProjectCommand` + FluentValidation, Markdown body rendering via `IMarkdownRenderer`, slug uniqueness.
  Depends on: **P6-T1** (Markdown renderer) — do that task first; it has no other dependencies.
  Done when: service tests cover create/update/duplicate slug.

- [ ] **P5-T5 Admin CRUD pages for projects**
  Scope: list (sortable order, featured toggle), create/edit form (title, slug suggestion, summary, markdown body, status, live URL, health URL, source URL, tech tags input, cover upload, dates), new projects start with a **case-study Markdown template** (Problem · Architecture · Key decisions · Results · What went wrong), delete with confirm page (no JS `confirm()`).
  Done when: full CRUD works through the browser.

- [ ] **P5-T6 Public project pages**
  Scope: `ProjectService` queries, `/{culture}/projects` grid (cover, title, summary, tech tags, "Live" badge + external link with `rel="noopener"`, live status from P5-T7), `/{culture}/projects/{slug}` details (case study), featured projects on Home.
  Done when: your live project is visible with a working link.

- [ ] **P5-T7 Live status monitor**
  Scope: `ProjectHealthMonitor : BackgroundService` with `PeriodicTimer` (every 5 min) requests each `HealthUrl` (5 s timeout, typed `HttpClient`), keeps the last result in memory (`Up` / `Down` / `Unknown` + checked-at); badge 🟢/🔴 with "checked N min ago" on cards and details. Only our own projects' URLs are called; a failure never breaks a page (shows `Unknown`).
  Done when: tests with a fake handler cover up, down and timeout; status survives without blocking page rendering.
  Learn: background services, `IHttpClientFactory`, timeouts.

- [ ] **P5-T8 Gym system — flagship case study (content)**
  Scope: get the client's **written permission** to name the business and show screenshots (else anonymize: "gym management system for a sports club"); case study with the template; screenshots or a short video of the admin panel **with fake data only**; public site link + health URL; the admin panel is never linked.
  Done when: case study published in both languages; permission (or anonymization) noted in the admin record.

## Phase 6 — Blog

- [ ] **P6-T1 Markdown renderer**
  Scope: `IMarkdownRenderer` → `MarkdigRenderer` (advanced extensions, `DisableHtml`, auto heading ids, `dir="auto"` on paragraphs, `dir="ltr"` on code blocks, external links `rel="noopener nofollow"`), HtmlSanitizer allow-list, TOC extraction, reading-time calculation; unit tests including XSS payloads.
  Done when: `<script>`/`javascript:` payloads are stripped in tests.
  Learn: XSS, defense in depth.

- [ ] **P6-T2 Domain & persistence: Post, Tag**
  Scope: entities, `PostStatus` transitions (`Publish`, `Unpublish`, `Archive`), `GrowthStage` (`Seedling` | `Budding` | `Evergreen`, default `Seedling`, changed via `post.SetGrowthStage(stage)`), many-to-many tags, indexes (`status, published_at desc`), migration.
  Done when: domain tests for status transitions pass.

- [ ] **P6-T3 PostAdminService**
  Scope: create/update/publish/unpublish/delete, tag upsert by name, SEO fields, re-render HTML on save, cache eviction hook.
  Done when: service tests pass.

- [ ] **P6-T4 Admin post editor with live preview**
  Scope: list (filter by status, search by title), editor page (title, slug, excerpt, tags, growth stage, cover, SEO fields, markdown textarea with monospace font), Alpine `markdownPreview` component → debounced `POST /admin/api/markdown-preview`, side-by-side on desktop / tabs on mobile, image upload that inserts `![alt](/media/...)` at cursor, save draft / publish buttons.
  Done when: preview matches published output exactly.

- [ ] **P6-T5 Public blog list & tag pages**
  Scope: `/{culture}/blog` paged (10/page, `?page=`), post cards (title, excerpt, date, reading time, tags, growth-stage badge 🌱/🌿/🌳), filter `?stage=`, `/{culture}/blog/tag/{slug}`, latest 3 posts on Home.
  Done when: pagination links correct; empty state designed.

- [ ] **P6-T6 Post page**
  Scope: title, meta line (with growth stage), cover, TOC (collapsible), body with typography styles (`prose`-like custom styles for RTL), highlight.js (vendored, only on this page), copy-code button, prev/next posts, tags.
  Done when: mixed Persian text + English code renders correctly.
  Learn: bidi text (`dir="auto"`, isolation).

- [ ] **P6-T7 Output caching**
  Scope: `AddOutputCache` policies for public pages (vary by culture, page query), tags `blog`, `post:{id}`, `projects`; eviction from admin services; no caching for authenticated requests.
  Done when: edit in admin shows immediately on public page; repeated GETs don't hit DB (verify via logs).
  Learn: caching & invalidation.

- [ ] **P6-T8 Translations for posts & projects** (moved from P13)
  Scope: admin "Add translation" action for posts and projects (new row, same `translation_group`, other language), per-language lists in admin, language switcher links to the translated URL when one exists (else that language's list page).
  Done when: a Persian post and its English translation link to each other; untranslated items fall back cleanly.

## Phase 7 — Comments with moderation

- [ ] **P7-T1 Domain & persistence: Comment**
  Scope: entity + `CommentStatus` + `Approve/Reject/MarkSpam`, `ip_hash` (salted SHA-256), migration, index.
  Done when: domain tests pass.

- [ ] **P7-T2 Spam guard**
  Scope: `ISpamGuard` (honeypot check, Data-Protection-signed render timestamp, min 3 s / max 24 h), rate limiter policy `public-forms` (fixed window per client IP), reusable `_AntiSpamFields` partial.
  Done when: tests: filled honeypot → dropped; instant submit → dropped; 4th submit in window → 429 page.
  Learn: honeypots, time traps, rate limiting algorithms.

- [ ] **P7-T3 Comment form & display**
  Scope: form under post (if `allow_comments` and flag `Comments.Enabled`), PRG with "your comment awaits approval" message, approved comments list (name, Persian date, text with line breaks, encoded), count.
  Done when: pending comment not visible; approved visible; email never in HTML.

- [ ] **P7-T4 Moderation queue**
  Scope: `/admin/comments` tabs (Pending/Approved/Rejected/Spam), approve/reject/spam per item + bulk, link to post, pending badge in sidebar & dashboard, cache eviction on approve.
  Done when: approving shows comment publicly within one request.

- [ ] **P7-T5 Email notification (flagged off)**
  Scope: `IEmailSender`, `LoggingEmailSender` (default), `SmtpEmailSender` (MailKit, options), notify admin on new comment when `Notifications.Email` is on.
  Done when: with flag off → log line only; with flag on + local MailPit container → email received.

## Phase 8 — Contact form & resume PDF

- [ ] **P8-T1 Contact form**
  Scope: `ContactMessage` entity + migration (with `type`: `Hiring` | `Project` | `Other`), `ContactService`, form on `/{culture}/contact` with `_AntiSpamFields` and a request-type choice preselected from `?type=`, success state, admin notification via `IEmailSender`.
  Done when: submission stored with its type; spam protections tested.

- [ ] **P8-T2 Admin inbox**
  Scope: list (New/Read/Archived, filter by type), detail view marks as read, reply via `mailto:` link, archive, new-count badge.
  Done when: workflow works end-to-end.

- [ ] **P8-T3 Resume PDF management**
  Scope: `ResumeDocument` + migration, admin upload/replace (PDF only, magic bytes, ≤ 10 MB), keeps history, marks one current per language.
  Done when: uploading new file switches current.

- [ ] **P8-T4 Resume download endpoint**
  Scope: `GET /{culture}/resume/download` streams current file for that language, `Content-Disposition: attachment; filename="Resume-<Name>.pdf"`, `ETag`, 404 page if none; enable button on Resume page & Home.
  Done when: download works in browsers; button hidden if no file.

## Phase 9 — SEO & machine-readable → MVP launch

- [ ] **P9-T1 SEO head & structured data**
  Scope: `SeoMetadata` model set by each page, `_SeoHead` (title template, description, canonical, OG, Twitter, `og:locale` per culture: `fa_IR` / `en_US`), JSON-LD `Person` (`name` Mahdi Azghandi, `alternateName` Shahram Azghandi + Persian forms, `sameAs` from `Site:Social`; ADR-017) + `WebSite` (layout), `BlogPosting` (post page), default OG image (botanical, 1200×630).
  Done when: validators (Rich Results Test, OG preview) pass.

- [ ] **P9-T2 sitemap, robots, feed**
  Scope: `/sitemap.xml` (pages, projects, posts, tags with `lastmod` and `xhtml:link` language alternates), `/robots.txt` (disallow `/admin`), `/feed.xml` Atom per culture, `<link rel="alternate">` for feed, hreflang for every translated pair from `translation_group` + `x-default` → `/` (moved from P13).
  Done when: feeds validate (W3C feed validator); hreflang pairs are reciprocal (test).

- [ ] **P9-T3 Performance pass**
  Scope: responsive images (`srcset` from stored sizes or on-upload resize via ImageSharp — license check, else SkiaSharp), lazy loading, preload critical font, compression in Caddy, cache headers review.
  Done when: Lighthouse ≥ 90 in all categories on Home, Blog post, Projects (mobile).

- [ ] **P9-T4 Launch checklist**
  Scope: real content in **both languages** (about, services, decisions, resume data + PDF, gym case study with client permission, at least 2 posts from the content track), favicon/app icons (leaf mark), `humans.txt` optional, final backup check, admin password rotated, dev seeder disabled in prod.
  Done when: every item ticked → 🚀

- [ ] **P9-T5 Machine-readable résumé: JSON, `curl`, `llms.txt`**
  Scope: all three render the structured résumé (P2-T4) — `GET /api/resume.json?lang=fa|en` (JSON Resume schema); `curl mahdiazghandi.ir` (request to `/` from a terminal client — `curl`/`Wget`/`HTTPie` user agent and no `text/html` in `Accept`) returns a plain-text card with ANSI colours instead of the redirect, with `Vary: User-Agent, Accept`; `/llms.txt` (Markdown summary of who Mahdi is + links to résumé, projects, posts). Rate limit `public-api`.
  Done when: integration tests for each; browsers still get the normal redirect.
  Learn: content negotiation, `Vary`.

## Phase 10 — Under the hood & analytics

> Honest telemetry only (ADR-018): every number shown is measured by this site. Never public: CPU/RAM, container
> names, package versions, internal hostnames.

- [ ] **P10-T1 Umami service**: add to compose (pinned tag), init script creates `umami` DB/user, `APP_SECRET` env, Caddy route (`analytics.<domain>` or `/stats` path). Done when: dashboard reachable, admin password changed.
- [ ] **P10-T2 Tracking integration**: `_Analytics` partial behind flag `Analytics.Umami`, script served via own domain (proxy), excluded on admin & for authenticated admin, respects DNT; CSP updated. Done when: page views appear.
- [ ] **P10-T3 Custom events & privacy note**: events for resume download, contact submit (with type), live-project click, `curl` card hit, newsletter signup; short privacy page (cookieless analytics, what's stored for comments). Done when: events visible in Umami.

- [ ] **P10-T4 Request metrics & build info**
  Scope: `System.Diagnostics.Metrics` instruments + a small in-memory rolling-window aggregator (last 1 h / 24 h): request count, p50/p95 latency, error rate, output-cache hit ratio; build info (version, commit SHA, build time) stamped by CI into the assembly; process start time = "deployed at".
  Done when: unit tests for the percentile window; numbers match a local load test with known latencies.
  Learn: percentiles vs averages, metrics instruments.

- [ ] **P10-T5 Per-page `Server-Timing` line**
  Scope: middleware emits `Server-Timing` (app duration, DB query count via a `DbCommandInterceptor`, cache hit/miss); a tiny Alpine component reads `performance.getEntriesByType('navigation')[0].serverTiming` and shows "this page: 12 ms · 2 queries" (or "served from cache") in the footer.
  Done when: correct on cached and uncached responses; nothing shown with JS off.
  Learn: `Server-Timing`, EF Core interceptors.

- [ ] **P10-T6 Status API & "Under the hood" page**
  Scope: `GET /api/status` (JSON from P10-T4 + P5-T7 project statuses, cached 10 s, rate limit `public-api`); `/{culture}/under-the-hood`: live numbers (poll every 30 s, paused while the tab is hidden), architecture diagram (inline SVG, both themes), links to CI and the decisions page, a short "what is measured and what isn't" note, and "connect your AI assistant" instructions once P11-T6 exists.
  Done when: both languages and themes; numbers update; with JS off a server-rendered snapshot is shown.

- [ ] **P10-T7 Hero status line**
  Scope: compact `🟢 online · p95 38 ms · deployed 2 h ago` in the Home hero slot (P2-T1), fetched from `/api/status` after first paint, linking to the under-the-hood page.
  Done when: Home stays output-cached; Lighthouse performance/LCP unchanged.

- [ ] **P10-T8 Cinema double-booking simulation**
  Scope: in the cinema case study: a scripted SVG animation (Alpine CSP, motion-safe; a readable step list when `prefers-reduced-motion`) of two users booking the same seat → gateway → API → PostgreSQL row lock → one success, one clean "seat already taken"; clearly labelled **Simulation**; next to it the real code excerpt and a link to the project's concurrency test. No requests to the real cinema system.
  Depends on: the cinema project entered in P5 with its repository link.
  Done when: understandable without animation; keyboard operable; both languages.

## Phase 11 — AI layer

> AI is an optional layer (ADR-014): every feature is behind an `Ai.*` flag, and with all of them off the site is
> complete. New dependencies (pgvector, ONNX Runtime, MCP C# SDK, Microsoft.Extensions.AI) are approved by Mahdi at
> the start of the task that adds them. Public features never call an external AI service.

- [ ] **P11-T1 Local embedding model**
  Scope: `IEmbeddingGenerator<string, Embedding<float>>` (Microsoft.Extensions.AI) implemented with ONNX Runtime and a small multilingual model with good Persian support (licence checked); the model file ships with the image or a mounted volume (decided in this task) — never downloaded at runtime.
  Done when: unit test — two Persian sentences with the same meaning score closer than an unrelated pair; one embedding < 100 ms on the VPS CPU.
  Learn: embeddings, cosine similarity, running models in-process.

- [ ] **P11-T2 Vector storage & indexing**
  Scope: pgvector (DB image becomes a pgvector build of PostgreSQL 17), `content_embeddings` table (chunks of posts and projects per language), HNSW index, indexing on publish via a background queue, admin "re-index all" action.
  Done when: publishing a post creates its chunks; integration test on real PostgreSQL with pgvector.

- [ ] **P11-T3 Semantic search page**
  Scope: `/{culture}/search?q=` hybrid ranking (vector similarity + PostgreSQL full-text with the `simple` config and Persian normalization: ي→ی, ك→ک, ZWNJ handling), rate limit `public-api`, flag `Ai.SemanticSearch`; result header "found in 40 ms by a local model".
  Done when: a query sharing no words with a post still finds it; works with JS off (plain form).
  Learn: hybrid search, why Persian text needs normalization.

- [ ] **P11-T4 Related posts**
  Scope: nearest neighbours computed on publish and stored; shown at the end of the post page; fallback to shared tags.
  Done when: related list updates after a post is edited.

- [ ] **P11-T5 Ctrl+K command palette**
  Scope: Alpine component: go to pages/projects, switch language and theme, download résumé, copy email, and search (P11-T3); a visible search button opens it on touch devices.
  Done when: fully keyboard operable (`Esc` closes, focus restored); usable at 360px via the button.

- [ ] **P11-T6 MCP server**
  Scope: official MCP C# SDK, Streamable HTTP at `/mcp`; read-only tools `get_resume`, `list_projects`, `get_project`, `search_posts`, `get_post` calling the same Application services; public data only, no auth; rate limit `public-api`; flag `Ai.Mcp`.
  Done when: an MCP client (MCP Inspector / Claude Code) lists and calls every tool; integration test per tool.
  Learn: the Model Context Protocol, tools vs resources.

- [ ] **P11-T7 Admin AI assistant**
  Scope: `IChatClient` (Microsoft.Extensions.AI) against an OpenAI-compatible endpoint (AvalAI today; options `Ai:Chat:BaseUrl|ApiKey|Model`, validated when the flag is on, added to `.env.example`); admin-only actions: suggest excerpt + SEO description, suggest tags, draft an English translation into the P6-T8 form (never auto-published); daily token budget guard; provider failure → friendly message, editor keeps working. Flag `Ai.AdminAssistant` (off until Mahdi enables it). ADR-015.
  Done when: tests with a fake `IChatClient`; budget exceeded → actions disabled; no admin AI endpoint reachable without the `Admin` policy.

## Phase 12 — Hardening & polish

- [ ] **P12-T1 Strict CSP with nonces** + security headers audit (securityheaders.com A).
- [ ] **P12-T2 Admin 2FA (TOTP)** with recovery codes.
- [ ] **P12-T3 Dependabot + `dotnet list package --vulnerable` in CI.**
- [ ] **P12-T4 Accessibility audit** (keyboard pass, screen reader smoke test with NVDA, contrast re-check).
- [ ] **P12-T5 Resume print stylesheet** & page polish.
- [ ] **P12-T6 Backup restore drill #2** + documented RPO/RTO.

## Phase 13 — Newsletter (signup only)

- [ ] **P13-T1 Subscriber model**: entity per architecture §4, token hashing, unique email (citext), migration, domain tests.
- [ ] **P13-T2 Signup UI**: `_NewsletterSignup` partial (footer + end of post), `/{culture}/newsletter` page, anti-spam, flag `Newsletter.Signup`; stores as `Pending`; message "confirmation email coming soon" (from resx). Idempotent for existing emails (no enumeration leak).
- [ ] **P13-T3 Admin subscribers**: list, filter by status, CSV export, manual unsubscribe/delete (privacy).
- [ ] **P13-T4 Sending scaffold (disabled)**: `INewsletterSender`, confirmation & unsubscribe pages/handlers implemented but guarded by `Newsletter.Sending` (false → 404/no-op), tests for both flag states.

## Phase 14 — Geo-based default language

> English itself ships from P1-T11 / P2 / P6-T8 / P9-T2 (ADR-016). Only these are left.

- [ ] **P14-T1** GeoIP step in `ILanguageResolver` (GeoLite2 file mounted as volume, refreshed monthly; `IR → fa`, else `en`); only on `/`, never on deep links.
- [ ] **P14-T2** Optional dedicated English font pairing (self-hosted, OFL) — only if Vazirmatn's Latin glyphs look weak on English pages.

## Content track (parallel, writing only)

> No code. Drafts are written by Mahdi (Claude helps with structure and the English versions) and published through
> the admin once P6 exists. Two posts must be ready for the launch (P9-T4).

- [ ] **C-T1 Series ".NET under Iranian constraints"**: outline + first two posts (e.g. build images abroad and pull from GHCR; `docker save | docker load` fallback; NuGet/Docker mirrors; Let's Encrypt on a `.ir` domain).
- [ ] **C-T2 Series "Building this site"**: one post per finished phase, made from the ADRs and `learning.md`.
- [ ] **C-T3 Case-study texts**: gym system (after permission, P5-T8), cinema reservation, microservices platform — Problem · Architecture · Key decisions · Results · What went wrong.
