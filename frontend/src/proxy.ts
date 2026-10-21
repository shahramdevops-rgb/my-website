import { type NextRequest, NextResponse } from "next/server";
import { localeCookieName } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

// Next.js 16 request hook (was "middleware"). Today it only answers `/`; P2-T7 adds the CSP nonce here.
export function proxy(request: NextRequest) {
  const locale = resolveLocale(
    request.cookies.get(localeCookieName)?.value,
    request.headers.get("accept-language"),
  );

  // 302, not 301: the answer depends on the visitor, so browsers and proxies must not remember it.
  const response = NextResponse.redirect(new URL(`/${locale}`, request.url), 302);
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

export const config = {
  matcher: "/",
};
