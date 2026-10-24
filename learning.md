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
Since P4-T2: `appsettings.Production.json` sets `DataProtection:KeysDirectory` to `/app/data/dp-keys` (the `dpkeys`
volume) and the app name is fixed (`SetApplicationName("PersonalSite")`), because the default name is the content-root
path — move the app and you silently get a new key ring. Proof it works: the first container writes one
`key-<guid>.xml`; a recreated container reads it and creates none. On Linux the file is stored unencrypted (the log says
"No XML encryptor configured" once); the volume is the protection boundary.

### 2.9 Reverse proxy & forwarded headers
Caddy receives HTTPS and forwards plain HTTP to the app. Without `ForwardedHeaders` the app thinks every request is `http://` from Caddy's IP — breaking redirects, secure cookies and rate limiting by IP.
But the headers are just text any client can send, so the app believes them only from addresses it trusts:
```
request from 172.30.0.3 (Caddy, inside ReverseProxy:TrustedNetworks)  X-Forwarded-Proto: https  → Scheme = https
request from 192.0.2.10 (anyone else)                                  X-Forwarded-Proto: https  → ignored, stays http
```
compose.prod.yaml pins the stack's network to `172.30.0.0/24` so that "trusted" has a fixed value (P4-T2). HSTS
(`Strict-Transport-Security`) is only sent on HTTPS requests — so it is also the test that the forwarded scheme was
believed (`ForwardedHeadersTests`). In production Caddy also sets HSTS on every response, because pages come from Next.js, not the API.

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

### 2.11 Localization: culture from the URL, text from resx
Each request gets a *culture* (`CultureInfo`), which decides language, number/date formats and text direction.
`RequestLocalization` middleware sets it; *request culture providers* say where it comes from. We use only the
**route** provider, so `/fa/blog` is Persian no matter what the browser prefers — one URL = one language, which is
what search engines and shared links need. The browser preference is used once, to pick where `/` redirects.

UI text lives in `.resx` files, one per language, compiled into *satellite assemblies* (`bin/.../fa/PersonalSite.Web.resources.dll`):

```cshtml
<p>@T["Home.ComingSoon"]</p>   @* → به‌زودی… in /fa, later "Coming soon…" in /en *@
```

If a key is missing, the localizer prints the key itself (`Home.ComingSoon`) — visible, never a crash.

### 2.12 Why every language gets a URL prefix (even the only one)
If Persian lived at `/blog` and English at `/en/blog`, adding English would mean the "real" URLs are inconsistent
and the default language could never change. With `/fa/blog` from day one, English is just another prefix;
no existing link changes (ADR-006).

### 2.13 HTML encoding of non-Latin text
Razor encodes output to prevent XSS. By default its encoder only trusts Basic Latin, so `م` becomes `&#x645;` —
correct in the browser but ~6× bigger. We allow all Unicode ranges; `<`, `>`, `&` and quotes are still always
encoded, so safety is unchanged.

### 2.14 An API-only ASP.NET Core app (P2-T1)
When the HTML moved to Next.js, the .NET app lost everything that only exists for pages: Razor, static files, view localization, antiforgery for forms, the HTML encoder settings (2.1, 2.11–2.13 describe that retired setup). What an API still needs is small:
```csharp
services.AddProblemDetails();        // one JSON error format for every failure
app.UseExceptionHandler();           // unhandled exception → 500 ProblemDetails (no stack trace)
app.UseStatusCodePages();            // empty 404/405 → ProblemDetails body too
// CSP "default-src 'none'": a JSON response never needs to load anything
```
Why ProblemDetails (RFC 9457): the front-end gets the same shape — `{"type","title","status",…}` — for "not found", "validation failed" and "server error", so one piece of client code can handle them all.

### 2.15 OpenAPI: a code-first contract (P2-T2)
OpenAPI is a JSON description of an HTTP API: every path, its parameters, and the exact shape of each response. **Code-first** means we never write that JSON by hand — ASP.NET Core reads it off the endpoints:
```csharp
// Ok<SiteInfoDto> in the signature → "200 returns a SiteInfoDto" in the document, with its schema.
static async Task<Ok<SiteInfoDto>> GetSiteAsync(SiteInfoService site, CancellationToken ct) =>
    TypedResults.Ok(await site.GetAsync(ct));
```
`Microsoft.Extensions.ApiDescription.Server` runs the app once after each build and writes `openapi/v1.json`. The file is committed, so a contract change shows up as a diff in the PR, and CI rebuilds it and fails if it differs from the committed one. In P2-T4 the front-end turns the same file into TypeScript types: rename a C# property and `pnpm typecheck` fails — the mistake is caught in the build, not by a visitor. (Why `TypedResults` and not `Results`: `Results.Ok(x)` returns `IResult`, which says nothing about the type, so the document would have no schema.)

### 2.16 Single source of truth: the structured résumé (P3-T1)
The résumé is data, not a page: `src/PersonalSite.Api/Content/resume.{fa,en}.json` → typed `ResumeProfile` records → `GET /api/resume?lang=`. The Resume page, About skills grid, keyboard hero, `curl` card, `llms.txt` and MCP all read the same records, so they can never disagree (ADR-013). Three layers catch mistakes **at startup**, before any visitor:
```csharp
new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
    RespectRequiredConstructorParameters = true,                  // "headline" missing    → error
    RespectNullableAnnotations = true,                            // "headline": null       → error
    UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow, // "headlin": "typo"      → error
};
// + ResumeContentValidator (IValidateOptions): blank text, "2021-13", end < start, unknown tech id,
//   and fa/en disagreeing on dates or stack. + ValidateOnStart() → the app refuses to start.
```
"Fail fast" is cheaper than "fail on the first request": a broken file breaks the deploy's health check, not a page.

### 2.17 Custom parameter binding: strict `?lang=` (P3-T1)
Minimal APIs bind an `enum` with `Enum.TryParse`, which is case-sensitive on C# names (`Fa`, not `fa`) **and accepts numbers** (`?lang=5` → an undefined `Language`, then a 500). A type with a `static bool TryParse(string?, out T)` method gets custom binding instead:
```csharp
public readonly record struct LanguageParameter(Language Value)
{
    public static bool TryParse(string? value, out LanguageParameter result) { /* only "fa" or "en" */ }
}
// GET /api/resume?lang=FA → TryParse returns false → 400 ProblemDetails, before the handler runs.
```
An OpenAPI schema transformer adds `enum: ["fa","en"]` to that parameter, so the generated TS type is `"fa" | "en"` and a call with `lang: "de"` fails `pnpm typecheck`. An integration test found this bug: the first version bound the enum directly and returned 400 for `?lang=fa`.

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

> Sections 4.1–4.9 were written for the P1 Razor front-end, retired on 2026-10-18 (ADR-021). Their concepts (tokens,
> contrast, RTL, FOUC, CSP, `currentColor`) still apply in Next.js; the tool-specific parts (standalone CLI, Alpine,
> Razor partials) don't. New front-end entries start at 4.10.

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

Why it must be **inline** and **tiny** (P1-T6): the browser runs a plain `<script>` in `<head>` *before* it renders anything, so it blocks the first paint. An external file would cost a network round trip inside that block; a `defer`/module script (like `app.js`) runs too late — after the first paint, which is exactly the flash. So the script is one line, does one thing, and can't fail loudly:
```js
try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}
```
Everything else (the button, saving the choice) lives in Alpine, which may load later without harm. Without JS the server's `data-theme="dark"` simply stays.

### 4.5 RTL & logical properties
`margin-left` is wrong in RTL. Logical properties use *start/end*: `ms-4` (margin-inline-start) is left in English and right in Persian. Using only these means English support later needs zero CSS changes.

### 4.5.1 Accessible layout basics
- **Landmarks** (`header`, `nav`, `main`, `footer`) let screen-reader users jump between regions like headings.
- **Skip link:** the first Tab shows "پرش به محتوای اصلی"; Enter moves focus to `<main tabindex="-1">`, skipping the menu.
- **`:focus-visible`** draws a ring only for keyboard focus, so mouse users don't see rings on every click.
- **`<details>`/`<summary>`** is a built-in disclosure widget: it opens/closes and announces expanded/collapsed
  without JavaScript — a good base that JS (Alpine) can enhance later (*progressive enhancement*).
- **Icon-only links** need text for screen readers: `<svg aria-hidden="true">` + `<span class="sr-only">گیت‌هاب</span>`.

### 4.6 Bidirectional text
A Persian paragraph containing `ASP.NET Core 10` or code can scramble word order. We set `dir="auto"` on paragraphs and force left-to-right on code: in CSS, `code, pre { direction: ltr; unicode-bidi: isolate; }` — `isolate` makes the code a sealed box the surrounding RTL text cannot reorder (same effect as `dir="ltr"`, but it also applies to Markdown output we don't write by hand).

### 4.7 Alpine.js and the CSP build
Alpine adds small interactivity (`x-data`, `x-on:click`) without a build step. The normal build evaluates attribute strings with `new Function` which a strict Content-Security-Policy blocks. The CSP build doesn't — so we register components in JS files with `Alpine.data('themeToggle', …)` and reference them by name.

How it is wired (P1-T7): one ES module entry point imports everything, registers it, then starts Alpine.
```js
// wwwroot/js/app.js — loaded with <script type="module">: deferred, never blocks rendering
import Alpine from "../lib/alpine-3.17.4/alpine-csp.esm.min.js";
import mobileMenu from "./components/mobile-menu.js";
Alpine.data("mobileMenu", mobileMenu);
Alpine.start(); // after registering: Alpine scans the page once
```
```html
<details x-data="mobileMenu" x-on:keydown.escape.window="closeFromKeyboard">
```
Two gotchas: write `x-on:` rather than `@` in `.cshtml` (Razor treats `@` as C#), and a misspelt `x-data` name fails *silently* — `ScriptsTests` catches it. The `<details>` menu works without JS; Alpine only adds Escape/outside click (*progressive enhancement*).

### 4.8 Why self-host fonts and scripts
CDNs and Google Fonts can be slow or blocked in Iran, leak visitor data to third parties, and complicate CSP. Files in `wwwroot` always work and move with the app.

### 4.9 SVG motifs: `currentColor`, intrinsic size, CSS-only motion
The botanical art (`Shared/Motifs/`, P1-T8) is inline SVG in Razor partials, so it costs no extra request. Three ideas make it fit the site:
```html
<div class="w-20 text-primary">                    <!-- the wrapper picks size and token color -->
  <svg class="block h-auto w-full" viewBox="0 0 120 120" width="120" height="120"
       stroke="currentColor" aria-hidden="true" focusable="false">
    <g class="motif-sway" transform-origin="157 348">…</g>
```
- **`currentColor`** = "whatever `color` I inherit". The SVG paints with the wrapper's `text-primary`, which reads a CSS variable, so switching the theme re-colors the art with no extra markup.
- **No layout shift:** `width`/`height` equal to the viewBox tell the browser the shape's aspect ratio before it lays out the page, so nothing jumps; `w-full h-auto` then scales it.
- **Motion:** a CSS `@keyframes` rotation, only inside `@media (prefers-reduced-motion: no-preference)`. A `transform` never moves other boxes (no layout shift), and the SVG `transform-origin` attribute sets the pivot where each leaf meets the stem. No `style="…"` and no `id`s: the CSP forbids inline styles, and ids would clash when a motif appears twice. `MotifTests` checks all of this.


### 4.10 Two apps, one origin (Next.js + ASP.NET Core API)
The browser treats `https://site/` and `https://site/api` as the **same origin** (same scheme + host + port). Caddy sends `/api/*` to the .NET container and everything else to the Next.js container, so for the browser it is one site:
```
GET /fa/blog/x     → Caddy → frontend:3000  (Next.js renders HTML; on the server it calls http://api:8080/api/posts/fa/x)
POST /api/auth/login → Caddy → api:8080     (sets the login cookie)
```
Why it matters: the login cookie is sent to `/api` automatically, there is no CORS configuration, and no token ever sits in JavaScript where an XSS bug could steal it. Two origins (`app.site` + `api.site`) would need CORS, cross-site cookie settings and more ways to get security wrong.

### 4.11 Server Components vs Client Components
In the Next.js App Router every component runs **on the server** unless its file starts with `"use client"`. Server Components can `await` data and send only HTML to the browser — no JavaScript for them. Client Components ship JS and can use state, effects and the mouse. Rule of thumb: keep pages as Server Components and make only the small interactive leaves client components.
```tsx
// app/[locale]/projects/page.tsx — Server Component: fetches on the server, ships no JS
export default async function ProjectsPage() {
  const { data } = await api.GET("/api/projects", { params: { query: { lang: "fa" } } });
  return <BentoGrid>{(data?.items ?? []).map((p) => <ProjectCard key={p.id} project={p} />)}</BentoGrid>;
}
// components/bento/Spotlight.tsx starts with "use client" — it needs pointer events.
```

### 4.12 App Router basics: folders are URLs (P2-T3)
In `src/app/`, a folder is a URL segment and a few reserved file names give it meaning:
```
src/app/layout.tsx      → wraps every page (<html>, <body>); stays mounted while you navigate
src/app/page.tsx        → the page for "/"
src/app/about/page.tsx  → the page for "/about"            (P2-T6 adds the [locale] folder: "/fa/about")
```
Both files are Server Components by default (4.11): `page.tsx` just returns JSX, and Next renders it to HTML on the server. Tooling around it, in `frontend/package.json`: `pnpm lint` (ESLint finds bugs + Prettier checks layout), `pnpm typecheck` (`next typegen` writes route types, then `tsc` checks everything), `pnpm test` (Vitest: components in a simulated DOM, milliseconds), `pnpm e2e` (Playwright: a real Chromium against a production build, seconds). Why the lockfile matters: `pnpm-lock.yaml` records the exact version of every package, even indirect ones; CI's `pnpm install --frozen-lockfile` refuses to change it, so CI tests exactly what you tested.


### 4.13 One contract, two languages (P2-T4)
The C# DTO is the single source of truth; TypeScript never re-types it by hand:
```
SiteNameDto(string Fa, string En)  ──dotnet build──►  openapi/v1.json  ──pnpm gen:api──►  schema.d.ts
                                                                                            { fa: string; en: string }
```
`openapi-fetch` reads those types, so a call is checked end to end — the path, the parameters and the response:
```ts
const { data } = await createServerApi().GET("/api/site"); // "/api/sites" would not compile
data?.name.fa;                                             // typed as string
```
Try it: rename `Fa` to `Persian` in C#, run both generators, and `pnpm typecheck` fails at every place that reads `name.fa` — before anything is deployed. CI runs both generators and fails if the committed files differ, so nobody can skip the step. Two clients exist because the two sides reach the API differently: the server calls `API_INTERNAL_URL` directly (container to container), the browser calls its own origin (`/api/...`), which Caddy routes to the API.

### 4.14 CSS variables as a theme API; no flash in Next.js (P2-T8)
The tokens (4.3) are the *contract* between design and components: a component says `bg-surface`, never a color.
`globals.css` holds dark values in `@theme static`, light overrides in `:root[data-theme="light"]`; one attribute on
`<html>` re-colors everything. `--color-*: initial` deletes Tailwind's palette, so `bg-red-500` simply doesn't exist.

No flash (FOUC, 4.4) in Next.js takes three pieces, because three different moments can go wrong:
```
HTML parsing  → <script nonce=…> in <head> sets data-theme from localStorage   (before the first paint)
hydration     → suppressHydrationWarning on <html>: React accepts the attribute the script added
after that    → ThemeToggle reads the attribute with useSyncExternalStore (server snapshot = "dark")
```
The script needs this request's CSP nonce (5.8): `proxy.ts` also puts it in an `x-nonce` request header, and
`ThemeScript` reads it with `headers()`. The toggle's *icon* is picked by CSS (`light:hidden` / `dark:hidden`), so it
is right before React runs; only `aria-pressed` waits for hydration. e2e proves it by blocking every JS bundle and
checking the page is still light.

### 4.15 One layout for both directions; View Transitions (P2-T9)
The header is written once with logical utilities (4.5): `ms-auto` pushes the controls to the *end* — left in Persian,
right in English. `dir` on `<html>` flips the whole row; no `rtl:` variants needed.

The fa ↔ en switch is a plain `<a href="/en/...">` (a full page load), and both pages opt in to **cross-document
View Transitions** in CSS. The browser screenshots the old page, loads the new one, and for every element whose
`view-transition-name` exists on both pages, animates it from its old box to its new box:
```css
@view-transition { navigation: auto; }              /* inside @media (prefers-reduced-motion: no-preference) */
.brand { view-transition-name: site-brand; }        /* right edge in fa → left edge in en: it slides across */
```
No JavaScript, so nothing for the CSP to block; browsers without support just navigate. Rule: a name must be
unique on the page (the mobile menu has none). e2e checks it through `pagereveal`'s `event.viewTransition`.

404 in the right language: `app/[locale]/[...rest]/page.tsx` catches every unknown path and calls `notFound()`, so
`app/[locale]/not-found.tsx` renders *inside* the layout (header, footer, `lang`). `/de` has no language at all, so
`proxy.ts` rewrites it (the address bar keeps `/de`) to `/en/de` for an English browser, which lands in that catch-all.

### 4.16 A small UI kit; the cursor spotlight (P2-T10)
Components in `src/components/ui/` are Server Components unless they need the browser. Only `BentoGrid` is a client
component: it owns **one** `pointermove` listener for the whole grid, and the cards (server-rendered) are its
`children`. On each animation frame it writes the cursor position into CSS variables on every card:
```ts
card.style.setProperty("--x", `${clientX - rect.left}px`);   // CSSOM: never blocked by CSP
```
CSS does the drawing: `radial-gradient(… at var(--x) var(--y), accent, transparent)` on a pseudo-element, masked to
a 1px ring over the border. React never re-renders on mouse move — the browser just repaints.
"Off with reduced motion" = `useSyncExternalStore` reads `matchMedia("(hover: hover) and (pointer: fine) and
(prefers-reduced-motion: no-preference)")`; when false, no listener and no `data-spotlight` for the CSS to match.

Bidi gotcha: on a Persian page a tag reading `C#` shows as `#C`, because `#` has no direction and follows the page's
RTL. `dir="auto"` on the tag lets its first letter decide. Same reason email inputs get `dir="ltr"`.

Underscore URL: in the App Router a folder named `_x` is *private* (not a route). `%5Fstyleguide` (the encoded `_`)
makes the URL `/fa/_styleguide`.

### 4.17 Parallel fetches, honest placeholders, reserved space (P3-T2)
A Server Component can `await` data directly. Two independent requests should start together:
```ts
const site = await getSiteInfo();          // 40 ms
const resume = await getResume(locale);    // + 40 ms = 80 ms (waterfall)
const [site, resume] = await Promise.all([getSiteInfo(), getResume(locale)]);   // ≈ 40 ms
```
Cards whose data arrives in a later phase say what will be there plus an "In progress" badge — never sample numbers
dressed up as real (ADR-018). Slots that will be filled later (keyboard hero, status line) already take their final
size, so filling them moves nothing: no *layout shift* (CLS, a Core Web Vital).
`.NET` inside Persian text needs an invisible LRM (`‎`) before the dot, for the same bidi reason as `C#` above.

### 4.18 3D on the web, progressive enhancement, lazy loading (P3-T3)
**WebGL** lets the page draw with the GPU into a `<canvas>`; **Three.js** wraps it in scenes, meshes, lights and a
camera; **React Three Fiber** (R3F) lets you write that scene as JSX (`<mesh>`, `<pointLight>`), and **drei** adds
ready-made pieces (we use `RoundedBox`, `useCursor`). Per-frame animation goes in `useFrame`, which mutates refs
instead of setting state — 60 React renders a second would be far too slow:
```tsx
useFrame((_, delta) => {
  // ease toward the target; damp() runs at the same speed at 60 and 120 Hz
  group.current.position.y = MathUtils.damp(group.current.position.y, down ? 0.1 : 0.24, 18, delta);
});
```
**Progressive enhancement:** start from something that works everywhere, add the rich layer only where it can run.
1. The server renders a CSS **poster** of the keyboard + a list of real `<button>`s — works without JavaScript.
2. After hydration, `useSceneAllowed` checks WebGL and `prefers-reduced-motion` (server answer: "no").
3. Only then does `next/dynamic(() => import("./KeyboardScene"), { ssr: false })` fetch the ~240 KB (gzip)
   Three.js chunk — **lazy loading**: the first paint never waits for it, and reduced-motion visitors never download it.
4. The scene draws into the poster's box (fixed `aspect-ratio`), so the swap causes no layout shift; the poster fades
   out only after the first 3D frame, and comes back if WebGL fails (error boundary, `webglcontextlost`).

One state, three views: `KeyboardHero` owns *selected / hovered / held*; the poster, the 3D scene and the button list
only display it and report input. Real keys use `event.code` (`KeyC`, the physical key — layout-independent, so it
works on a Persian keyboard) and fire only while the pointer is over the keyboard or focus is in its list: always-on
single-letter shortcuts break voice input (WCAG 2.1.4).

### 4.19 MDX: Markdown that can hold components (P3-T4)
**MDX** = Markdown + JSX. `@next/mdx` compiles each `.mdx` file **at build time** into an ordinary React component,
so the page imports it like any module and no Markdown parser ships to the browser:
```tsx
import AboutEn from "@content/about.en.mdx";
<AboutEn components={{ Timeline, Bridge }} />   // the prose writes <Timeline /> where the timeline goes
```
Two layers of components: `src/mdx-components.tsx` styles the *elements* every MDX file produces (`## x` → our
`SectionHeader`, `[a](/resume)` → the locale-aware `Link`), and the page passes the *custom* ones (`Timeline`,
`Bridge`). Keeping imports out of the `.mdx` files means the content holds only words — a translator can't break the
code, and a test can compare the fa and en files' structure. **Why not messages JSON for prose?** Paragraphs with links
and emphasis are awkward as JSON strings; MDX keeps them readable and still type-checked through the components.
**Bidi in props:** an English term in parentheses inside Persian (`(Domain invariants)`) may break across lines in a
confusing order; `&nbsp;` keeps it together and `&rlm;` after `)` ends it on the Persian side.

### 4.20 CSS counters: numbers the content never writes (P3-T5)
The "How I work" steps are numbered by CSS, not by the text: the list resets a counter, each item increments it, and
a `::before` prints it. A built-in **counter style** picks the digits, so Persian gets ۱ ۲ ۳ with one extra rule:
```css
.steps { counter-reset: step; }
.step { counter-increment: step; }
.step-number::before { content: counter(step); }                  /* 1 2 3 */
:lang(fa) .step-number::before { content: counter(step, persian); } /* ۱ ۲ ۳ */
```
Why: reordering or adding a step in the MDX can't leave a wrong number behind, and the translator never types digits.
The badge is `aria-hidden`; the `<ol>` already tells screen readers the order ("list, 4 items").

### 4.21 Print stylesheets: paper is a third theme (P3-T6)
`@media print` rules apply only when the page is printed or saved as PDF. The Resume page needs two things there:
the **light palette** (a near-black page wastes ink and many browsers drop backgrounds anyway, leaving light text on
white) and **no site chrome**. Because every color is a CSS variable, the first is one block; the second is
Tailwind's `print:` variant:
```css
@media print { :root { color-scheme: light; --color-bg: #f6f7f9; --color-text: #111419; /* … */ } }
@page { margin: 1.5cm; }
```
```tsx
<header className="sticky top-0 print:hidden">…</header>
<li className="break-inside-avoid">…</li> {/* a job never splits across two pages */}
```
A unit test keeps the print values equal to the light theme's, and Playwright's `page.emulateMedia({ media: "print" })`
checks the printed look without a printer.

---

### 4.22 The admin panel: a second root layout, route groups, and forms with `useActionState` (P5-T5)
**Two root layouts.** `app/[locale]/layout.tsx` and `app/admin/layout.tsx` each render their own `<html>` — like two
separate `_Layout.cshtml` files for two areas in ASP.NET. Moving between them is a full page load.
**Route group** = a folder in parentheses, left out of the URL: `app/admin/(panel)/page.tsx` is `/admin`. It lets
every page except the login page share a layout (the sidebar) — like an MVC area whose pages share a layout, minus
the login view:
```
app/admin/layout.tsx           <html>, toasts           ← /admin/login and /admin/*
app/admin/login/page.tsx       /admin/login
app/admin/(panel)/layout.tsx   asks the API who is signed in, draws the sidebar
app/admin/(panel)/page.tsx     /admin (dashboard)
```
**Layouts and pages render in parallel**, not one inside the other's code path: something the layout does (setting
the language, checking the session) is not guaranteed to have happened when the page runs. So every page repeats
what it depends on — `setupAdminLocale()`, and a 401 check on its own data.
**A form with `useActionState`** (React 19): the action is an async function that gets the `FormData` and returns
the next state (here: the error to show); React gives a `pending` flag while it runs.
```tsx
const [state, formAction, pending] = useActionState(async (_prev, formData) => {
  const { response } = await browserApi.POST("/api/auth/login", { body: { … } });
  return response.ok ? { error: null } : { error: loginError(response.status, …) };
}, { error: null });
<form action={formAction}>…<Button disabled={pending}>…</Button></form>
```
It runs in the browser on purpose: the API's `Set-Cookie` must reach the browser, not the Next.js server.
**Open redirect:** `?next=https://evil.example` would let a phishing link send the admin to a fake site after a real
login, so `safeNextPath()` keeps only paths inside `/admin`.

### 4.23 Sound without audio files: the Web Audio API (P3-T9)
The browser has a small synthesizer built in. Nodes are connected like a guitar's pedal chain and scheduled on an
audio clock (`context.currentTime`, in seconds), not on JavaScript timers:
```ts
const noise = context.createBufferSource();          // half a second of random samples = white noise
const filter = context.createBiquadFilter();          // keep only ~2.4 kHz: the plastic "click"
filter.type = "bandpass"; filter.frequency.value = 2400;
const envelope = context.createGain();                // loud for 1 ms, then fades in 25 ms: a hit
envelope.gain.setValueAtTime(0.0001, at);
envelope.gain.exponentialRampToValueAtTime(0.6, at + 0.001);
envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.025);
noise.connect(filter).connect(envelope).connect(context.destination);
noise.start(at); noise.stop(at + 0.035);
```
A key press = that click + a low falling tone (the case's "thock") + low-passed noise (the bottom-out). Each key gets
its own pitch from a hash of its id, plus a little randomness, so it never sounds like one sample on repeat.
**Autoplay rule:** browsers start audio only after the visitor has clicked, tapped or pressed a key on the page —
hovering alone doesn't count (`navigator.userActivation.hasBeenActive`). So pointing at a key is silent until the
first click; after that, every hover plays.
**Like the theme:** the mute choice is in localStorage and set on `<html>` by the pre-paint script, so the icon
(chosen by CSS: `sound-off:hidden`) is right before React has loaded.

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

### 5.7 Content-Security-Policy (CSP)
A response header that tells the browser where code may come from. Ours starts with `default-src 'self'`: scripts, styles, fonts and images only from our own origin. So even if an attacker slips `<script>alert(1)</script>` into a page, the browser refuses to run it — inline scripts aren't allowed. That's the second line of defence behind HTML encoding (5.1).
```
Content-Security-Policy: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```
`frame-ancestors 'none'` also stops other sites from framing ours (clickjacking). The one inline script we need (the theme script, P1-T6) is allowed by its **hash**: the header lists `'sha256-…'` of the script's exact text, and the browser runs an inline script only if its text hashes to a listed value — an attacker's script never matches. The alternative, a **nonce** (a random value per response, in the header and on `<script nonce>`), breaks when a cached page is served, so we use hashes (ADR-020). One extra space inside the `<script>` tag changes the hash and the script is blocked — hence the test. Violations show up in the browser console as "Refused to execute…".


### 5.8 Nonces vs hashes, and `'strict-dynamic'` (P2-T7)
5.7 describes P1, which used **hashes**: fine for one fixed inline script. Next.js emits many inline scripts whose text differs per page and per request (the data it streams to the browser), so hashes can't be known in advance — we use a **nonce** instead (ADR-025, which replaced ADR-020):
```
proxy.ts:  nonce = 16 random bytes → header  script-src 'self' 'nonce-VScAIG…' 'strict-dynamic'
Next.js:   reads the header while rendering → <script nonce="VScAIG…"> on every script it writes
browser:   runs a script only if its nonce matches the header of *this* response
```
An injected `<script>` has no (or an old) nonce, so it never runs; a new nonce per page view means a stolen one is useless. The price: a nonce must be fresh, so pages can't be built once and served from a cache — every page renders per request (`await connection()` in the layout); API data is still cached. **`'strict-dynamic'`** says: "trust scripts loaded *by* a trusted (nonced) script". Next's runtime loads its chunks dynamically; without `'strict-dynamic'` every chunk URL would have to be listed. With it, `'self'` and host lists are ignored for scripts — only the nonce chain counts. `e2e/csp.spec.ts` proves it on every route: header correct, every `<script>` carries the nonce, Next's inline scripts actually ran, zero violations — and it was checked to fail when the nonce is removed.

### 5.9 Email obfuscation (P3-T7)
Spam bots ("harvesters") download pages and grep the HTML for `name@domain` and `mailto:`; almost none run
JavaScript. So the server never writes the address: it sends reversed character codes, and a tiny client
component turns them back into a link after hydration:
```ts
encodeEmail("a@b.ir");          // [114, 105, 46, 98, 64, 97]  ("ri.b@a")
decodeEmail([114, 105, 46, 98, 64, 97]); // "a@b.ir" → <a href="mailto:a@b.ir">
```
Why not other ways: an inline `onclick` or a `<script>` that writes the link is blocked by our nonce CSP;
`dangerouslySetInnerHTML` is banned (rules.md §9); a CSS trick (reversed text + `direction: rtl`) breaks copy-paste
and screen readers. Note the props of a client component are serialized into the page (the RSC payload), so they
must be encoded too — passing the plain address as a prop would put it right back into the HTML. Trade-off:
without JavaScript the visitor sees `a [at] b.ir` and types it by hand. It stops cheap bots, not a person — the
address is public on purpose. `e2e/contact.spec.ts` checks the raw HTML has neither the address nor `mailto:`.

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

What .NET gives you and what it doesn't (checked on .NET 10 + ICU):

| | `fa` culture output | Note |
|---|---|---|
| Calendar | `1405/1/1` | Persian calendar by default ✓ |
| Month names | `فروردین` | ✓ |
| Digits | `1405` | **ASCII** — the Persian digits are only *listed* in `NumberFormat.NativeDigits` |
| Separators | `1٬234٬567٫5` | Persian thousands/decimal marks ✓ |
| Long date `D` | `1405 فروردین 1, شنبه` | odd → we use our own pattern `d MMMM yyyy` from resx |

So `DateDisplay` = `ToString("d MMMM yyyy", culture)` + `NativeDigits.Apply` → `۱ فروردین ۱۴۰۵`.

### 6.5.1 Time zones: store UTC, show Tehran
The DB stores instants in UTC. Shown dates are converted to `Site:TimeZone` (`Asia/Tehran`, UTC+3:30) first —
otherwise anything posted between 00:00 and 03:30 Tehran time would show *yesterday's* date:
`2026-03-20 20:31 UTC` is already Nowruz (`۱ فروردین ۱۴۰۵`) in Tehran. Iran abolished daylight saving in 2022;
IANA time zone data (tzdata/ICU) knows that, which is why we use the zone ID and never a fixed `+03:30` offset —
historical dates (with DST) still convert correctly.

### 6.6 Latin slugs
`/fa/blog/مقدمه-ای-بر-efcore` becomes `%D9%85%D9%82…` when copied into Telegram — long and ugly. Latin slugs (`/fa/blog/intro-to-efcore`) stay readable everywhere.


### 6.7 `Intl`: the platform formats, we don't (P2-T6)
P1 formatted dates in C#; now Node's built-in ICU does it, and the options say *what*, not *how*:
```ts
new Intl.DateTimeFormat("fa", { calendar: "persian", numberingSystem: "arabext", timeZone: "Asia/Tehran",
  day: "numeric", month: "long", year: "numeric" }).format(new Date("2026-03-20T20:31:00Z")); // "۱ فروردین ۱۴۰۵"
new Intl.NumberFormat("fa").format(1234567);                            // "۱٬۲۳۴٬۵۶۷"
new Intl.RelativeTimeFormat("fa", { numeric: "always" }).format(-3, "day"); // "۳ روز پیش"
```
No digit is ever swapped by hand: `arabext` *is* the Persian digit set, and the Persian separators (`٬` `٫`) come with it. Everything goes through `src/lib/format/`, so one change (e.g. a different time zone after the international move) changes the whole site. We format on the **server**: a client component would use the visitor's browser ICU, which can differ from Node's and cause a hydration mismatch.

### 6.7.1 A Gregorian month in the Persian calendar (P3-T6)
The résumé stores months as `"2020-09"` — no day. A Gregorian month overlaps **two** Persian months (Persian months
start around the 21st), so "September 2020" is partly شهریور and partly مهر. `formatYearMonth` picks the 15th, which
falls in the Persian month covering most of it: `formatYearMonth("2020-09", "fa")` → `شهریور ۱۳۹۹`. It builds the
text from `formatToParts` (month, then year) because Intl's own Persian pattern puts the year first.

### 6.8 Locale routing in Next.js (P2-T6)
`app/[locale]/` makes the language a URL segment; `generateStaticParams()` lists `fa` and `en`, and `dynamicParams = false` turns every other value (`/de`) into a 404 — the router itself enforces "only these two languages". `/` has no language, so `proxy.ts` (Next 16's request hook) picks one — `lang` cookie, then `Accept-Language`, then `fa` — and answers **302** (temporary: the answer depends on who asks, so nobody may cache it; `Vary: Cookie, Accept-Language` says the same to caches). Messages are typed: `src/types/next-intl.d.ts` registers `en.json` as the message shape, so `t("notFound.titel")` fails `pnpm typecheck`, and a test fails if `fa.json` and `en.json` ever have different keys.

---

### 6.9 A link inside a translated sentence: `t.rich` (P3-T8)
Word order differs between languages, so a sentence with a link must not be glued from pieces ("Beyond the list: the" +
link + "behind my projects"). The whole sentence lives in one message with a tag around the linked words, and the
component decides what the tag becomes:
```tsx
// en.json: "decisions": "Beyond the list: the <link>engineering decisions</link> behind my projects …"
t.rich("decisions", { link: (chunks) => <Link href="/decisions">{chunks}</Link> })
```
The translator can move `<link>…</link>` anywhere in the Persian sentence; the code doesn't change.

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
**Image tags (P4-T3, `.github/workflows/release.yml`):** a tag is a *name* pointing at an image; one image can have
several. Each release gets two: the git tag (`v0.1.0`, what `IMAGE_TAG` in `.env` names) and `sha-<7 chars>` (always
unique, tells you the exact commit). No `latest`: "latest" moves, so two pulls of it can give two different apps and a
rollback has no name to go back to. Both images of a release share the same tags, so `IMAGE_TAG` picks a matching pair.
```
git tag v0.1.0 && git push origin v0.1.0
→ ghcr.io/<owner>/personalsite-api:v0.1.0  (+ :sha-1a2b3c4)    ghcr.io/<owner>/personalsite-frontend:v0.1.0  (+ :sha-1a2b3c4)
```
The workflow runs the whole CI first (`uses: ./.github/workflows/ci.yml`), so an untested commit never becomes an image.

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

### 7.12 Reverse proxy routing (Caddy) (P2-T5)
A reverse proxy is the one door the browser knocks on; it looks at each request and forwards it to the right app behind it. Ours decides by **path** (`deploy/Caddyfile.dev`):
```
@api path /api/* /health*  …  →  reverse_proxy api:8080       (ASP.NET Core)
@internal path /internal/*    →  respond 404                  (front-end internals stay private)
everything else               →  reverse_proxy frontend:3000  (Next.js)
```
`api` and `frontend` are compose **service names**: Docker's internal DNS resolves them on the compose network, and only Caddy publishes a port to your machine. Two kinds of traffic, two routes: the *browser* always goes through Caddy (`localhost:8080/api/site`); the *Next.js server* calls `http://api:8080` directly, container to container — no detour through the proxy. On the host (`pnpm dev`) there is no Caddy, so a development-only `rewrites` rule in `next.config.ts` plays its part for `/api/*`. Why one origin removes CORS: see 4.10.

### 7.13 Production compose: same services, different overrides (P4-T1)
Production reuses `compose.yaml` and layers `compose.prod.yaml` on top (`-f compose.yaml -f compose.prod.yaml`; the
dev `compose.override.yaml` is then *not* loaded). The prod file only states what differs:
```yaml
api:
  image: ghcr.io/<owner>/personalsite-api:${IMAGE_TAG:?IMAGE_TAG is not set}   # pull a finished image…
  build: !reset null                                                         # …and never build on the server
  restart: unless-stopped                                                    # come back after a crash or reboot
```
`${VAR:?message}` makes compose refuse to start when a required value is missing, instead of running with an empty
one. Only Caddy publishes ports (80/443); the DB and both apps are reachable only on the compose network.
Caddy reads `{$SITE_HOST}` from its environment *before* parsing the Caddyfile, so the domain lives in `.env`, not in
the file. For a real hostname it fetches a Let's Encrypt certificate by itself (HTTP-01 on port 80); for `localhost`
it uses its own local CA — that is how the production stack can be tried on a laptop. A named volume mounted on a
path that doesn't exist in the image is created owned by root, so the Dockerfile creates `/app/data/*` owned by the
non-root app user first.

### 7.14 One server, two apps: a shared edge proxy (P4-T6, ADR-028)
Only one process can listen on port 443. With two apps on one server, neither app's own proxy may face the internet;
a third one (the **edge**) does, and routes by hostname:
```
mahdiazghandi.ir        → 127.0.0.1:13000 / :18080   (this site, published on loopback only)
panel.pasargadgymplus.ir → 127.0.0.1:<gym port>      (the gym system)
```
- **Host network** (`network_mode: host`): the edge container uses the server's own network stack, so `127.0.0.1` is
  the server, not the container. Apps never share a docker network, so two services called `api` can't collide.
- **Loopback publishing** (`127.0.0.1:18080:8080`): Docker's published ports skip ufw, but a port bound to loopback
  is unreachable from outside anyway.
- **Who is the client?** The edge adds `X-Forwarded-For: <real IP>`; the connection reaches the API from the docker
  network's gateway (`172.30.0.1`), which the API trusts — so rate limits see the real visitor, not the proxy.
- **Safe reloads:** `caddy reload` validates the whole new config first; a broken site file is refused and the old
  config keeps serving, so one app's typo can't take the other app down.
- **OOM score:** `oom_score_adj: 500` tells the kernel which processes to kill first when memory runs out — this site,
  not the gym.

### 7.15 Admin sign-in: Identity lockout and cookie flags (P5-T1)
The admin panel signs in with ASP.NET Core Identity and a cookie, not a JWT: browser and API share one origin, so
the browser attaches the cookie itself and JavaScript never holds a token.
```
Set-Cookie: __Host-admin=CfDJ8…; path=/; secure; samesite=strict; httponly
```
- `httponly`: `document.cookie` can't read it — an XSS bug can't send the session elsewhere.
- `secure` + the `__Host-` prefix: only over HTTPS, only for this exact host (no `Domain`), path `/` — nothing on
  another subdomain or on plain http can set or overwrite it.
- `samesite=strict`: not sent when another site starts the request (a form posting to `/api/admin/…`) — the first
  CSRF defence; P5-T3 adds an `Origin` check.
- Sliding 7 days: activity renews it; an idle session ends after a week.
- Lockout: 5 wrong passwords in a row → locked 15 minutes, per account, whatever the attacker's IP. The rate limit
  (P5-T3) works per IP; together they cap online guessing.
- An API answers `401`/`403`; Identity's default (a 302 to a login page) would make `fetch` follow a redirect to
  HTML it can't use.

### 7.16 CSRF with Fetch Metadata, rate limits and a constant-time "no" (P5-T3)
**CSRF** = another site makes the victim's browser send a request to ours; the browser attaches our cookie, so the
request looks like the admin's. Three layers stop it here:
1. `SameSite=Strict` on the cookie (7.15): a request another site starts carries no cookie.
2. **Fetch Metadata**: every current browser adds `Sec-Fetch-Site` (`same-origin`, `same-site`, `cross-site`,
   `none`), and page scripts can't set it. `CrossOriginProtectionMiddleware` lets unsafe methods through only for
   `same-origin`/`none`; older browsers fall back to comparing `Origin` with the request's own scheme + host.
3. A request with **neither** header isn't from a browser (the Next.js server, curl), so it carries no victim's
   cookie and is allowed — requiring `Origin` would only break server-side calls.
```
POST /api/auth/logout   Sec-Fetch-Site: cross-site   → 403 {"code":"request.cross_origin"}
POST /api/auth/logout   Sec-Fetch-Site: same-origin  → 204
```
**Rate limit vs lockout:** the `login` policy counts per IP (10 per 15 min) — it slows one attacker and caps CPU,
since each attempt costs a PBKDF2 hash. Lockout counts per account, across IPs. The IP is only trustworthy because
`UseForwardedHeaders` runs first and believes only the edge proxy.
**Same answer, same time:** unknown email, wrong password, locked account → one `401 auth.invalid_credentials`. An
unknown email also runs a decoy hash, so response time doesn't reveal which email is the admin's.

### 7.17 Containing a compromise: capabilities, read-only containers, internal networks (P4-T7)
Containers share the host's kernel, so "inside a container" is only as strong as the limits on it. On a server
shared with the gym, every limit answers: *if someone runs code in this container, what can that code do?*
- **Capabilities.** Linux splits root's powers into ~40 capabilities (`CAP_CHOWN`, `CAP_NET_RAW`, `CAP_SYS_ADMIN`…).
  Docker keeps 14 by default; `cap_drop: [ALL]` removes them. Check: `grep CapEff /proc/1/status` → `0000000000000000`.
- **`no-new-privileges`.** Blocks the setuid trick: running `su`/`sudo`-like binaries can't raise privileges.
- **`read_only: true`.** The image's filesystem can't be changed; scratch space comes from `tmpfs` (RAM, counted in
  the memory limit, empty after a restart):
  ```yaml
  read_only: true
  tmpfs: ["/tmp:size=16m"]
  ```
- **Internal network.** `internal: true` gives a docker network no gateway: the db can talk to the api, and nothing
  else, in either direction. The frontend isn't on it, so it can't even resolve the name `db`.
- **What's left:** a kernel bug escapes any container (keep the host patched), and anyone in the `docker` group is
  root on the host (protect the deploy key).
