# Coding Rules & Conventions

> Mandatory for every change. "Why" is given briefly; deeper explanations live in `learning.md`.
> If a rule gets in the way, change the rule here (in the same PR) — don't silently break it.

## 1. General

1. **Small, focused changes.** One task from `TASKS.md` per branch/PR. No drive-by refactors.
2. **Build must be green** with `TreatWarningsAsErrors=true`. Never suppress a warning without a comment explaining why.
3. **No secrets in git.** Connection strings, passwords, SMTP credentials → env vars / `.env` (git-ignored). `.env.example` documents every variable with a dummy value.
4. **No external runtime dependencies** (CDNs, Google Fonts, hosted APIs, Iranian-only services). Vendor assets into `wwwroot/lib` with the version in the folder name.
5. **Docs follow code.** A change to structure, data model or a decision updates `architecture.md`; a new concept worth learning gets a short entry in `learning.md`.
6. Code, identifiers, comments, commit messages and docs: **English**. User-facing strings: **Persian via resource files** — never hard-coded in `.cshtml`/C#.
7. **No hard-coded hostnames.** The site domains (`mahdiazghandi.ir`, `shahramazghandi.ir`) and the canonical base URL come from config (`SiteOptions.BaseUrl`, `deploy/Caddyfile`, `.env`) — never from C#/Razor. See `architecture.md §9.1`.

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
- Every I/O method takes a `CancellationToken ct` as the **last** parameter and passes it down. Razor Page handlers get it via `HttpContext.RequestAborted` or a handler parameter.
- No `ConfigureAwait(false)` in app code (ASP.NET Core has no sync context); fine to omit.

## 4. Architecture rules (enforced by project references)

- **Domain**: entities, enums, value objects, domain rules. No EF attributes, no ASP.NET, no DTOs.
- **Application**: use cases as feature services (`PostAdminService`), DTOs, validators, interfaces for external things. No `HttpContext`, no Razor, no `Npgsql`.
- **Infrastructure**: EF configurations, migrations, implementations of Application interfaces. No business rules.
- **Web**: page models are **thin** — bind input, call one service method, map `Result` to page response. No LINQ over `DbSet`s in the Web project.
- Dependency direction: `Web → Application → Domain`, `Infrastructure → Application`. Never reverse.

## 5. Domain modelling

- Entities have **private setters** and change state through methods that protect invariants: `post.Publish(time)`, `comment.Approve(time)`.
- Constructors/factory methods enforce required data; no public parameterless constructor (EF uses a private one).
- Enums stored as **strings** in DB (`HasConversion<string>()`) — readable and safe against reordering.
- IDs: `Guid.CreateVersion7()`.
- Timestamps: `DateTimeOffset` in UTC from `TimeProvider.GetUtcNow()`. Never `DateTime.Now`.

## 6. Application layer

- Expected failures (not found, slug taken, validation) return `Result` / `Result<T>` with a typed `Error` (code + resource key). **Exceptions are for bugs and infrastructure failures only.**
- Validate commands with FluentValidation **inside** the service before touching the DB. Validation messages are resource keys, not literal text.
- Read queries: `AsNoTracking()`, project with `Select` to DTOs — never return entities to the Web layer.
- Every list endpoint is **paged** (`PageRequest`, max page size enforced).
- Services that mutate public content evict the relevant output-cache tags.

## 7. EF Core & database

- Configuration via `IEntityTypeConfiguration<T>` classes, **never** data annotations on domain entities.
- snake_case naming via `UseSnakeCaseNamingConvention()`; don't hand-name columns unless necessary.
- Every string column has a max length (`HasMaxLength`), except Markdown/HTML bodies (`text`).
- Add indexes for every foreign key and every column used in `WHERE`/`ORDER BY` on public pages.
- Migrations: one per task, descriptive name (`AddCommentsTable`), reviewed SQL (`dotnet ef migrations script`) before merge. Never edit a migration that has run in prod — add a new one.
- No lazy loading. Use explicit `Include` or projection.
- No raw SQL string concatenation. `FromSql($"...")` (interpolated → parameterized) only when LINQ can't express it.

## 8. Razor Pages & UI

- Every page has a `PageModel`; logic stays out of `.cshtml`.
- Use tag helpers (`asp-page`, `asp-for`, `asp-append-version`) — never hand-built URLs.
- All text through `IViewLocalizer` / `IStringLocalizer<SharedResource>`; keys in English dot-notation: `Blog.Post.CommentsTitle`.
- Forms: antiforgery is on by default — do not disable. POST-Redirect-GET after successful submissions.
- **RTL-safe CSS only**: use logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `border-s`). `ml-`/`mr-`/`left-`/`right-`/`text-left` are forbidden except for truly physical cases (commented).
- Colors only via design tokens (`bg-surface`, `text-primary`) — no raw hex or default Tailwind palette in markup.
- Every interactive element is keyboard-accessible with a visible focus ring; images have `alt`; decorative SVG motifs have `aria-hidden="true"`.
- Animations only inside `motion-safe:` variants / `prefers-reduced-motion: no-preference`.
- Alpine: register components in `wwwroot/js/components/*.js` with `Alpine.data()`; markup uses names only (CSP build). No inline `<script>` without the CSP nonce.
- User-generated text (comments, names) is **always** HTML-encoded (Razor default). Never `@Html.Raw` except for `BodyHtml` produced by the sanitizing Markdown renderer.

## 9. Security checklist (every PR touching input/output)

- [ ] Input validated (length, format) server-side; client-side validation is only UX.
- [ ] Output encoded; no new `Html.Raw`.
- [ ] Admin endpoints under `Areas/Admin` (authorized by convention) or explicitly `RequireAuthorization("Admin")`.
- [ ] File uploads: content-type allow-list + magic bytes + size limit + random storage key.
- [ ] Public POST endpoints have a rate-limit policy.
- [ ] No PII (emails, IPs) in logs.

## 10. Localization

- Supported cultures are configured in one place (`LocalizationOptions` in `appsettings.json`), currently `["fa"]`.
- Resource file per scope: `SharedResource.fa.resx` for shared UI; `Pages/X.fa.resx` only for page-specific long strings.
- Dates via the `<persian-date>` tag helper / `DateDisplay` helper (culture-aware). Numbers via culture formatting; Persian digits are produced by culture, not by string replacement in views.
- Never concatenate translated fragments; use format strings with placeholders: `"{0} دقیقه مطالعه"`.

## 11. Testing

- Every Application service method with logic gets tests (happy path + main failure).
- Test name pattern: `Method_State_ExpectedResult` → `Approve_PendingComment_SetsStatusApproved`.
- Arrange/Act/Assert with blank lines between; one behaviour per test.
- Integration tests use Testcontainers PostgreSQL — **no EF InMemory provider**.
- Bug fix = failing test first, then fix.

## 12. Git & workflow

- Branch: `feat/P6-T3-markdown-preview`, `fix/…`, `chore/…`, `docs/…` (include task ID).
- Commits: Conventional Commits — `feat(blog): add markdown live preview`. Imperative, ≤ 72 chars subject.
- `main` is always deployable. Squash-merge PRs.
- Before marking a task done: build, tests, `dotnet format --verify-no-changes`, update `TASKS.md` checkbox.

## 13. Docker

- Multi-stage Dockerfile: `sdk` build stage → `aspnet:10.0-noble-chiseled-extra` runtime (has ICU; runs as non-root).
- Pin image tags to a major/minor (`postgres:17-alpine`, `caddy:2`), never `latest` in prod.
- Container listens on `8080`; only Caddy publishes host ports in prod.
- Persistent data only in named volumes: `pgdata`, `uploads`, `dpkeys`, `caddy_data`.
- Healthchecks on `web` and `db`; `depends_on: condition: service_healthy`.
