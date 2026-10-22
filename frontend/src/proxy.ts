import { type NextRequest, NextResponse } from "next/server";
import { localeCookieName } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { contentSecurityPolicy, createNonce, staticSecurityHeaders } from "@/lib/security/headers";

// Next.js 16 request hook (was "middleware"): runs before every page request (see `config.matcher`).
export function proxy(request: NextRequest) {
  const response =
    request.nextUrl.pathname === "/"
      ? redirectToLocale(request)
      : withContentSecurityPolicy(request);

  for (const [name, value] of Object.entries(staticSecurityHeaders)) {
    response.headers.set(name, value);
  }
  return response;
}

/** `/` has no language: send the visitor to theirs (architecture.md §5.4). */
function redirectToLocale(request: NextRequest): NextResponse {
  const locale = resolveLocale(
    request.cookies.get(localeCookieName)?.value,
    request.headers.get("accept-language"),
  );

  // 302, not 301: the answer depends on the visitor, so browsers and proxies must not remember it.
  const response = NextResponse.redirect(new URL(`/${locale}`, request.url), 302);
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

/**
 * A new nonce for this page view. Next.js reads the policy from the *request* headers while rendering and puts
 * the nonce on every script it emits; the browser reads it from the *response* headers and runs only those.
 */
function withContentSecurityPolicy(request: NextRequest): NextResponse {
  const policy = contentSecurityPolicy(createNonce(), {
    isDev: process.env.NODE_ENV === "development",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
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
