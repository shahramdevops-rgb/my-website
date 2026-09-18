# Roadmap

> High-level plan: **what** each phase delivers and **why it's in that order**.
> Step-by-step tasks with acceptance criteria are in `TASKS.md` (task IDs like `P6-T3`).

## Guiding principles for the order

1. **Walking skeleton first.** Get a trivial page running in Docker *and deployed to the real server* early (Phase 3). Iran-specific hosting problems (image pulls, TLS, firewall) are cheapest to find when the app is tiny.
2. **Foundations before features.** Design tokens, layout, RTL and culture routing are set up before any page, so no page is ever built "Persian-only" or "dark-only".
3. **Admin before content features.** Blog and Projects need the admin panel, so auth comes first.
4. **Each phase is shippable.** After every phase `main` builds, tests pass, and the site could be deployed.

## Timeline at a glance

```
MVP ───────────────────────────────────────────────────────────────►  Launch  ─── Post-launch ──────────────►
P0 Foundation → P1 Design+i18n → P2 Static pages → P3 First deploy → P4 Admin → P5 Projects
→ P6 Blog → P7 Comments → P8 Contact+Resume → P9 SEO  ═══► 🚀 MVP launch
                                                          → P10 Analytics → P11 Newsletter (flagged)
                                                          → P12 Hardening → P13 English + geo-language → Backlog
```

Rough effort (evenings/weekends pace, learning included): P0–P3 ≈ 2 weeks, P4–P6 ≈ 3 weeks, P7–P9 ≈ 2 weeks.

---

## Phase 0 — Foundation & tooling
**Goal:** An empty but *correctly structured* solution that builds, tests and runs in Docker with PostgreSQL.
**Deliverables:** repo hygiene files, 4 src + 2 test projects with correct references, central package management, Dockerfile, compose (dev) with PostgreSQL, EF Core wired with first migration, health endpoint, Serilog, CI build+test.
**Exit criteria:** `docker compose up` → `http://localhost:8080/health` returns `Healthy`; CI green.
**You'll learn:** solution structure, Central Package Management, multi-stage Docker builds, EF Core migrations.

## Phase 1 — Design system, layout & i18n infrastructure
**Goal:** The botanical look & feel and the RTL/culture plumbing every page will reuse.
**Deliverables:** Tailwind v4 standalone pipeline, design tokens (dark default + light), self-hosted fonts, Alpine (CSP build), theme toggle without flash, base layout (header, nav, footer with Email/GitHub/Telegram), SVG motif partials, UI component partials, culture-prefixed routing (`/fa/...`), resx localization, Persian date/number helpers, 404/500 pages.
**Exit criteria:** A style-guide page (`/fa/_styleguide`, dev-only) shows all components in both themes; `/` redirects to `/fa`.
**You'll learn:** Tailwind v4 `@theme`, CSS custom properties, RTL logical properties, ASP.NET Core localization, Razor partials/tag helpers.

## Phase 2 — Static public pages
**Goal:** The pages that don't need a database.
**Deliverables:** Home (hero + intro + sections with placeholder data), About, Services, Resume page (content only; PDF comes in P8), Contact page with links (form comes in P8), all with localized prose views.
**Exit criteria:** All pages render correctly RTL in both themes, pass Lighthouse accessibility ≥ 90.
**You'll learn:** view localization, page composition with partials, semantic HTML.

## Phase 3 — First deployment (walking skeleton)
**Goal:** The current site running on the Iranian server over HTTPS (IP or temporary hostname), deployed by a repeatable script.
**Deliverables:** `compose.prod.yaml`, Caddyfile, GitHub Actions release workflow (build image → GHCR), `deploy.sh`, server setup notes, DB backup script + cron, Data Protection keys volume, forwarded headers.
**Exit criteria:** One command deploys a new version; a backup file is produced nightly and a restore has been tested once.
**You'll learn:** reverse proxies, TLS, container registries, zero-surprise deployments, backups.

## Phase 4 — Admin panel & authentication
**Goal:** A private, secure admin area only you can enter.
**Deliverables:** ASP.NET Identity with `AppUser`, admin seeded from env vars, registration disabled, login/logout, lockout, `Admin` policy applied to the whole Area, admin layout (sidebar, flash messages), dashboard with counts.
**Exit criteria:** `/admin` redirects to login; wrong password 5× locks out; integration tests cover both.
**You'll learn:** cookie authentication, Identity, authorization policies & conventions, antiforgery.

## Phase 5 — Projects / portfolio
**Goal:** Showcase projects, including your live deployed project with its link.
**Deliverables:** `Project` + `MediaFile` entities, `IFileStorage` (local volume), image upload with validation, admin CRUD with sort order & featured flag, public list (cards, status badge "Live") and detail page, featured projects on Home.
**Exit criteria:** You can add your live project from the admin and see it on `/fa/projects` and Home.
**You'll learn:** first full vertical slice (Domain → Application → Infrastructure → Web), file uploads safely, Result pattern.

## Phase 6 — Blog
**Goal:** Write and publish technical posts from the admin panel.
**Deliverables:** `Post`, `Tag` entities, Markdig + sanitizer renderer, admin editor with live server-side preview, drafts/publish/archive, image upload into posts, public paged list, post page (reading time, TOC, code highlighting, tags), tag pages, output caching with eviction, latest posts on Home.
**Exit criteria:** A post written in admin appears correctly (RTL text + LTR code blocks) and updates instantly after edit.
**You'll learn:** Markdown pipelines, XSS & sanitization, output caching, pagination, bidirectional text.

## Phase 7 — Comments with moderation
**Goal:** Readers can comment; nothing appears publicly until you approve it.
**Deliverables:** `Comment` entity, comment form (name/email/text), honeypot + signed timing token + rate limiting, moderation queue (approve/reject/spam, bulk actions), pending count on dashboard, optional email notification behind flag.
**Exit criteria:** Bot-like submissions are silently dropped; approved comments show; emails never render publicly.
**You'll learn:** anti-spam without CAPTCHA, rate limiting middleware, Data Protection API, moderation workflows.

## Phase 8 — Contact form & resume PDF
**Goal:** Potential clients can reach you; employers can download your resume.
**Deliverables:** `ContactMessage` + form (same anti-spam as comments), admin inbox (new/read/archived), `IEmailSender` (logging default, SMTP behind flag), resume PDF upload/replace in admin, `/fa/resume/download` endpoint with proper headers.
**Exit criteria:** Messages land in the admin inbox; the resume download button serves the latest uploaded PDF.
**You'll learn:** feature flags, abstractions for swappable infrastructure, file streaming.

## Phase 9 — SEO essentials → 🚀 MVP launch
**Goal:** Search engines and social previews understand the site.
**Deliverables:** `_SeoHead` (title, description, canonical, OpenGraph, Twitter card), JSON-LD (`Person`, `WebSite`, `BlogPosting`), `sitemap.xml`, `robots.txt`, RSS/Atom feed, hreflang scaffolding, OG image default, performance pass (Lighthouse ≥ 90 on all four categories).
**Exit criteria:** Launch checklist in `TASKS.md` fully ticked; real content entered.
**You'll learn:** technical SEO, structured data, web performance basics.

---

## Post-launch

## Phase 10 — Analytics (Umami, self-hosted)
Umami container + its own DB/user, Caddy route, tracking script (proxied from own domain, loaded only when flag on), custom events (resume download, contact submit, project live-link click), privacy note on the site.

## Phase 11 — Newsletter (signup only, sending disabled)
`Subscriber` entity with double-opt-in design, signup form (footer + post page) behind `Newsletter.Signup`, admin list + CSV export, `INewsletterSender` + confirmation-email code paths behind `Newsletter.Sending` (off). Enabling later = pick SMTP provider + flip flag.

## Phase 12 — Hardening & polish
CSP with nonces (strict), security headers audit, admin 2FA (TOTP), dependency scanning (Dependabot), backup restore drill, error monitoring review, image optimization (responsive sizes, WebP), accessibility audit, print stylesheet for resume page.

## Phase 13 — English & geo-based default language
`SharedResource.en.resx`, `en` in supported cultures, English prose views, admin "add translation" action (creates row in same `translation_group`), language switcher, hreflang emitted, `ILanguageResolver` GeoIP step (MaxMind GeoLite2 file, `IR → fa`, else `en`), English font pairing, LTR check.
**Designed-in from P1, so no big refactor:** culture routes, resx, `language` columns, logical CSS.

## Backlog (unscheduled ideas)
- Full-text search for blog (PostgreSQL `tsvector`; note Persian needs a simple config + normalization)
- Series / multi-part posts, "related posts"
- Newsletter sending (enable P11 flag) + scheduled digests
- Migration to international server (runbook in `deploy/README.md`) + CDN in front (Cloudflare/Bunny) if desired
- Webmentions / reactions, dark-mode-aware OG image generation
- Admin: scheduled publishing (`published_at` in future + background service)
