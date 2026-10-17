# Roadmap

> High-level plan: **what** each phase delivers and **why it's in that order**.
> Step-by-step tasks with acceptance criteria are in `TASKS.md` (task IDs like `P6-T3`).

## Positioning — what the site must prove

> **A C#/.NET backend engineer who builds real systems under hard constraints and engineers AI into them —
> and this site is the proof.**

Every feature is checked against this sentence; a feature that doesn't serve it is cut. A resume + portfolio + blog
alone looks like every other developer site, so the site is built on three pillars plus one story:

| Pillar | Idea | Main pieces |
|---|---|---|
| **1. Show, don't tell** | Backend work is invisible — make it visible | Under-the-hood page + hero status line (P10), case studies with live status (P5), public engineering decisions (P2), concurrency simulation (P10) |
| **2. Readable by machines & AI** | The site is an API, not only HTML | Structured résumé → `curl`, JSON, `llms.txt` (P2/P9), MCP server, semantic search with a local model (P11) |
| **3. Become a reference** | Own a niche nobody covers in Persian | Content track: ".NET under Iranian constraints", "Building this site"; digital-garden growth stages (P6) |
| **Story** | Nobody else has it | "From circuits to cloud": electrical engineering (Guilan, Shahid Beheshti) → backend engineering (P2) |

**Two audiences, two paths:** recruiters/employers (often European → English matters) go Home → Resume /
Decisions; clients go Home → Services / case studies → contact form with request type. No persona toggle (ADR-019).

**Identity:** one public name, **Mahdi Azghandi** (legal name — matches degrees and contracts); "Shahram Azghandi"
is the alternate name (JSON-LD `alternateName`, `shahramazghandi.ir` redirect, one line on About). ADR-017.

## Guiding principles for the order

1. **Walking skeleton first.** Get a trivial page running in Docker *and deployed to the real server* early (Phase 3). Iran-specific hosting problems (image pulls, TLS, firewall) are cheapest to find when the app is tiny.
2. **Foundations before features.** Design tokens, layout, RTL and culture routing are set up before any page, so no page is ever built "Persian-only" or "dark-only".
3. **Bilingual from P2.** English is enabled in P1 (`P1-T11`); from then on every public page ships in `fa` **and** `en`. Writing a page twice while building it is cheaper than translating everything at the end (ADR-016).
4. **Admin before content features.** Blog and Projects need the admin panel, so auth comes first.
5. **Launch first.** Before the MVP launch only *cheap* differentiators are added (decisions page, About story, case-study template, machine-readable résumé). The big ones (under-the-hood telemetry, AI layer) come right after launch. An unlaunched site impresses nobody.
6. **Each phase is shippable.** After every phase `main` builds, tests pass, and the site could be deployed.

## Timeline at a glance

```
MVP ───────────────────────────────────────────────────────────────────────────────►  Launch
P0 Foundation → P1 Design + i18n (fa + en) → P2 Static pages (bilingual) → P3 First deploy → P4 Admin
→ P5 Projects & case studies → P6 Blog → P7 Comments → P8 Contact + Resume PDF → P9 SEO + machine-readable ═══► 🚀

Post-launch ──────────────────────────────────────────────────────────────────────────►
P10 Under the hood + analytics → P11 AI layer → P12 Hardening → P13 Newsletter (flagged) → P14 Geo-language → Backlog

In parallel from now: Content track (writing only, no code) — published through the admin once P6 exists.
```

Rough effort (evenings/weekends pace, learning included): P0–P3 ≈ 2–3 weeks (P2 is ~50% more writing because it is
bilingual), P4–P6 ≈ 3 weeks, P7–P9 ≈ 2 weeks, P10–P11 ≈ 3–4 weeks.

---

## Phase 0 — Foundation & tooling
**Goal:** An empty but *correctly structured* solution that builds, tests and runs in Docker with PostgreSQL.
**Deliverables:** repo hygiene files, 4 src + 2 test projects with correct references, central package management, Dockerfile, compose (dev) with PostgreSQL, EF Core wired with first migration, health endpoint, Serilog, CI build+test.
**Exit criteria:** `docker compose up` → `http://localhost:8080/health` returns `Healthy`; CI green.
**You'll learn:** solution structure, Central Package Management, multi-stage Docker builds, EF Core migrations.

## Phase 1 — Design system, layout & i18n infrastructure
**Goal:** The botanical look & feel and the RTL/LTR culture plumbing every page will reuse.
**Deliverables:** Tailwind v4 standalone pipeline, design tokens (dark default + light), self-hosted fonts, Alpine (CSP build), theme toggle without flash, base layout (header, nav, footer with Email/GitHub/Telegram), SVG motif partials, UI component partials, culture-prefixed routing (`/fa/...`), resx localization, Persian date/number helpers, 404/500 pages, **`en` culture + language switcher** (moved from the old P13).
**Exit criteria:** A style-guide page (`/fa/_styleguide`, dev-only) shows all components in both themes and both directions; `/` redirects to `/fa` (or `/en` for English browsers).
**You'll learn:** Tailwind v4 `@theme`, CSS custom properties, RTL logical properties, ASP.NET Core localization, Razor partials/tag helpers.

## Phase 2 — Static public pages (bilingual)
**Goal:** The pages that don't need a database — each in Persian and English.
**Deliverables:** Home (concrete value proposition, **two audience paths**: hiring / project), About with the **"From circuits to cloud"** timeline, Services, Resume page rendered from a **structured résumé file** (ADR-013; PDF comes in P8), Contact page with links (form comes in P8), **Engineering decisions** page (ADR cards: challenge → decision → why).
**Exit criteria:** All pages render correctly in RTL (`fa`) and LTR (`en`) in both themes, pass Lighthouse accessibility ≥ 90.
**You'll learn:** view localization, page composition with partials, semantic HTML, single source of truth for data rendered many ways.

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

## Phase 5 — Projects, portfolio & case studies
**Goal:** Projects told as case studies (problem → architecture → decisions → results → what went wrong), with a real live-status check for deployed ones.
**Deliverables:** `Project` + `MediaFile` entities, `IFileStorage` (local volume), image upload with validation, admin CRUD with sort order, featured flag and a case-study Markdown template, public list (cards, status badge "Live") and detail page, featured projects on Home, **live status monitor** (🟢/🔴 from a periodic health check of the project's own URL), **gym management system as the flagship case study** (client project — needs the client's written permission; admin panel shown only via screenshots/video with fake data, never linked).
**Exit criteria:** The gym project is on `/fa/projects` and `/en/projects` with a working live link and status badge.
**You'll learn:** first full vertical slice (Domain → Application → Infrastructure → Web), file uploads safely, Result pattern, background services.

## Phase 6 — Blog
**Goal:** Write and publish technical posts from the admin panel — a digital garden, not a polished-only magazine.
**Deliverables:** `Post`, `Tag` entities, Markdig + sanitizer renderer, admin editor with live server-side preview, drafts/publish/archive, **growth stage** per post (🌱 Seedling / 🌿 Budding / 🌳 Evergreen), image upload into posts, public paged list, post page (reading time, TOC, code highlighting, tags), tag pages, output caching with eviction, latest posts on Home, **translations** for posts and projects (moved from the old P13).
**Exit criteria:** A post written in admin appears correctly (RTL text + LTR code blocks), updates instantly after edit, and its English translation is linked by the language switcher.
**You'll learn:** Markdown pipelines, XSS & sanitization, output caching, pagination, bidirectional text.

## Phase 7 — Comments with moderation
**Goal:** Readers can comment; nothing appears publicly until you approve it.
**Deliverables:** `Comment` entity, comment form (name/email/text), honeypot + signed timing token + rate limiting, moderation queue (approve/reject/spam, bulk actions), pending count on dashboard, optional email notification behind flag.
**Exit criteria:** Bot-like submissions are silently dropped; approved comments show; emails never render publicly.
**You'll learn:** anti-spam without CAPTCHA, rate limiting middleware, Data Protection API, moderation workflows.

## Phase 8 — Contact form & resume PDF
**Goal:** Potential clients can reach you; employers can download your resume.
**Deliverables:** `ContactMessage` + form with **request type** (Hiring / Project / Other, preselected by the Home paths), same anti-spam as comments, admin inbox (new/read/archived, filter by type), `IEmailSender` (logging default, SMTP behind flag), resume PDF upload/replace in admin per language, `/{culture}/resume/download` endpoint with proper headers.
**Exit criteria:** Messages land in the admin inbox; the resume download button serves the latest uploaded PDF.
**You'll learn:** feature flags, abstractions for swappable infrastructure, file streaming.

## Phase 9 — SEO & machine-readable → 🚀 MVP launch
**Goal:** Search engines, social previews **and developers' tools** understand the site.
**Deliverables:** `_SeoHead` (title, description, canonical, OpenGraph, Twitter card), JSON-LD (`Person` with `alternateName`, `WebSite`, `BlogPosting`), `sitemap.xml` with language alternates, `robots.txt`, RSS/Atom feed, hreflang for translated pairs, OG image default, performance pass (Lighthouse ≥ 90 on all four categories), **`/api/resume.json`, `curl mahdiazghandi.ir` terminal card, `/llms.txt`** — all from the structured résumé.
**Exit criteria:** Launch checklist in `TASKS.md` fully ticked; real content entered in both languages.
**You'll learn:** technical SEO, structured data, content negotiation, web performance basics.

---

## Post-launch

## Phase 10 — Under the hood & analytics
**Goal:** The site shows its own engineering — honestly measured, nothing faked (ADR-018).
**Deliverables:** Umami (self-hosted) with custom events; in-process request metrics (p50/p95 latency, error rate, cache hit ratio, deploy version/commit/time); `Server-Timing` footer line ("this page: 12 ms · 2 queries"); `/{culture}/under-the-hood` page with live numbers and an architecture diagram; compact **status line in the Home hero**; **cinema double-booking simulation** in that project's case study. Never public: CPU/RAM, container names, package versions.
**You'll learn:** metrics & percentiles, `Server-Timing`, build metadata in CI, observability without a vendor.

## Phase 11 — AI layer
**Goal:** Show *engineered* AI that runs on our own server — not a thin wrapper around someone else's API.
**Rule:** AI is optional (ADR-014). Every feature is behind an `Ai.*` flag; with all flags off the site is complete.
**Deliverables:** local embedding model (ONNX, in-process — no external call), pgvector in the same PostgreSQL, hybrid **semantic search** (vector + full-text with Persian normalization), **related posts**, **Ctrl+K command palette** (with a visible search button for mobile), **MCP server** (read-only tools over résumé, projects, posts), **admin-only AI assistant** via an OpenAI-compatible provider (AvalAI today, ADR-015).
**New dependencies** (pgvector, ONNX Runtime, MCP C# SDK, Microsoft.Extensions.AI) are approved by Mahdi at the start of the task that adds them.
**You'll learn:** embeddings, vector indexes, hybrid search, RAG retrieval, the MCP protocol, provider-agnostic AI abstractions.

## Phase 12 — Hardening & polish
CSP with nonces (strict), security headers audit, admin 2FA (TOTP), dependency scanning (Dependabot), backup restore drill, error monitoring review, image optimization (responsive sizes, WebP), accessibility audit, print stylesheet for resume page.

## Phase 13 — Newsletter (signup only, sending disabled)
`Subscriber` entity with double-opt-in design, signup form (footer + post page) behind `Newsletter.Signup`, admin list + CSV export, `INewsletterSender` + confirmation-email code paths behind `Newsletter.Sending` (off). Enabling later = pick SMTP provider + flip flag.

## Phase 14 — Geo-based default language
English itself ships from P1/P2 (ADR-016). Only the GeoIP step is left: `ILanguageResolver` GeoIP (MaxMind GeoLite2 file, `IR → fa`, else `en`) on `/` only; optional dedicated English font pairing.

## Content track (parallel, no code)
Writing starts now; posts are published through the admin once P6 exists. At least two posts are ready for launch.
- **".NET under Iranian constraints"** — building images abroad and pulling from GHCR, `docker save | docker load`, NuGet/Docker mirrors, Let's Encrypt on a `.ir` domain. Nobody covers this well in Persian.
- **"Building this site"** — one post per finished phase, made from the ADRs and `learning.md`.
- **Case-study texts** — gym system (after client permission), cinema reservation, microservices platform.

## Backlog (unscheduled ideas)
- **Public "Ask about my work" RAG chat** (flag `Ai.Chat`, off). Only when: a provider we can legally and reliably call from the server (e.g. after moving abroad), a hard spending cap, answers only from cited sources (refuse otherwise), kill switch. Risk to keep in mind: a wrong answer about Mahdi shown to an employer.
- Self-hosted "mate in one" chess puzzle in the footer or About (personal touch; no Chess.com widget — external runtime dependency).
- Demo account (reset nightly) for the gym admin panel — only with the client's consent.
- More interactive simulations (gym check-in transaction) once the cinema one has proven its value.
- Series / multi-part posts
- Newsletter sending (enable P13 flag) + scheduled digests
- Migration to international server (runbook in `deploy/README.md`) + CDN in front (Cloudflare/Bunny) if desired
- Webmentions / reactions, dark-mode-aware OG image generation
- Admin: scheduled publishing (`published_at` in future + background service)

## Considered and rejected (don't re-propose without a new reason)
| Idea | Why not | What we do instead |
|---|---|---|
| Recruiter/client **persona toggle** | Visitors don't know which to pick; half the content is hidden; content maintained twice; confuses search engines | Two clear paths on Home + request type on the contact form |
| **CPU/RAM per container** in the hero | Meaningless to clients, useful to attackers | Latency, error rate, deploy info (P10) |
| Showing **Prometheus/Grafana of another project** as this site's telemetry | It isn't this site's data | Real metrics of this site only |
| Hard-coded **"99.98% uptime"** | Can't be measured from inside the server; Iranian network outages make it false | "Up since last deploy" + measured latency |
| **Live Chess.com widget** | Third-party runtime dependency (ADR-007) | Self-hosted puzzle (Backlog) |
| **Typing-speed (WPM) / tool badges** | Shallow, dates quickly | — |
| **Public chatbot via an Iranian AI gateway** | Shaky upstream, privacy, least differentiating feature | Admin-only assistant (ADR-015); public chat stays in Backlog |
