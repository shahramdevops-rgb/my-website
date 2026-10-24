namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Security headers for every API response. The API serves JSON (and a few plain-text files), never HTML pages, so
/// its Content-Security-Policy allows nothing at all: if a response were ever rendered as a page (e.g. opened
/// directly in a browser), no script, style or frame could load from it. HTML pages and their nonce-based CSP are
/// the front-end's job (ADR-025, P2-T7). <c>nosniff</c> stops browsers from guessing a different content type.
/// Responses about the admin session (<c>/api/auth/*</c>, later <c>/api/admin/*</c>) also get
/// <c>Cache-Control: no-store</c>: no browser, proxy or Next.js data cache may keep a copy of them.
/// </summary>
/// <remarks>
/// Set before the rest of the pipeline runs, not in Response.OnStarting: the developer exception page clears the
/// response headers, so its own inline scripts keep working in Development. Decided by path, not by endpoint, so
/// a 401 written by the authorization middleware (before any endpoint code) carries the header too.
/// </remarks>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    private const string _policy = "default-src 'none'; frame-ancestors 'none'";

    private static readonly PathString _auth = Routes.Api + Routes.Auth;

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.ContentSecurityPolicy = _policy;
        context.Response.Headers.XContentTypeOptions = "nosniff";

        if (context.Request.Path.StartsWithSegments(_auth))
        {
            context.Response.Headers.CacheControl = "no-store";
        }

        return next(context);
    }
}
