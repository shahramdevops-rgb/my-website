// URLs of the admin panel (P5-T5). The panel lives outside [locale]: it is one person's tool, not a page of the
// site, so it has no language prefix and is never indexed. Its language follows the `lang` cookie.

/** The panel's start page (dashboard). */
export const adminHomePath = "/admin";

export const adminLoginPath = "/admin/login";

/** Query parameter on the login page: where to go after signing in. */
export const nextParam = "next";

/**
 * Name of the API's session cookie (`AdminAuthentication.CookieName` in the API). The front-end never reads its
 * value — it is HttpOnly — only whether it exists, to send a visitor without one to the login page (UX only:
 * the API checks every admin request itself).
 */
export const adminCookieName = "__Host-admin";

/**
 * Request header proxy.ts sets on admin pages: the requested path and query, so a layout (which doesn't receive
 * the URL) can send an expired session to the login page with the way back.
 */
export const adminPathHeader = "x-admin-path";

/** `/admin` and everything below it, but not `/administrator` or `/admin-foo`. */
export function isAdminPath(pathname: string): boolean {
  return pathname === adminHomePath || pathname.startsWith(`${adminHomePath}/`);
}

/**
 * The login page's `next` value, made safe to redirect to: only a path inside the panel on this origin.
 * Anything else falls back to the dashboard — accepting any URL would make the login page an open redirect
 * (a phishing link "log in here" that lands the admin on an attacker's look-alike site afterwards).
 */
export function safeNextPath(value: string | null | undefined): string {
  // `//evil.example` and `/\evil.example` are protocol-relative URLs to browsers, not paths.
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return adminHomePath;
  }

  // Resolving against a dummy origin normalizes `/admin/../evil` and exposes anything that leaves the origin.
  const base = "http://admin.invalid";
  const url = new URL(value, base);
  if (url.origin !== base || !isAdminPath(url.pathname) || url.pathname === adminLoginPath) {
    return adminHomePath;
  }

  return `${url.pathname}${url.search}`;
}

/** The login page URL that brings the admin back to `path` afterwards. */
export function loginUrlFor(path: string): string {
  const next = safeNextPath(path);
  return next === adminHomePath
    ? adminLoginPath
    : `${adminLoginPath}?${nextParam}=${encodeURIComponent(next)}`;
}
