import { type NextRequest, NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import {
  adminCookieName,
  adminLoginPath,
  adminPathHeader,
  isAdminPath,
  loginUrlFor,
} from "@/lib/admin/paths";
import { type Locale, localeCookieName, locales } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import {
  contentSecurityPolicy,
  createNonce,
  nonceHeaderName,
  staticSecurityHeaders,
} from "@/lib/security/headers";

// Next.js 16 request hook (was "middleware"): runs before every page request (see `config.matcher`).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response =
    pathname === "/"
      ? redirectToLocale(request)
      : isAdminPath(pathname)
        ? renderAdminPage(request)
        : renderPage(request);

  for (const [name, value] of Object.entries(staticSecurityHeaders)) {
    response.headers.set(name, value);
  }
  return response;
}

/** The visitor's language (architecture.md §5.4): `lang` cookie → Accept-Language → default. */
function visitorLocale(request: NextRequest): Locale {
  return resolveLocale(
    request.cookies.get(localeCookieName)?.value,
    request.headers.get("accept-language"),
  );
}

/** `/` has no language: send the visitor to theirs. */
function redirectToLocale(request: NextRequest): NextResponse {
  // 302, not 301: the answer depends on the visitor, so browsers and proxies must not remember it.
  const response = NextResponse.redirect(new URL(`/${visitorLocale(request)}`, request.url), 302);
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

/**
 * A new nonce and the policy that carries it. Next.js reads the policy from the *request* headers while
 * rendering and puts the nonce on every script it emits; the browser reads it from the *response* headers and
 * runs only those.
 */
function nonceRequestHeaders(request: NextRequest): { requestHeaders: Headers; policy: string } {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, {
    isDev: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  // Our own inline script (the pre-paint theme script) reads the nonce from here.
  requestHeaders.set(nonceHeaderName, nonce);
  return { requestHeaders, policy };
}

/**
 * A page view of the site, with a new nonce.
 *
 * A path whose first segment is no language (/de, /de/about) is rewritten — the URL in the address bar stays —
 * to the same path under the visitor's language (/en/de/about). That path matches no page, so app/[locale]/
 * [...rest] answers 404 with the localized not-found page. Without the rewrite, /de reaches [locale] itself,
 * whose 404 comes from the root layout and has an empty body. New top-level routes outside [locale]
 * (sitemap.xml, robots.txt) must be excluded here or in `config.matcher`, as the admin panel is in `proxy`.
 */
function renderPage(request: NextRequest): NextResponse {
  const { requestHeaders, policy } = nonceRequestHeaders(request);

  const firstSegment = request.nextUrl.pathname.split("/")[1];
  const response = hasLocale(locales, firstSegment)
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : rewriteToLocalizedNotFound(request, requestHeaders);

  response.headers.set("Content-Security-Policy", policy);
  return response;
}

function rewriteToLocalizedNotFound(request: NextRequest, requestHeaders: Headers): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${visitorLocale(request)}${url.pathname}`;

  const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

/**
 * A page of the admin panel (P5-T5). Without the session cookie every page but the login page redirects there,
 * remembering where the admin wanted to go. That is convenience only: whether the cookie is *valid* only the API
 * knows, and it checks every /api/admin request itself (architecture.md §5.2). The panel layout asks the API too.
 */
function renderAdminPage(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  let response: NextResponse;

  if (pathname !== adminLoginPath && !request.cookies.has(adminCookieName)) {
    response = NextResponse.redirect(
      new URL(loginUrlFor(`${pathname}${search}`), request.url),
      302,
    );
  } else {
    const { requestHeaders, policy } = nonceRequestHeaders(request);
    requestHeaders.set(adminPathHeader, `${pathname}${search}`);
    response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", policy);
  }

  // Never in a search engine, never in a shared cache or the browser's back-forward cache with someone's data.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API (own headers), static files, or the internal healthcheck.
      source: "/((?!api|_next/static|_next/image|internal|favicon.ico).*)",
      // Link prefetches return data, not a page; they need no nonce.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
