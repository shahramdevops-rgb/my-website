# Roadmap

> High-level plan: **what** each phase delivers and **why it's in that order**.
> Step-by-step tasks with acceptance criteria are in `TASKS.md` (task IDs like `P7-T3`).
> **Revised 2026-10-18:** full-stack positioning and a Next.js front-end + ASP.NET Core API (ADR-021…027).

## Positioning — what the site must prove

> **A full-stack engineer — C#/.NET on the back-end, React/TypeScript on the front-end — who builds real systems
> under hard constraints and engineers AI into them, and this site is the proof.** (ADR-022)

Every feature is checked against this sentence; a feature that doesn't serve it is cut. A resume + portfolio + blog
alone looks like every other developer site, so the site is built on three pillars plus one story:

| Pillar | Idea | Main pieces |
|---|---|---|
| **1. Show, don't tell** | Make the work visible and touchable | Bento home with keyboard hero (P3), **live demos on real sandbox APIs** (P6), case studies with live status (P6), engineering decisions (P3), **X-Ray mode** + request scrollytelling + honest metrics (P11) |
| **2. Readable by machines & AI** | The site is an API, not only HTML | Structured résumé → `curl`, JSON, `llms.txt` (P3/P10), typed OpenAPI contract (P2), MCP server, semantic search with a local model (P12) |
| **3. Become a reference** | Own a niche nobody covers in Persian | Content track: ".NET under Iranian constraints", "Building this site (full-stack)"; digital-garden growth stages (P7) |
| **Story** | Nobody else has it | "From circuits to cloud": electrical engineering (Guilan, Shahid Beheshti) → software engineering (P3) |

**Every showpiece reveals the back-end.** The keyboard opens projects, demos hit real endpoints, X-Ray shows the
code and queries behind the UI. A beautiful front-end alone would sell a different person.

**Two audiences, two paths:** recruiters/employers (often European → English matters) go Home → Resume /
Decisions; clients go Home → Services / case studies → contact form with request type. No persona toggle (ADR-019).

**Identity:** one public name, **Mahdi Azghandi**; "Shahram Azghandi" is the alternate name (ADR-017).

**Hosting:** launch on the Iranian VPS with `.ir` domains, Persian by default. When foreign clients become the
target, move abroad with a `.com` domain, English-first (ADR-023, P15).

## Guiding principles for the order

1. **Foundation of the new stack first (P2).** Two apps, one origin, typed contract, i18n, CSP, tokens — set up once
   so no page is built "Persian-only", "dark-only" or with hand-written API types.
2. **Walking skeleton deployed early (P4).** Two images, Caddy routing, TLS on the real server while the app is tiny.
3. **Bilingual from the first page.** Every public page ships in `fa` and `en` (ADR-016).
4. **Admin before content features.** Blog and Projects need the admin panel, so auth comes first.
5. **Launch first.** Signature features that need no extra infrastructure (Bento, keyboard, live demos) come before
   the launch; those that need metrics (X-Ray, scrollytelling, status line) right after. An unlaunched site impresses nobody.
6. **Each phase is shippable.** After every phase `main` builds, tests pass, and the site could be deployed.

## Timeline at a glance

```
Done: P0 Foundation → P1 Razor front-end (retired, ADR-021)

MVP (≈ 6 months, target ≈ April 2027) ──────────────────────────────────────────────►  🚀 Launch
P2 Full-stack foundation → P3 Static pages + Bento + keyboard → P4 First deploy → P5 Admin
→ P6 Projects, case studies & live demos → P7 Blog → P8 Comments → P9 Contact + Resume PDF → P10 SEO + machine-readable ═► 🚀

Post-launch ─────────────────────────────────────────────────────────────────────────►
P11 Under the hood: X-Ray, scrollytelling, metrics, analytics → P12 AI layer → P13 Hardening → P14 Newsletter
→ P15 International move (.com, English-first, GeoIP)

In parallel from now: Content track (writing only) — published through the admin once P7 exists.
```

Rough effort (evenings/weekends pace, learning React/Next.js included): P2 ≈ 4 weeks, P3 ≈ 5 weeks (bilingual
writing + keyboard), P4 ≈ 1 week, P5 ≈ 2 weeks, P6 ≈ 4 weeks (demos), P7 ≈ 3 weeks, P8–P9 ≈ 2 weeks,
P10 ≈ 2 weeks → about 23 weeks.

---

## Phase 0 — Foundation & tooling ✅
Solution with 4 src + 2 test projects, central package management, Docker dev stack with PostgreSQL, EF Core +
first migration, health endpoints, Serilog, test infrastructure (Testcontainers), CI.

## Phase 1 — Razor front-end ✅ (retired)
Tailwind pipeline, tokens, fonts, culture routing, Persian formatting, layout, Alpine + CSP, theme toggle, botanical
motifs — built in Razor Pages, then retired by ADR-021. What carries over is listed in `architecture.md §8.4`.

## Phase 2 — Full-stack foundation
**Goal:** Two applications behind one origin, talking through a typed contract, with i18n, security headers, design
tokens and the layout shell ready for every page.
**Deliverables:** `PersonalSite.Web` → `PersonalSite.Api` (Razor removed), OpenAPI document + generated TS client,
Next.js app (TypeScript strict, pnpm, ESLint/Prettier, Vitest, Playwright), Docker + Caddy dev routing for both apps,
next-intl with `fa` + `en` and the `/` redirect, Persian/English formatters, CSP with nonce, tokens with Mahdi's
accent + contrast test, self-hosted fonts, theme toggle, layout shell (header, footer, language switcher with View
Transitions, error pages), UI kit with Bento card + spotlight and a dev style guide.
**Exit criteria:** `http://localhost:8080/fa` and `/en` serve the Next.js shell, `/api/site` answers through the same
origin; CI runs both apps; style guide shows every component in both themes and both directions.
**You'll learn:** React, TypeScript, Next.js App Router (server vs client components), OpenAPI, reverse proxies, CSP nonces.

## Phase 3 — Static pages, Bento home & keyboard hero (bilingual)
**Goal:** The pages that need no database, each in Persian and English — and the first "wow".
**Deliverables:** Home as a **Bento grid** (value proposition, **two audience paths**, slots for projects/posts/demo/
status), **3D mechanical keyboard hero** (React Three Fiber, lazy, poster fallback, keys → tech cards from the
résumé), About with the **"From circuits to cloud"** timeline, Services, Resume page from the **structured résumé**
served by the API (ADR-013), Contact links, **Engineering decisions** page.
**Exit criteria:** All pages work in `fa` (RTL) and `en` (LTR), both themes, 360–1440 px; Lighthouse a11y ≥ 90.
**You'll learn:** composition with React, MDX, 3D on the web, single source of truth rendered many ways.

## Phase 4 — First deployment (walking skeleton)
**Goal:** The current site on the Iranian server over HTTPS, deployed by one command.
**Deliverables:** `compose.prod.yaml` (frontend + api + db + caddy), production Caddyfile (routing, redirects, TLS),
API production settings (forwarded headers, HSTS, Data Protection volume, `--migrate`), release workflow building
**two images** to GHCR, server setup notes + `deploy.sh`, backups + tested restore.
**Exit criteria:** One command deploys a new version; nightly backup produced; one restore tested.
**You'll learn:** reverse proxies, TLS, container registries, zero-surprise deployments, backups.

## Phase 5 — Admin panel & authentication
**Goal:** A private, secure admin area only you can enter.
**Deliverables:** ASP.NET Identity in the API (seeded admin, no registration, lockout), auth endpoints with same-origin
cookie, `Admin` policy on every `/api/admin/*`, Next.js admin shell (login page, protected layout, sidebar, dashboard
counts).
**Exit criteria:** `/admin` redirects to login; 5 wrong passwords lock out; every admin API endpoint rejects
anonymous calls (test).
**You'll learn:** cookie auth across two apps on one origin, CSRF, authorization policies.

## Phase 6 — Projects, case studies & live demos
**Goal:** Projects told as case studies — and two of them you can *use*.
**Deliverables:** `Project` + `MediaFile`, file storage + image upload, admin CRUD with a case-study template, public
list + detail pages, featured projects on Home, **live status monitor** of deployed projects, **gym system as the
flagship case study** (client permission given), **live demos** on sandbox APIs (ADR-027): **cinema seat picking
with a real simultaneous-purchase race** and **gym check-in + lockers + live capacity chart**.
**Exit criteria:** The gym project is on `/fa/projects` and `/en/projects` with live link, status badge and a working
demo; the cinema race shows exactly one winner every time (test).
**You'll learn:** full vertical slices, uploads, Result pattern, background services, concurrency control in PostgreSQL, real-time UI updates.

## Phase 7 — Blog
**Goal:** Write and publish technical posts from the admin panel — a digital garden.
**Deliverables:** `Post`, `Tag`, Markdig + sanitizer, React editor with live server-side preview, drafts/publish/
archive, growth stages, images in posts, paged list, post page (TOC, server-side code highlighting, copy button),
tag pages, tag revalidation, latest posts on Home, **translations** for posts and projects.
**Exit criteria:** A post written in admin appears correctly (RTL text + LTR code), updates instantly after edit,
and its English translation is linked by the language switcher.
**You'll learn:** Markdown pipelines, XSS & sanitization, cache invalidation across two apps, bidirectional text.

## Phase 8 — Comments with moderation
**Goal:** Readers can comment; nothing appears publicly until you approve it.
**Deliverables:** `Comment`, form with honeypot + signed timing token + rate limit, moderation queue, pending count,
optional email notification behind a flag.
**Exit criteria:** Bot-like submissions are silently dropped; approved comments show; emails never leave the API.

## Phase 9 — Contact form & resume PDF
**Goal:** Clients can reach you; employers can download your resume.
**Deliverables:** `ContactMessage` + form with **request type** (preselected by the Home paths), same anti-spam,
admin inbox, `IEmailSender` (logging default, SMTP behind flag), resume PDF upload per language, download endpoint.
**Exit criteria:** Messages land in the admin inbox; the download button serves the latest PDF.

## Phase 10 — SEO & machine-readable → 🚀 MVP launch
**Goal:** Search engines, social previews **and developers' tools** understand the site.
**Deliverables:** Next.js metadata (title, description, canonical, OG, Twitter, `og:locale`), JSON-LD (`Person` with
`alternateName`, `WebSite`, `BlogPosting`), sitemap with language alternates, robots, Atom feeds, hreflang, OG
images, performance pass, **`/api/resume.json`, `curl mahdiazghandi.ir` card, `/llms.txt`**, launch checklist.
**Exit criteria:** Launch checklist ticked; real content in both languages.

---

## Post-launch

## Phase 11 — Under the hood: X-Ray, scrollytelling, metrics & analytics
**Goal:** The site shows its own engineering — honestly measured, nothing faked (ADR-018).
**Deliverables:** request metrics (p50/p95, error rate, cache hit ratio, build info), per-page timing line, status
API + hero status line, **X-Ray mode** (UI peels back to real code excerpts and this request's queries/timings),
**scrollytelling request journey** on `/{locale}/under-the-hood` with the real stack, Umami with custom events.
**You'll learn:** metrics & percentiles, `Server-Timing`, build metadata, scroll-driven animation.

## Phase 12 — AI layer
**Goal:** *Engineered* AI that runs on our own server. Optional (ADR-014): every feature behind an `Ai.*` flag.
**Deliverables:** local embedding model (ONNX, in-process), pgvector, hybrid **semantic search**, **related posts**,
**Ctrl+K command palette** (React), **MCP server** (read-only), **admin-only AI assistant** (ADR-015).
New dependencies are approved by Mahdi at the start of the task that adds them.

## Phase 13 — Hardening & polish
CSP audit, admin 2FA (TOTP), Dependabot (NuGet + npm), accessibility audit, resume print stylesheet, backup restore drill #2.

## Phase 14 — Newsletter (signup only, sending disabled)
`Subscriber` with double-opt-in design, signup UI behind `Newsletter.Signup`, admin list + CSV export, sending
scaffold behind `Newsletter.Sending` (off).

## Phase 15 — International move
Foreign server, `.com` domain (canonical, English-first: `/` → `en`), decision on the `.ir` domains (301 or Persian
mirror), migration runbook executed (volumes + `pg_dump` + DNS), GeoIP language step on `/`, optional English display
font, AI provider review (ADR-015) and public chat reconsidered (Backlog).

## Content track (parallel, no code)
Writing starts now; posts are published through the admin once P7 exists. At least two posts are ready for launch.
- **".NET under Iranian constraints"** — building images abroad and pulling from GHCR, `docker save | docker load`,
  mirrors, Let's Encrypt on a `.ir` domain.
- **"Building this site"** — one post per finished phase (now a full-stack story: Next.js + .NET on one origin).
- **Case-study texts** — gym system, cinema reservation, microservices platform.

## Backlog (unscheduled ideas)
- **Public "Ask about my work" RAG chat** (flag `Ai.Chat`, off) — only after the international move, with a hard
  spending cap, cited answers only and a kill switch.
- Typing mini-game on the keyboard hero ("type `dotnet run` to enter").
- Self-hosted "mate in one" chess puzzle (no third-party widget).
- Live GitHub activity card (fetched and cached by the API, never by the browser).
- Series / multi-part posts; scheduled publishing; Webmentions.
- Newsletter sending (enable P14 flag).

## Considered and rejected (don't re-propose without a new reason)
| Idea | Why not | What we do instead |
|---|---|---|
| **Razor Pages + React islands** | Mahdi wants the standard full-stack split to sell React/TS (ADR-021) | Next.js front-end + ASP.NET Core API |
| **Botanical design** (P1) | Mahdi didn't like it (ADR-024) | Dark Bento grid, single accent |
| Recruiter/client **persona toggle** | Hides half the content, doubles maintenance, confuses search engines | Two paths on Home + request type on the contact form |
| **CPU/RAM per container** in the hero | Meaningless to clients, useful to attackers | Latency, error rate, deploy info (P11) |
| Generic stack in demos/scrollytelling (**Nginx, JWT, Grafana**) | Not this site's stack — a technical reader notices | The real path: Caddy, cookie auth, our own metrics (ADR-018) |
| Hard-coded **"99.98% uptime"** | Can't be measured from inside the server | "Up since last deploy" + measured latency |
| **Live Chess.com widget** | Third-party runtime dependency (ADR-007) | Self-hosted puzzle (Backlog) |
| **Typing-speed (WPM) / tool badges** | Shallow, dates quickly | Keyboard hero that leads to real projects |
| **Public chatbot via an Iranian AI gateway** | Shaky upstream, privacy | Admin-only assistant (ADR-015); public chat in Backlog |
