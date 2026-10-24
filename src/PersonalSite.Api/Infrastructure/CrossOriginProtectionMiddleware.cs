namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// CSRF defence in depth (P5-T3, architecture.md §5.5): rejects an unsafe request (POST, PUT, PATCH, DELETE) that a
/// browser sends on behalf of another site. The first defence is the admin cookie's <c>SameSite=Strict</c>; this
/// one doesn't depend on cookie rules, so it also covers browsers or future endpoints where they don't apply.
/// </summary>
/// <remarks>
/// The same algorithm as Go's <c>http.CrossOriginProtection</c>:
/// <list type="number">
/// <item><c>Sec-Fetch-Site</c> (sent by every current browser, and a header page scripts can't set): only
/// <c>same-origin</c> and <c>none</c> (typed or bookmarked by the user) pass. <c>same-site</c> fails too: another
/// subdomain is another origin.</item>
/// <item>No <c>Sec-Fetch-Site</c> but an <c>Origin</c> (older browsers): it must equal this request's scheme and host.
/// Behind the edge both are the public ones (forwarded scheme, Host passed through).</item>
/// <item>Neither header: not a browser — the Next.js server, curl, a test. Such a client holds no victim's cookies,
/// so there is nothing to forge, and it passes. Requiring <c>Origin</c> here would only break server-side calls.</item>
/// </list>
/// </remarks>
public sealed class CrossOriginProtectionMiddleware(RequestDelegate next)
{
    public const string FetchSiteHeader = "Sec-Fetch-Site";

    public async Task InvokeAsync(HttpContext context)
    {
        if (IsSafeMethod(context.Request.Method) || IsSameOrigin(context.Request))
        {
            await next(context);
            return;
        }

        await context.WriteProblemAsync(
            StatusCodes.Status403Forbidden, "Cross-origin request rejected.", ErrorCodes.CrossOriginRequest);
    }

    // Safe methods must not change state (rules.md §8), so a forged GET can't do harm and needs no check.
    private static bool IsSafeMethod(string method) =>
        HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method) || HttpMethods.IsTrace(method);

    private static bool IsSameOrigin(HttpRequest request)
    {
        var fetchSite = request.Headers[FetchSiteHeader].ToString();
        if (fetchSite.Length > 0)
        {
            return fetchSite is "same-origin" or "none";
        }

        var origin = request.Headers.Origin.ToString();
        if (origin.Length == 0)
        {
            return true;
        }

        // "null" (sandboxed frames, some redirects) is not a URL and fails here.
        return Uri.TryCreate(origin, UriKind.Absolute, out var uri)
            && string.Equals(uri.Scheme, request.Scheme, StringComparison.OrdinalIgnoreCase)
            && string.Equals(uri.Authority, request.Host.Value, StringComparison.OrdinalIgnoreCase);
    }
}
