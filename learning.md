# Learning Notes

> Plain-language explanations of the concepts and decisions in this project.
> Each entry: **What it is → Why we use it here → Tiny example**. New entries are added as tasks introduce new ideas (see `CLAUDE.md` §4 step 7).

---

## Part 1 — Architecture

### 1.1 Clean Architecture (light version)
**What:** Split the code into layers where inner layers know nothing about outer ones. Our layers: *Domain* (business rules) → *Application* (use cases) → *Infrastructure* (DB, files, email) and *Web* (UI).
**Why:** You can change the database or UI without touching business rules, and the compiler stops you from mixing them (a Domain class *can't* reference EF Core because the project reference doesn't exist).
**Why "light":** Full Clean Architecture often adds CQRS, MediatR, one class per use case, repositories… For a personal site that's ceremony without benefit. We keep the layering, drop the ceremony.
```
Web ──► Application ──► Domain        Infrastructure ──► Application
```

### 1.2 Why `IAppDbContext` instead of repositories
EF Core's `DbContext` already *is* a Repository (`DbSet<Post>`) and a Unit of Work (`SaveChangesAsync`). Wrapping it in `IPostRepository` usually produces pass-through code that hides useful EF features. We expose an interface with the `DbSet`s so Application can be tested and doesn't depend on the concrete class. Trade-off: Application references EF Core. Accepted on purpose (ADR-004).

### 1.3 Rich domain entities (private setters)
**What:** An entity changes itself only through methods that check rules.
```csharp
public void Approve(DateTimeOffset now)
{
    if (Status == CommentStatus.Approved) return;
    Status = CommentStatus.Approved;
    ModeratedAt = now;
}
```
**Why:** You can't accidentally create an invalid state like "published post without a publish date" from a page model somewhere.

### 1.4 Result pattern vs exceptions
**What:** Services return `Result<T>` (success value *or* an error) for *expected* failures like "slug already taken".
**Why:** Exceptions are slow and invisible in method signatures; a `Result` forces the caller to handle failure. Exceptions stay for real bugs (null reference, DB down).
```csharp
var result = await posts.CreateAsync(cmd, ct);
if (result.IsFailure) { ModelState.AddModelError("", L[result.Error.Key]); return Page(); }
```

### 1.5 Why no MediatR / AutoMapper / FluentAssertions
All three moved to commercial licences for new versions in 2025. Beyond licensing: MediatR adds indirection (you can't "Go to definition" from a page to its logic) and AutoMapper hides mapping bugs until runtime. Hand-written `Select(p => new PostDto(...))` is explicit and lets EF generate efficient SQL.

---

## Part 2 — ASP.NET Core

### 2.1 Razor Pages vs MVC
Razor Pages = one page file + its `PageModel` (handlers `OnGet`, `OnPost`). MVC = controllers + actions + views in separate folders. For a content site where each URL is a page, Razor Pages keeps related code together. Both run on the same engine; you can mix them.

### 2.2 Why server-side rendering is good for SEO
The server sends complete HTML. Search engines and Telegram/Twitter link previews read it immediately — no JavaScript needed. SPAs (React etc.) need extra work (SSR) to get the same result.

### 2.3 The middleware pipeline
Each request passes through middleware in the order you add them in `Program.cs`. **Order matters**: e.g. `UseForwardedHeaders` must run before anything that reads the scheme/IP; `UseAuthentication` before `UseAuthorization`; `UseRequestLocalization` before pages render.

### 2.4 Options pattern
Bind a config section to a class and validate it at startup, so a missing setting crashes *at boot*, not at 3 AM when the code path first runs.
```csharp
services.AddOptions<SiteOptions>().BindConfiguration("Site").ValidateDataAnnotations().ValidateOnStart();
```

### 2.5 Configuration & environment variables
`appsettings.json` → `appsettings.Production.json` → environment variables (later wins). In Docker you set `ConnectionStrings__Default=...` — double underscore = nested key. Secrets live only in env vars / `.env`, never in git.
When the app runs on your machine (not in Docker), local secrets go in **user-secrets** (`dotnet user-secrets set ...`): a JSON file in your user profile, loaded only in Development, so it can never be committed.

### 2.6 `TimeProvider` instead of `DateTime.Now`
`DateTime.Now` is server-local and untestable. `TimeProvider` (built into .NET 8+) can be faked in tests (`FakeTimeProvider`) — e.g. to test "comment submitted 2 seconds after page load".

### 2.7 Output caching & invalidation
The server stores the rendered HTML of a page and serves it again without hitting the DB. The hard part is *invalidation*: we tag cached pages (`post:{id}`) and evict the tag when the admin edits that post. "There are only two hard things in computer science: cache invalidation and naming things."

### 2.8 Data Protection keys
ASP.NET encrypts auth cookies and our anti-spam tokens with keys. By default in a container they live in memory → every restart creates new keys → you're logged out and pending form tokens fail. We persist keys to a Docker volume.

### 2.9 Reverse proxy & forwarded headers
Caddy receives HTTPS and forwards plain HTTP to the app. Without `ForwardedHeaders` the app thinks every request is `http://` from Caddy's IP — breaking redirects, secure cookies and rate limiting by IP.

### 2.10 Structured logging (Serilog) & health checks
A plain log line is just text; a **structured** log keeps the values as fields:
```csharp
logger.LogInformation("Post {PostId} published", post.Id);
// Production output: {"@mt":"Post {PostId} published","PostId":"0192…","@t":"2026-…"}
```
Now you can query "all events for PostId X" instead of grepping. Rules: use message templates (never string
interpolation), never log PII (emails), and keep logs culture-invariant — the site runs in `fa`, but Persian digits
in logs break searching (analyzer CA1305 reminds you).
`/health` is a **liveness** check (is the process alive?) with no dependencies — if it checked the DB, a DB outage
would make Docker restart a perfectly fine web container. `/health/ready` (**readiness**) checks the DB.

---

## Part 3 — Data

### 3.1 EF Core migrations
A migration is C# code describing a schema change (`CREATE TABLE comments…`). `dotnet ef migrations add X` generates it by comparing your model to the last snapshot. Rules: review the SQL, never edit a migration that has already run in production — add a new one.

### 3.2 Why auto-migrate only in development
Running migrations at app startup in prod is risky: two containers could migrate at once, and a failed migration leaves the app down mid-deploy. In prod, the deploy script runs migrations as an explicit step *before* starting the new version.

### 3.3 snake_case in PostgreSQL
PostgreSQL folds unquoted names to lowercase, so `PublishedAt` would need quotes in every hand-written SQL. `published_at` is the Postgres convention; the naming-convention package converts automatically.

### 3.4 UUID v7 primary keys
Random GUIDs (v4) scatter inserts across the index → slow. UUID v7 starts with a timestamp → inserts are ordered like an auto-increment, but IDs are still unguessable and can be generated in code before saving. `Guid.CreateVersion7()` is built into .NET 9+.

### 3.5 `AsNoTracking` and projections
By default EF tracks every loaded entity for change detection — wasted work for read-only pages. `AsNoTracking()` skips it; `Select(...)` into a DTO fetches only the needed columns.

### 3.6 Why Testcontainers, not EF InMemory
The InMemory provider isn't a real database: no unique constraints, different string comparison, no SQL. Tests pass, prod fails. Testcontainers starts a real PostgreSQL in Docker for the test run.

### 3.7 Storing enums as strings
`status = 'Published'` is readable in the DB and doesn't break if someone reorders the enum (which silently changes integer values).

### 3.8 DbContext lifetime (scoped)
A `DbContext` remembers every entity it loaded (change tracking) and is **not thread-safe**. So it is registered as
*scoped*: one instance per HTTP request, disposed when the request ends. Singleton would share one tracker across all
users (wrong data, crashes); transient would give two services in the same request two separate units of work.
Outside a request (e.g. migrating at startup) there is no scope, so you create one:
```csharp
await using var scope = services.CreateAsyncScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
```
Our `AuditInterceptor` is a singleton (it holds no per-request state) and stamps `CreatedAt`/`UpdatedAt` on every
save, so services never have to remember to.

---

## Part 4 — Front-end

### 4.1 Tailwind CSS (utility-first)
Instead of writing `.card { padding: 1rem; … }` you compose small classes in markup: `class="p-4 rounded-2xl bg-surface"`. Tailwind scans your `.cshtml` files and generates only the classes you used → tiny CSS. v4 defines design tokens directly in CSS with `@theme`.

### 4.2 Standalone CLI — no Node.js
Tailwind ships a single executable. We run it from MSBuild/Docker, so a .NET developer doesn't need `npm` for the main app.

### 4.3 Design tokens & CSS variables
Colors are named by *role* (`--color-surface`, `--color-primary`), not by value. Dark/light themes just redefine the variables under `[data-theme="light"]`. Components never change.

In Tailwind v4, every variable in `@theme` becomes a utility that *reads the variable at runtime*:

```css
@theme { --color-surface: #12211a; }                      /* dark (default) */
:root[data-theme="light"] { --color-surface: #fffdf7; }    /* light override */
```

`class="bg-surface"` compiles to `background-color: var(--color-surface)`, so flipping `data-theme` on `<html>`
re-colors the whole page — no `dark:` classes on every element. `dark:`/`light:` variants still exist for the rare
case where a theme needs a *different* rule, not just a different color.

### 4.3.1 Contrast ratio (WCAG AA)
Contrast = (lighter luminance + 0.05) / (darker luminance + 0.05), from 1:1 to 21:1. Normal text needs ≥ 4.5:1,
UI parts like focus rings ≥ 3:1. Example: light-theme `#2F7A4B` on `#ECE6D6` = 4.21 (fails), `#2C7246` = 4.68
(passes) — almost the same green to the eye. `ColorContrastTests` computes this for every token pair, so the rule
is checked by the build, not by memory.

### 4.3.2 Why the build target has a stamp file
MSBuild skips a target when its outputs are newer than its inputs. Switching Debug → Release changes no source
file, so Tailwind would not re-run and Release would keep unminified CSS. The CLI arguments are written to
`obj/tailwind.args` only when they change; listing that file as an input makes the switch trigger a rebuild.

### 4.3.3 Web fonts: `font-display: swap` and preload
A web font arrives *after* the CSS that mentions it. `font-display: swap` shows the text immediately in a fallback
font (Tahoma) and swaps when Vazirmatn is ready — no invisible text. `<link rel="preload" as="font" crossorigin>`
starts the download together with the CSS instead of after it. Its URL must be *byte-identical* to the
`@font-face` URL, otherwise the browser treats them as two files:

```html
<link rel="preload" href="/fonts/vazirmatn-33.003/Vazirmatn-Variable.woff2" as="font" type="font/woff2" crossorigin />
```

(`~/fonts/...` would be rewritten by `WithStaticAssets()` to `Vazirmatn-Variable.<hash>.woff2` — a different URL.)

### 4.4 Dark mode without flash (FOUC)
If the theme is applied by JavaScript *after* the page renders, you see a white flash. A tiny inline script in `<head>` reads `localStorage` and sets `data-theme` before the first paint.

### 4.5 RTL & logical properties
`margin-left` is wrong in RTL. Logical properties use *start/end*: `ms-4` (margin-inline-start) is left in English and right in Persian. Using only these means English support later needs zero CSS changes.

### 4.6 Bidirectional text
A Persian paragraph containing `ASP.NET Core 10` or code can scramble word order. We set `dir="auto"` on paragraphs and force left-to-right on code: in CSS, `code, pre { direction: ltr; unicode-bidi: isolate; }` — `isolate` makes the code a sealed box the surrounding RTL text cannot reorder (same effect as `dir="ltr"`, but it also applies to Markdown output we don't write by hand).

### 4.7 Alpine.js and the CSP build
Alpine adds small interactivity (`x-data`, `x-on:click`) without a build step. The normal build evaluates attribute strings with `new Function` which a strict Content-Security-Policy blocks. The CSP build doesn't — so we register components in JS files with `Alpine.data('themeToggle', …)` and reference them by name.

### 4.8 Why self-host fonts and scripts
CDNs and Google Fonts can be slow or blocked in Iran, leak visitor data to third parties, and complicate CSP. Files in `wwwroot` always work and move with the app.

---

## Part 5 — Security

### 5.1 XSS and Markdown sanitization
XSS = an attacker makes your site run their JavaScript in visitors' browsers. Markdown can contain raw HTML (`<script>`), so: (1) Markdig with HTML disabled, then (2) HtmlSanitizer with an allow-list. Two layers = *defense in depth*. Comments aren't Markdown at all — plain text, always encoded.

### 5.2 Antiforgery (CSRF)
A malicious site could make your logged-in browser POST to `/admin/posts/delete`. Razor Pages adds a hidden token to every form and rejects POSTs without it. Never disable it.

### 5.3 Anti-spam without CAPTCHA
- **Honeypot:** a hidden field humans never see; bots fill every field → reject.
- **Time trap:** a signed timestamp in the form; submitted in under 3 s → a bot.
- **Rate limiting:** max N submissions per IP per window.
Rejected bots get the same "thanks" message, so they can't learn what failed. reCAPTCHA is avoided because Google services are unreliable in Iran and it tracks users.

### 5.4 File upload safety
Never trust the file name or `Content-Type` header — both are attacker-controlled. Check the first bytes ("magic numbers": PDF starts with `%PDF`), limit size, and store under a random name.

### 5.5 Open redirect
`/admin/login?returnUrl=https://evil.com` must not send users to evil.com after login. Only accept local URLs (`Url.IsLocalUrl`).

### 5.6 Hashing IPs
We need IPs for abuse detection but storing raw IPs is personal data. `SHA-256(ip + secret salt)` lets us compare "same sender?" without keeping the IP.

---

## Part 6 — Internationalization (i18n)

### 6.1 Resource files (.resx)
UI strings live in `SharedResource.fa.resx` keyed by English IDs (`Nav.Blog` → «بلاگ»). Adding English = adding `SharedResource.en.resx`. Code never contains Persian literals.

### 6.2 Culture in the URL (`/fa/blog`)
Each language gets its own URL → search engines index both, caches don't mix languages, links are shareable. The alternative (same URL, language from cookie) confuses Google and caches.

### 6.3 Content translations
Posts have a `language` column and a `translation_group` ID. The English version is a new row in the same group — no schema change. That group powers `hreflang` tags telling Google "these pages are translations of each other".

### 6.4 Geo-based default language (future)
Only the root `/` decides where to send you: your saved choice (cookie) → country from a local GeoIP database file (`IR → fa`) → browser language → `fa`. Deep links are never redirected — if someone shares `/fa/blog/x`, it stays Persian.

### 6.5 Persian calendar & ICU
.NET uses the ICU library for culture data; the `fa-IR` culture formats dates in the Persian (Solar Hijri) calendar. Minimal Docker images may lack ICU → dates silently become Gregorian/invariant. That's why we use the `-extra` runtime image.

### 6.6 Latin slugs
`/fa/blog/مقدمه-ای-بر-efcore` becomes `%D9%85%D9%82…` when copied into Telegram — long and ugly. Latin slugs (`/fa/blog/intro-to-efcore`) stay readable everywhere.

---

## Part 7 — DevOps

### 7.1 Docker image vs container vs volume
*Image* = a read-only template (your built app). *Container* = a running instance of it. *Volume* = storage that survives container replacement (DB data, uploads, keys). Rule: anything you'd cry about losing goes in a volume.

### 7.2 Multi-stage Dockerfile
Stage 1 uses the big SDK image to build; stage 2 copies only the output into a small runtime image. Result: smaller, safer images (no compilers in production). Our runtime image is **chiseled** (~240 MB total): no shell,
no package manager, no curl, non-root user. Less software = less to attack. The catch: a healthcheck can't call `curl`,
so the app probes itself: `HEALTHCHECK CMD ["dotnet", "PersonalSite.Web.dll", "--healthcheck"]`.
Copying the `.csproj` files and running `dotnet restore` *before* copying the code keeps the restore layer cached.

### 7.3 Docker Compose files
`compose.yaml` holds shared definitions; `compose.override.yaml` is auto-loaded for dev (ports, hot settings); prod explicitly adds `compose.prod.yaml`. Same services, different environment tweaks.

### 7.4 Why build images outside Iran
Docker Hub, NuGet and some GitHub downloads can be blocked or throttled from Iranian IPs. GitHub Actions builds the image abroad and pushes it to GHCR; the server only pulls a finished image. Fallback: `docker save` locally and `docker load` on the server over SSH.

### 7.5 Designing for server migration
Everything that makes the site "this site" is in: git (code), env vars (config), volumes (DB, uploads, keys). Moving = new server + copy `.env` + restore backup + change DNS. No code changes.

### 7.6 Feature flags
A config switch (`Newsletter.Sending: false`) that turns code paths on/off without redeploying code. Lets us ship the newsletter model and UI now and enable sending later.

### 7.7 Backups: RPO & RTO
*RPO* = how much data you can lose (nightly backup → up to 24 h). *RTO* = how long recovery takes. A backup you've never restored is only a hope — hence the restore drill tasks.

### 7.8 Self-hosted analytics (Umami)
Umami counts visits without cookies or personal data, runs in our own container, and doesn't depend on Google Analytics (which may be blocked and requires cookie banners).

### 7.9 Microsoft.Testing.Platform (MTP)
The old test runner (VSTest) loaded test DLLs into a separate host process. With MTP, every test project is a small executable that runs its own tests, so you can even start it directly (`dotnet run --project tests/PersonalSite.UnitTests`). xUnit v3 is built on MTP, and on the .NET 10 SDK `dotnet test` must be told to use it:
```json
// global.json
"test": { "runner": "Microsoft.Testing.Platform" }
```
Result: no `Microsoft.NET.Test.Sdk` or `xunit.runner.visualstudio` packages needed. One gotcha: MTP fails a run with exit code 8 when a project has *zero* tests, which catches mis-configured projects that silently discover nothing.

### 7.10 Unit vs integration tests (and `WebApplicationFactory`)
A *unit test* checks one class with its dependencies faked (NSubstitute) — milliseconds, no Docker. An *integration test* runs real pieces together: `WebApplicationFactory<Program>` boots the whole app in memory (no network port) and hands you an `HttpClient`; Testcontainers gives it a real PostgreSQL (see 3.6).
```csharp
public sealed class HealthEndpointsTests(WebAppFactory factory)   // shared once per assembly
{
    [Fact]
    public async Task GetHealth_AppRunning_ReturnsOk()
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync(new Uri("/health", UriKind.Relative), TestContext.Current.CancellationToken);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}
```
Rule of thumb: logic → unit test; "does it work with the real DB / pipeline / routing?" → integration test. The app runs in a `Testing` environment, so it behaves like production (no user-secrets, no dev exception page).

### 7.11 Continuous Integration (CI)
CI = a clean machine re-checks every push: restore → build → format check → tests. "Works on my machine" stops being enough; `main` stays green because a broken commit is visible within a minute. Our workflow (`.github/workflows/ci.yml`) runs the same commands you run locally, so a failure in CI can always be reproduced on Windows:
```powershell
dotnet build -c Release; dotnet format --verify-no-changes; dotnet test -c Release
```
Two small habits in the file: `permissions: contents: read` (least privilege for the token) and `concurrency` (a newer push cancels the older run).
