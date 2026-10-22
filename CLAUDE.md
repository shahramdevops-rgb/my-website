# CLAUDE.md — Project guide for Claude

Read this file first in every session. It gives you the project context, how to work, the key rules and the
architecture decisions in short form, and where the full details live.

---

## 1. Project in one paragraph

Personal website of **Mahdi Azghandi** (Mahdi; also known as Shahram — `alternateName` only, ADR-017), a
**full-stack engineer: C#/.NET back-end + React/TypeScript front-end** (ADR-022). It combines an online resume, a
portfolio with **live demos** on real sandbox APIs, a technical blog with moderated comments, a services page to
attract freelance clients, a contact form and a newsletter signup (sending disabled). Audience: employers (often
European), potential clients, blog readers. Content is **Persian (RTL) and English (LTR)** from the first page.
It is also a **learning project**: Mahdi is learning React/Next.js while building it and wants to understand *why*
each technical decision is made. Target: launch in ≈ 6 months (≈ April 2027).

**Architecture (ADR-021):** two apps behind **one origin** — a **Next.js 16 front-end** (`frontend/`, React 19,
TypeScript) and an **ASP.NET Core 10 API** (`src/PersonalSite.Api`). Caddy routes `/api/*` (and a few machine
endpoints) to the API and everything else to Next.js. Phase 1 built a Razor Pages front-end; it is retired (P2-T1).

**Positioning (filter for every feature):** *a full-stack engineer who builds real systems under hard constraints
and engineers AI into them — and this site is the proof.* Pillars: **show, don't tell** (Bento home, keyboard hero,
live demos, X-Ray mode, honest telemetry), **readable by machines & AI** (structured résumé, `curl`, OpenAPI, MCP,
local-model search), **become a reference** (Persian content on .NET under Iranian constraints). Every showpiece must
reveal something real about the back-end. Details and rejected ideas: `roadmap.md`.

## 2. Current status

- **Done:** P0 — Foundation (solution, Docker, EF Core + PostgreSQL, tests, CI on GitHub `shahramdevops-rgb/my-website`).
  P1 — Razor front-end (T1–T8) — **retired** on 2026-10-18 by the full-stack decision (ADR-021…027); P1-T9…T11 cancelled.
- **Done in P2:** `P2-T1` (`PersonalSite.Web` → `PersonalSite.Api`; Razor UI, Tailwind CLI, Alpine, resx removed; fonts moved to `frontend/src/fonts/`).
  `P2-T2` (build-time `openapi/v1.json`, CI stale check; `GET /api/site`; FeatureManagement with all §10 flags).
  `P2-T3` (`frontend/` scaffold: Next 16.4, React 19.3, TS 6.0, pnpm 10, ESLint 9 + Prettier, Vitest, Playwright; CI `frontend` job).
  `P2-T4` (`pnpm gen:api` → `src/lib/api/schema.d.ts`, server/browser `openapi-fetch` clients, `src/lib/env.ts`
  checked at start by `instrumentation-node.ts` (exit 1), home page shows the name from `/api/site`; e2e uses `e2e/mock-api.ts`).
  `P2-T5` (`frontend/Dockerfile`, compose `caddy` + `frontend`, `deploy/Caddyfile.dev`, dev `/api` rewrite on :3000).
  `P2-T6` (next-intl without its middleware: `app/[locale]` + `dynamicParams = false`, `messages/{fa,en}.json` + parity
  test, `proxy.ts` 302 for `/` (cookie `lang` → Accept-Language → fa), `src/lib/format/` on Intl with P1's vectors).
  `P2-T7` (`proxy.ts` nonce CSP per page view + `nosniff`/`Referrer-Policy`/`Permissions-Policy` from
  `src/lib/security/headers.ts`; every page dynamic via `connection()` in the `[locale]` layout; `e2e/csp.spec.ts`;
  e2e now runs in CI).
  `P2-T8` (Tailwind v4 via `@tailwindcss/postcss`; tokens in `src/styles/globals.css` + Vitest contrast test; fonts via
  `next/font/local` in `src/lib/fonts.ts`; `HtmlDocument` shell; pre-paint `ThemeScript` with the nonce from `x-nonce`;
  `ThemeToggle` (`aria-pressed`) on the placeholder home until P2-T9's header; `e2e/theme.spec.ts`).
  `P2-T9` (`[locale]` layout: skip link, `SiteHeader` + `MobileMenu`, `LanguageSwitcher` = plain `<a>` + `lang` cookie +
  cross-document View Transitions, `SiteFooter`; `[locale]/[...rest]` + `not-found.tsx` + `error.tsx`; `proxy.ts`
  rewrites unknown languages to a localized 404; `e2e/layout.spec.ts`).
  `P2-T10` (`src/components/ui/`: Button/ButtonLink, Card, BentoGrid + BentoCard with cursor spotlight, Tag, Badge,
  SectionHeader, FormField, Alert; dev-only `/{locale}/_styleguide` (folder `%5Fstyleguide`, 404 in production)).
- **Done in P3:** `P3-T1` (`Content/resume.{fa,en}.json` → `ResumeProfile` records, strict JSON + `ResumeContentValidator`
  on `ValidateOnStart`, fa/en must state the same facts; `GET /api/resume?lang=fa|en` via `LanguageParameter`; TS types regenerated).
  `P3-T2` (Home Bento in `src/components/bento/`: hero with résumé headline + pitch + status-line slot, keyboard slot
  listing `techStack`, two audience paths, "In progress" cards for projects/demo/posts; `getResume` in `src/lib/resume/`;
  `e2e/home.spec.ts`; Lighthouse a11y 100 on fa/en mobile + desktop).
  `P3-T3` (keyboard hero in `src/components/keyboard/`: CSS poster first, lazy R3F + drei scene after hydration when
  WebGL + no reduced motion, button list + glass card as the accessible equivalent, real keys by `event.code` scoped
  to pointer-over/focus-within; keycaps from `src/lib/keyboard/keycaps.ts`; `e2e/keyboard.spec.ts`).
  `P3-T4` (`/{locale}/about`: `@next/mdx` + `src/mdx-components.tsx`; prose in `frontend/content/about.{fa,en}.mdx`
  (`@content/*` alias; pages pass components in, no imports in MDX; Prettier skips `*.mdx`); `Timeline` + `Skills`
  from the résumé, `Bridge` cards, `PhotoSlot` placeholder; `src/lib/content/content.test.ts` = fa/en structure parity).
- **Next task:** `P3-T5` (Services page).
- **Accent color:** electric blue (`#4DB5FF` dark / `#0A63C9` light), picked by Claude at Mahdi's request; easy to change (`architecture.md §8.1`).
- **Waiting on Mahdi:** contact links (`Site:Social:Email|GitHub|Telegram`); optional display face (P2-T8 left it out);
  real résumé facts — every `[placeholder]` and `2000-01` date in `src/PersonalSite.Api/Content/resume.*.json`;
  About story — the `[placeholder]` sentence and a review of the drafted text in `frontend/content/about.*.mdx`; a photo.
- **Code today:** an API-only ASP.NET Core app (`/health`, `/health/ready`, `GET /api/site`, `GET /api/resume?lang=`; unknown paths → 404
  ProblemDetails; CSP `default-src 'none'`). Every build rewrites `openapi/v1.json` — commit it with contract changes.
  `frontend/` serves `/fa` and `/en` (header/footer shell + the Bento home from `/api/site` and `/api/resume`; nav
  and path links to pages not built yet are 404 until their phase); fonts in `src/fonts/`. Contract change = `dotnet build` (→ `openapi/v1.json`) + `pnpm gen:api`, both committed.
  P1's ideas that carry over: `architecture.md §8.4`.
- **Dev DB** is published on host port **5433** (Mahdi has another project's PostgreSQL on 5432). For `dotnet watch`
  on the host, the connection string lives in **user-secrets** (`ConnectionStrings:Default`); in Docker, compose builds it from `.env`.
- **Tooling note:** locally (VS Code extension) Claude can use `dotnet`, `node` and reach nuget.org/npm; in
  cloud sandboxes it may not — then Mahdi runs those commands. pnpm isn't on PATH until Mahdi runs `corepack enable`
  (needs an admin shell on Windows); until then use `corepack pnpm <cmd>` from `frontend/`.
- **Front-end versions held back on purpose:** TypeScript 6.0 (typescript-eslint supports `<6.1`, not TS 7) and
  ESLint 9 (eslint-plugin-react/import/jsx-a11y don't support ESLint 10 yet). Revisit when their peer ranges allow.
  Next 16 ships its own docs in `frontend/node_modules/next/dist/docs/` — check them for exact-version APIs.
- **Tests** run on Microsoft.Testing.Platform (`global.json` → `test.runner`); `dotnet test` from the repo root
  (Docker must be running: integration tests start PostgreSQL via Testcontainers). Front-end: `pnpm test`, `pnpm e2e` (from P2-T3).
- Keep this section updated: after finishing a task, set "Next task" to the next unchecked item.

## 3. Communication with Mahdi

- **Every reply is written in English, as a briefing for another AI tutor** (Mahdi's rule since 2026-10-21). Mahdi
  writes in Persian, but he pastes Claude's replies into a separate AI that explains them to him in depth. So each
  reply must: (1) open with one line addressed to that AI — *"For the tutor AI: this is for Mahdi's learning — expand
  on it educationally and explain the reasoning behind each decision below. Keep English technical terms in English;
  if a term needs a translation, add it in parentheses."*; (2) state concisely what was done,
  what was decided and why (facts, file paths, commands, results, open questions); (3) contain no Persian translation
  and no long tutorial prose — the tutor AI does the explaining. Questions Mahdi must answer go in the same reply;
  (4) end with one closing line to that AI — *"For the tutor AI: write your answer in Persian, formatted right-to-left
  (right-aligned)."* (added 2026-10-23).
- **Everything in the repo is English**: code, identifiers, comments, commit messages, docs.
- **Site content (UI text) is Persian and English**, stored in `frontend/messages/{fa,en}.json` or localized MDX —
  never hard-coded. Claude drafts English text; Mahdi edits it.
- Mahdi is learning (React/TypeScript especially): explain *why*, briefly. Prefer one clear reason over a list of five.
- Ask before decisions that are hard to reverse (data model, URLs, public behaviour, new dependencies).
- **Design direction is Mahdi's call.** Offer ideas and a recommendation; don't change the look without his choice.

## 4. Document map

| File | Use it for |
|---|---|
| `architecture.md` | System overview, both apps' structure, data model, request flows, routing, ADR decision log |
| `rules.md` | Mandatory coding conventions and checklists (C#, API, TypeScript/React) |
| `roadmap.md` | Positioning, phases and their order/rationale |
| `TASKS.md` | Small executable tasks with acceptance criteria (IDs like `P7-T3`) |
| `learning.md` | Plain-language explanations of concepts & decisions (for Mahdi) |
| `README.md` | How to run/build/deploy |

## 5. Scope — what the site contains

| # | Feature | Notes | Phase |
|---|---|---|---|
| 1 | Home | **Bento grid** with cursor spotlight, **3D keyboard hero**, two paths (hiring / project), featured projects, demo card, latest posts; status line later | P3 (+ wiring P6/P7/P11) |
| 2 | About | "From circuits to cloud" story (EE → software), localized MDX | P3 |
| 3 | Projects / portfolio | DB + admin CRUD; case studies; live status; **gym system is the flagship (client permission given)** | P6 |
| 4 | Live demos | Cinema seat picking with a real simultaneous-purchase race; gym check-in + lockers; sandbox data (ADR-027) | P6 |
| 5 | Blog | Markdown written in the **admin panel**; tags, paging, growth stages, translations | P7 |
| 6 | Comments | Name + email + text; **Pending until Mahdi approves**; honeypot + timing token + rate limit | P8 |
| 7 | Contact form | Name, email, message, **request type** → DB + admin inbox; email notify behind flag | P9 |
| 8 | Resume page + PDF | Rendered from **structured résumé JSON** (ADR-013); PDF uploaded from admin | P3 + P9 |
| 9 | Contact links | Email, GitHub, Telegram only (**no LinkedIn, no phone** for now) | P2 |
| 10 | Newsletter | Model + signup UI; **sending disabled** behind `Newsletter.Sending` | P14 |
| – | Services page | Freelance services, CTA to contact | P3 |
| – | Engineering decisions page | ADR cards: challenge → decision → why | P3 |
| – | Admin panel | Next.js UI; ASP.NET Identity in the API; single admin, no registration | P5 |
| – | Machine-readable résumé | `/api/resume.json`, `curl` card, `llms.txt` | P10 |
| – | Under the hood | **X-Ray mode**, scrollytelling request journey, honest live metrics, Umami | P11 |
| – | AI layer | Local-model semantic search, related posts, Ctrl+K, MCP server, admin-only assistant | P12 |
| – | International move | Foreign server, `.com`, English-first, GeoIP | P15 |

**Out of scope for now:** public user accounts, LinkedIn/phone, payments, newsletter sending, public AI chat (backlog).

## 6. Stack (short)

**Front-end:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · pnpm · Tailwind v4 · next-intl · Motion ·
React Three Fiber · openapi-typescript + openapi-fetch · Vitest + Testing Library · Playwright (+ axe).
**Back-end:** ASP.NET Core 10 (LTS) Minimal APIs · OpenAPI · light Clean Architecture (Domain / Application /
Infrastructure / Api) · PostgreSQL 17 + EF Core 10 (snake_case) · ASP.NET Identity (cookie, single admin) ·
Markdig + HtmlSanitizer · FluentValidation · Microsoft.FeatureManagement · Serilog · xUnit v3 + Shouldly +
NSubstitute + Testcontainers.
**Ops:** Docker Compose (frontend, api, db, caddy) · Caddy · Umami · GitHub Actions → GHCR (two images).
Planned for P12 (approve per task): Microsoft.Extensions.AI · ONNX Runtime · pgvector · MCP C# SDK.

## 7. Architecture decisions (summary — full ADRs in `architecture.md §11`)

| ADR | Decision | One-line reason |
|---|---|---|
| 001 | ~~Razor Pages~~ → superseded by 021 | — |
| 002 | Light Clean Architecture, 4 .NET projects | Compiler-enforced layering, no CQRS ceremony |
| 003 | No MediatR / AutoMapper / FluentAssertions | Commercial licences + hidden indirection |
| 004 | `IAppDbContext` instead of repositories | DbContext already is repo + unit of work |
| 005 | Markdown in DB, rendered HTML cached | Admin-editable, fast reads, one render path |
| 006 | Locale-prefixed URLs (`/fa/...`, `/en/...`) | Unambiguous, SEO-friendly (hreflang) |
| 007 | Self-host every runtime asset | Works under filtering, strict CSP, privacy |
| 008 | ~~Tailwind standalone CLI~~ → superseded by 021 | — |
| 009 | One PostgreSQL, separate DB for Umami, `demo` schema for demos | One thing to back up |
| 010 | Moderated comments, no third-party service / CAPTCHA | reCAPTCHA unreliable in Iran; privacy |
| 011 | Newsletter behind feature flags | Ship model/UI now, send later without migration |
| 012 | About/Services prose in localized MDX | Rarely changes; no admin UI needed |
| 013 | Structured résumé JSON per culture, many renderings | Page, JSON, `curl`, `llms.txt`, keyboard, MCP never disagree |
| 014 | AI optional and local-first, behind `Ai.*` flags | Works on our own server; shows engineered AI |
| 015 | Admin-only AI assistant via AvalAI (exception to §9) | No public abuse surface; provider swap = config |
| 016 | Bilingual from the first page | European employers; cheaper than translating later |
| 017 | One public name: Mahdi Azghandi (Shahram = alternateName) | Matches legal documents |
| 018 | Honest public telemetry (also X-Ray, scrollytelling) | No faked numbers, no generic stack |
| 019 | Two audience paths, no persona toggle | Nothing hidden, one version of each page |
| 020 | ~~CSP by hash~~ → superseded by 025 | — |
| 021 | **Next.js front-end + ASP.NET Core API, one origin** | Real full-stack shape; cookie auth without CORS |
| 022 | **Positioning: full-stack (.NET + React/TS)** | Sell both halves; showpieces reveal the back-end |
| 023 | **Now Iran (`.ir`, fa-first) → later abroad (`.com`, en-first)** | Move = config + runbook |
| 024 | **Design: dark Bento grid, single accent, strong type** | Botanical retired; accent = electric blue |
| 025 | **CSP nonce per request; data cached, HTML dynamic** | Next.js inline scripts vary per page |
| 026 | **Typed API contract from OpenAPI** | Contract drift breaks the build, not production |
| 027 | **Live demos on real endpoints with sandbox data** | Show the back-end working, not a video |

**Layering:** `frontend ─HTTP→ Api → Application → Domain`; `Infrastructure → Application`. Endpoints are thin and
call Application services only — never `AppDbContext`. The front-end uses only the generated API client.

**Repo:** `src/PersonalSite.{Domain,Application,Infrastructure,Api}`, `tests/PersonalSite.{UnitTests,IntegrationTests}`,
`frontend/` (Next.js), `openapi/v1.json` (generated contract).

## 8. Coding rules (essentials — full list in `rules.md`)

**C#:** `TreatWarningsAsErrors`, nullable on, file-scoped namespaces, `sealed` by default, `record` DTOs · async all
the way with `CancellationToken ct` last · entities with private setters and state-changing methods, enums as
strings, IDs `Guid.CreateVersion7()` · expected failures → `Result<T>`, errors as ProblemDetails · reads
`AsNoTracking()` + `Select`, every list paged · EF config via `IEntityTypeConfiguration<T>`, one migration per task ·
`TimeProvider`, UTC in DB · no magic strings (flags, policies, cache tags, routes in constants).
**TypeScript/React:** `strict`, no `any` · Server Components by default, `"use client"` only on leaves · data only via
the generated client · text only via next-intl (both `fa.json` and `en.json`) · dates/numbers via `src/lib/format/` ·
**RTL-safe CSS** (logical utilities only), colors only via tokens · reduced motion respected · heavy parts lazy-loaded
behind a same-size placeholder · no `dangerouslySetInnerHTML` except sanitized `bodyHtml`.
**Tests:** `Method_State_ExpectedResult` (.NET); integration tests on real PostgreSQL (Testcontainers), never EF
InMemory; Vitest + Playwright for the front-end.
**Git:** branch `feat/P7-T3-short-name`; Conventional Commits.

## 9. Non-negotiables

- **No external runtime dependencies**: no CDNs, Google Fonts, reCAPTCHA, hosted comment/email/analytics/AI APIs, or
  Iran-specific services at runtime (build-time npm/NuGet packages are fine). Only exception: the admin-only AI
  assistant (ADR-015) — public features never depend on it.
- **Honest telemetry & demos**: never show a number the site doesn't measure or a stack it doesn't run; never expose
  CPU/RAM, container names or package versions publicly (ADR-018). Demos run on real endpoints with sandbox data (ADR-027).
- **Dark theme is the default**; everything must look right in both themes.
- Public forms: honeypot + signed timing token + rate limit. Comments are `Pending` until approved.
- Don't enable anything behind a feature flag unless Mahdi asks.
- Secrets never in git. New config → `.env.example` + an Options class with `ValidateOnStart` (API) or `src/lib/env.ts` (front-end).
- Every admin endpoint requires the `Admin` policy; the admin UI is never the security gate.

## 10. Names to reuse (don't invent variants)

| Kind | Names |
|---|---|
| Feature flags | `Newsletter.Signup` (on), `Newsletter.Sending` (off), `Notifications.Email` (off), `Comments.Enabled` (on), `Analytics.Umami` (on in prod), `Ai.SemanticSearch`, `Ai.Mcp` (on once built), `Ai.AdminAssistant` (off), `Ai.Chat` (off, backlog) |
| Auth policy | `Admin` |
| Rate-limit policies | `public-forms`, `login`, `public-api` (JSON/MCP/search/curl/demos) |
| Cache tags | `blog`, `post:{id}`, `projects`, `project:{id}` |
| Locales | `fa` (default now), `en` |
| Compose services | `frontend`, `api`, `db`, `caddy` (+ `umami` in P11) |
| Public name | `Mahdi Azghandi` (fa: `مهدی ازقندی`); alternate `Shahram Azghandi` (JSON-LD only + one About line) |
| Volumes | `pgdata`, `uploads`, `dpkeys`, `caddy_data` |
| Domains | now `mahdiazghandi.ir` (canonical), `shahramazghandi.ir` (301 → canonical); later a `.com` (ADR-023) |

## 11. How to execute a task

When Mahdi says **"Do task Px-Ty"** (or «تسک Px-Ty رو انجام بده»):

1. Read the task in `TASKS.md`, then the relevant sections of `architecture.md` and `rules.md`.
2. If the task is ambiguous or conflicts with the docs, **ask before coding**. Don't silently expand scope.
3. Check dependencies (e.g. `P6-T4` needs `P7-T1`). If a prerequisite is missing, say so.
4. Implement the smallest change that satisfies **Done when**.
5. Add/adjust tests. Run `dotnet build`, `dotnet test`, `dotnet format --verify-no-changes`; for front-end changes
   also `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` in `frontend/`.
6. Update docs: tick the task in `TASKS.md` (`[x]`), update §2 *Current status* here, and `architecture.md` if structure/model/decisions changed.
7. **Teach:** end your reply with a short *"What we did & why"* section (3–8 bullets, in English, terse — the tutor AI expands it; see §3).
   If a concept is new and important, add a short entry to `learning.md` (in English, with a tiny example).
8. Suggest a Conventional Commit message. Commit only if asked.

### Definition of Done
Build green · tests green · lint/format clean · works in dark **and** light · works in `fa` (RTL) **and** `en` (LTR)
at 360px and 1440px · no new hard-coded UI strings (every key in both message files) · OpenAPI + TS types regenerated
if the contract changed · docs updated · task ticked.

## 12. Environment facts

- Mahdi develops on **Windows** (repo at `C:\Users\shahram\source\repos\my-website`). Give PowerShell commands first,
  bash when relevant (server is Linux).
- Production (for now): an **Iranian VPS** (Linux, Docker). Docker Hub/NuGet/npm/GitHub can be slow or blocked from
  there → both images are built in GitHub Actions and pulled from GHCR (fallback: `docker save/load`). Never assume
  the server can `dotnet restore` or `pnpm install`.
- **Domains (purchased, `.ir`):** **`mahdiazghandi.ir` is canonical.** `shahramazghandi.ir` and all `www.` variants
  301-redirect to it. Domain names live only in config (`Site__BaseUrl`, `SITE_URL`, Caddyfile, env) — never in code.
  Details: `architecture.md §9.1`.
- **Later (ADR-023):** when foreign clients are the target, move to a foreign server with a `.com` domain,
  English-first. All state in volumes + env config, nothing host-specific in code. Speed of the Iranian network is
  not a design constraint for this site.

## 13. Design direction (ADR-024)

**Dark Bento grid**: near-black background, hairline-bordered cards, a soft **cursor spotlight** on the cards,
**one accent color** (electric blue, §8.1), large confident Persian/English typography (Vazirmatn + JetBrains Mono,
optional display face). Signature features (`architecture.md §8.2`): Bento + spotlight, **3D mechanical keyboard
hero** (keys = tech stack → projects), **live demos**, **X-Ray mode** (UI peels back to real code + this request's
queries/timings), **fluid fa ↔ en** switch (View Transitions), **scrollytelling request journey** with the real
stack. Motion is calm and always respects `prefers-reduced-motion`; every showpiece has an accessible equivalent.
Accessibility: WCAG AA contrast, keyboard navigable, visible focus. The botanical direction of P1 is retired.

## 14. Useful commands

```powershell
docker compose up -d db                       # start PostgreSQL only
dotnet watch --project src/PersonalSite.Api   # API with hot reload (http://localhost:5080)
dotnet ef migrations add <Name> -p src/PersonalSite.Infrastructure -s src/PersonalSite.Api
dotnet test
docker compose up --build                     # full stack in containers

# front-end (from P2-T3), in frontend/
pnpm install
pnpm dev                                      # http://localhost:3000 (proxies /api to the API in dev)
pnpm lint; pnpm typecheck; pnpm test; pnpm build
pnpm gen:api                                  # regenerate TS types from openapi/v1.json (from P2-T4)
```

## 15. When unsure

Prefer the simpler option that keeps the i18n and server-migration goals intact, explain the trade-off in 2–3
sentences, and ask Mahdi if the choice is hard to reverse.
