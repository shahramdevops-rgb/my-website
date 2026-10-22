// Security headers for every HTML response (ADR-025). The API sets its own, stricter set (SecurityHeadersMiddleware).

/** A fresh, unguessable value per request: 128 random bits, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * The Content-Security-Policy for one page view. Scripts run only if they carry this request's nonce
 * ('strict-dynamic' then trusts what those scripts load, so Next's chunk loading works without listing files).
 * No 'unsafe-inline' and no 'unsafe-eval' for scripts in production.
 */
export function contentSecurityPolicy(nonce: string, { isDev }: { isDev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Development only: React uses eval() to rebuild server error stacks in the browser.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Inline style attributes (Next, Motion) are allowed; styles cannot run code.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    // Development only: the hot-reload WebSocket.
    "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** Headers that don't change per request. */
export const staticSecurityHeaders: Readonly<Record<string, string>> = {
  // Never guess a different content type than the one we send.
  "X-Content-Type-Options": "nosniff",
  // Other sites see only our origin, never the full URL (which may hold a slug or query).
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Browser features the site never uses are switched off, so injected code can't use them either.
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
};
