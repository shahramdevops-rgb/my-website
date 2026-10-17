# Coding Rules & Conventions

> Mandatory for every change. "Why" is given briefly; deeper explanations live in `learning.md`.
> If a rule gets in the way, change the rule here (in the same PR) — don't silently break it.

## 1. General

1. **Small, focused changes.** One task from `TASKS.md` per branch/PR. No drive-by refactors.
2. **Build must be green** with `TreatWarningsAsErrors=true`. Never suppress a warning without a comment explaining why.
3. **No secrets in git.** Connection strings, passwords, SMTP credentials → env vars / `.env` (git-ignored). `.env.example` documents every variable with a dummy value.
4. **No external runtime dependencies** (CDNs, Google Fonts, hosted APIs, Iranian-only services). npm/NuGet packages are fine — they are bundled into our images at build time; fonts and other assets live in the repo.
5. **Docs follow code.** A change to structure, data model or a decision updates `architecture.md`; a new concept worth learning gets a short entry in `learning.md`.
6. Code, identifiers, comments, commit messages and docs: **English**. User-facing strings: **`frontend/messages/{fa,en}.json`** (or localized MDX for prose) — never hard-coded in components or C#.
7. **No hard-coded hostnames.** The site domains (`mahdiazghandi.ir` canonical, `shahramazghandi.ir` redirect) and the canonical base URL come from config (`Site__BaseUrl`, `SITE_URL`, `deploy/Caddyfile`, `.env`) — never from C# or TypeScript. See `architecture.md §9.1`.

## 2. C# style

| Rule | Example / note |
|---|---|
| File-scoped namespaces | `namespace PersonalSite.Application.Blog;` |
| Nullable reference types **on**; no `!` suppression without a comment | |
| `var` when the type is obvious from the right side | `var post = new Post(...)` |
| Naming: `PascalCase` types/methods/properties, `camelCase` locals/params, `_camelCase` private fields, `I` prefix interfaces, `Async` suffix on async methods | |
| One public type per file; file name = type name | |
| Primary constructors for DI in services | `public sealed class PostService(IAppDbContext db, TimeProvider time)` |
| Classes `sealed` by default | Unseal only with a reason |
| `record` for DTOs, commands, results | `public sealed record PostSummaryDto(...)` |
| Prefer expression-bodied members only for one-liners | |
| No regions, no commented-out code | Git remembers |
| Guard clauses over nested `if`s | |
| No magic strings: route names, flag names, policy names, cache tags live in `static class` constants | `FeatureFlags.NewsletterSending`, `CacheTags.Post(id)` |

## 3. Async & cancellation

- Async all the way: no `.Result`, `.Wait()`, `async void` (except event handlers — we have none).
- Every I/O method takes a `CancellationToken ct` as the **last** parameter and passes it down. Endpoint handlers take it as a parameter (bound to `RequestAborted`).
- No `ConfigureAwait(false)` in app code (ASP.NET Core has no sync context); fine to omit.

## 4. Architecture rules (enforced by project references)

- **Domain**: entities, enums, value objects, domain rules. No EF attributes, no ASP.NET, no DTOs.
- **Application**: use cases as feature services (`PostAdminService`), DTOs, validators, interfaces for external things. No `HttpContext`, no Razor, no `Npgsql`.
- **Infrastructure**: EF configurations, migrations, implementations of Application interfaces. No business rules.
- **Api**: endpoints are **thin** — bind input, call one service method, map `Result` to an HTTP result (`TypedResults`, ProblemDetails for errors). No LINQ over `DbSet`s in the Api project.
- Dependency direction: `Api → Application → Domain`, `Infrastructure → Application`. Never reverse.
- **frontend** talks to the back-end only over HTTP through the generated client (`src/lib/api/`); it never reads the database or hand-writes API types (ADR-026).

## 5. Domain modelling

- Entities have **private setters** and change state through methods that protect invariants: `post.Publish(time)`, `comment.Approve(time)`.
- Constructors/factory methods enforce required data; no public parameterless constructor (EF uses a private one).
- Enums stored as **strings** in DB (`HasConversion<string>()`) — readable and safe against reordering.
- IDs: `Guid.CreateVersion7()`.
- Timestamps: `DateTimeOffset` in UTC from `TimeProvider.GetUtcNow()`. Never `DateTime.Now`.

## 6. Application layer

- Expected failures (not found, slug taken, validation) return `Result` / `Result<T>` with a typed `Error` (code + resource key). **Exceptions are for bugs and infrastructure failures only.**
- Validate commands with FluentValidation **inside** the service before touching the DB. Validation messages are resource keys, not literal text.
- Read queries: `AsNoTracking()`, project with `Select` to DTOs — never return entities from an endpoint.
- Every list endpoint is **paged** (`PageRequest`, max page size enforced).
- Services that mutate public content call `IFrontendRevalidator` with the affected cache tags (`CacheTags` constants).

## 7. EF Core & database

- Configuration via `IEntityTypeConfiguration<T>` classes, **never** data annotations on domain entities.
- snake_case naming via `UseSnakeCaseNamingConvention()`; don't hand-name columns unless necessary.
- Every string column has a max length (`HasMaxLength`), except Markdown/HTML bodies (`text`).
- Add indexes for every foreign key and every column used in `WHERE`/`ORDER BY` on public pages.
- Migrations: one per task, descriptive name (`AddCommentsTable`), reviewed SQL (`dotnet ef migrations script`) before merge. Never edit a migration that has run in prod — add a new one.
- No lazy loading. Use explicit `Include` or projection.
- No raw SQL string concatenation. `FromSql($"...")` (interpolated → parameterized) only when LINQ can't express it.

## 8. API endpoints

- One static class per feature in `Endpoints/` with a `Map…Endpoints(this IEndpointRouteBuilder)` method; everything under `MapGroup("/api")`.
- Routes lowercase, plural nouns, no trailing slash; language is explicit (`/api/posts/{lang}/{slug}` or `?lang=`), never read from headers.
- Every endpoint declares its responses (`TypedResults`, `.Produces…`) so the OpenAPI document is complete; regenerate `openapi/v1.json` and the TS types in the same PR as any contract change.
- Admin endpoints live in the `/api/admin` group (`RequireAuthorization("Admin")`); public POSTs have a rate-limit policy.
- Errors are ProblemDetails with a stable `code`; the front-end maps codes to messages (no user-facing text from the API, except the plain-text `curl` card and `llms.txt`).

## 9. Front-end (TypeScript / React / Next.js)

- TypeScript `strict` + `noUncheckedIndexedAccess`; no `any` (use `unknown` and narrow); no `!` non-null assertion without a comment.
- **Server Components by default.** `"use client"` only on the smallest leaf that needs the browser (state, effects, pointer, WebGL).
- Data only through `src/lib/api/` (generated types + typed client); cached server fetches carry tags from the shared `cacheTags` constants.
- Files: components `PascalCase.tsx` (one exported component per file), hooks `useThing.ts`, everything else `kebab-case.ts`; routes follow Next.js conventions (`page.tsx`, `layout.tsx`).
- Text only through next-intl (`useTranslations` / `getTranslations`); keys in English dot-notation (`blog.post.commentsTitle`); every key in both `fa.json` and `en.json` (test). Never concatenate translated fragments — use ICU placeholders.
- Dates and numbers only through `src/lib/format/` (Intl-based); never replace digits by hand.
- **RTL-safe CSS only**: logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `border-s`); `ml-`/`mr-`/`left-`/`right-`/`text-left` only for truly physical cases (commented).
- Colors only via design tokens (`bg-surface`, `text-accent`) — no raw hex or default Tailwind palette in markup.
- Every interactive element is keyboard-accessible with a visible focus ring; images have `alt`; decorative SVG has `aria-hidden="true"`. Every signature feature (keyboard, demos, X-Ray) has an accessible equivalent.
- Animations respect `prefers-reduced-motion` (`motion-safe:` variants, Motion's `useReducedMotion`).
- Heavy client code (Three.js, demo apps) is loaded with `next/dynamic` when needed, behind a same-size static placeholder; first paint never waits for it.
- No `dangerouslySetInnerHTML` except for `bodyHtml` produced by the API's sanitizing Markdown renderer. No inline `<script>` except Next's own and our nonce-carrying pre-paint theme script (ADR-025).
- Server-only modules (`env.ts`, API client with secrets) import `server-only`; only `NEXT_PUBLIC_*` values reach the browser, and they are never secrets.

## 10. Security checklist (every PR touching input/output)

- [ ] Input validated (length, format) server-side; client-side validation is only UX.
- [ ] Output encoded; no new `dangerouslySetInnerHTML`.
- [ ] Admin endpoints inside the `/api/admin` group (authorized by convention); the admin UI is never the gate.
- [ ] File uploads: content-type allow-list + magic bytes + size limit + random storage key.
- [ ] Public POST endpoints have a rate-limit policy.
- [ ] No PII (emails, IPs) in logs.

## 11. Localization

- Locales are configured in one place (`frontend/src/lib/i18n/config.ts`): `fa` and `en`. Default `fa` (→ `en` with the international move, ADR-023).
- Routes live under `app/[locale]/`; never hard-code `/fa` in links — use next-intl's `Link`/`redirect` helpers.
- UI strings in `messages/{locale}.json`; long prose in `content/{page}.{locale}.mdx`.
- The API never localizes text; content rows carry a `language` column and endpoints take the language explicitly.

## 12. Testing

- Every Application service method with logic gets tests (happy path + main failure).
- Test name pattern: `Method_State_ExpectedResult` → `Approve_PendingComment_SetsStatusApproved`.
- Arrange/Act/Assert with blank lines between; one behaviour per test.
- Integration tests use Testcontainers PostgreSQL — **no EF InMemory provider**.
- Front-end: Vitest + Testing Library for logic and components (`*.test.ts(x)` next to the file); Playwright e2e in `frontend/e2e/` covers both locales, both themes, 360/1440 px, axe checks and zero CSP violations.
- Bug fix = failing test first, then fix.

## 13. Git & workflow

- Branch: `feat/P6-T3-markdown-preview`, `fix/…`, `chore/…`, `docs/…` (include task ID).
- Commits: Conventional Commits — `feat(blog): add markdown live preview`. Imperative, ≤ 72 chars subject.
- `main` is always deployable. Squash-merge PRs.
- Before marking a task done: `dotnet build`, `dotnet test`, `dotnet format --verify-no-changes`; for front-end changes also `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (in `frontend/`); update the `TASKS.md` checkbox.

## 14. Docker

- API: multi-stage Dockerfile, `sdk` build stage → `aspnet:10.0-noble-chiseled-extra` runtime (has ICU; non-root, port 8080).
- Front-end: multi-stage `frontend/Dockerfile` (Node 24 build → standalone output on a slim Node runtime, non-root, port 3000).
- Pin image tags to a major/minor (`postgres:17-alpine`, `caddy:2`, `node:24-…`), never `latest` in prod.
- Only Caddy publishes host ports in prod (dev also publishes the DB on 5433).
- Persistent data only in named volumes: `pgdata`, `uploads`, `dpkeys`, `caddy_data`.
- Healthchecks on `api`, `frontend` and `db`; `depends_on: condition: service_healthy`.
