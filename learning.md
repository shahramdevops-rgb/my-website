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

### 6.8 Locale routing in Next.js (P2-T6)
`app/[locale]/` makes the language a URL segment; `generateStaticParams()` lists `fa` and `en`, and `dynamicParams = false` turns every other value (`/de`) into a 404 — the router itself enforces "only these two languages". `/` has no language, so `proxy.ts` (Next 16's request hook) picks one — `lang` cookie, then `Accept-Language`, then `fa` — and answers **302** (temporary: the answer depends on who asks, so nobody may cache it; `Vary: Cookie, Accept-Language` says the same to caches). Messages are typed: `src/types/next-intl.d.ts` registers `en.json` as the message shape, so `t("notFound.titel")` fails `pnpm typecheck`, and a test fails if `fa.json` and `en.json` ever have different keys.

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

### 7.12 Reverse proxy routing (Caddy) (P2-T5)
A reverse proxy is the one door the browser knocks on; it looks at each request and forwards it to the right app behind it. Ours decides by **path** (`deploy/Caddyfile.dev`):
```
@api path /api/* /health*  …  →  reverse_proxy api:8080       (ASP.NET Core)
@internal path /internal/*    →  respond 404                  (front-end internals stay private)
everything else               →  reverse_proxy frontend:3000  (Next.js)
```
`api` and `frontend` are compose **service names**: Docker's internal DNS resolves them on the compose network, and only Caddy publishes a port to your machine. Two kinds of traffic, two routes: the *browser* always goes through Caddy (`localhost:8080/api/site`); the *Next.js server* calls `http://api:8080` directly, container to container — no detour through the proxy. On the host (`pnpm dev`) there is no Caddy, so a development-only `rewrites` rule in `next.config.ts` plays its part for `/api/*`. Why one origin removes CORS: see 4.10.
