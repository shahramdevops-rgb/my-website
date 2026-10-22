import { type NextRequest, NextResponse } from "next/server";
import { hasLocale } from "next-intl";
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
  const response =
    request.nextUrl.pathname === "/" ? redirectToLocale(request) : renderPage(request);

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
 * A page view, with a new nonce. Next.js reads the policy from the *request* headers while rendering and puts
 * the nonce on every script it emits; the browser reads it from the *response* headers and runs only those.
 *
 * A path whose first segment is no language (/de, /de/about) is rewritten — the URL in the address bar stays —
 * to the same path under the visitor's language (/en/de/about). That path matches no page, so app/[locale]/
 * [...rest] answers 404 with the localized not-found page. Without the rewrite, /de reaches [locale] itself,
 * whose 404 comes from the root layout and has an empty body. New top-level routes outside [locale]
 * (sitemap.xml, robots.txt, admin) must be excluded here or in `config.matcher`.
 */
function renderPage(request: NextRequest): NextResponse {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, {
    isDev: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  // Our own inline script (the pre-paint theme script) reads the nonce from here.
  requestHeaders.set(nonceHeaderName, nonce);

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
