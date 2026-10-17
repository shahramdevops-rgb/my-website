namespace PersonalSite.Web.Infrastructure;

/// <summary>
/// Adds the Content-Security-Policy header to every response. Baseline policy (P1-T7): scripts, styles, fonts and
/// images only from our own origin — no <c>unsafe-eval</c>, no <c>unsafe-inline</c>, so an injected
/// <c>&lt;script&gt;</c> does not run. Our own inline scripts are allowed by hash (<see cref="InlineScripts"/>).
/// Hardened and audited in P12-T1.
/// </summary>
/// <remarks>
/// Set before the rest of the pipeline runs, not in Response.OnStarting: the developer exception page clears the
/// response headers, so its own inline scripts keep working. The exception handler re-executes the pipeline,
/// so the production error page gets the header again.
/// </remarks>
public sealed class SecurityHeadersMiddleware(RequestDelegate next, IHostEnvironment environment)
{
    private static readonly string _basePolicy =
        $"default-src 'self'; script-src 'self' {InlineScripts.CspHashes}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

    // Development: `dotnet watch` reloads the browser through a WebSocket on its own localhost port.
    private const string _developmentConnectSrc = "; connect-src 'self' ws://localhost:* wss://localhost:*";

    private readonly string _policy = environment.IsDevelopment() ? _basePolicy + _developmentConnectSrc : _basePolicy;

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.ContentSecurityPolicy = _policy;
        return next(context);
    }
}
