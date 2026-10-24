namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Stable <c>code</c> values in ProblemDetails responses (rules.md §8). The front-end maps them to localized
/// messages, so they never change once released; the <c>title</c> next to them is for developers only.
/// </summary>
public static class ErrorCodes
{
    /// <summary>The ProblemDetails extension member that carries the code.</summary>
    public const string Member = "code";

    /// <summary>Wrong email or password, a locked account, or not an admin: one answer for all, nothing to probe.</summary>
    public const string InvalidCredentials = "auth.invalid_credentials";

    /// <summary>An unsafe request (POST, PUT, ...) started by another site (CSRF defence).</summary>
    public const string CrossOriginRequest = "request.cross_origin";

    /// <summary>A rate-limit policy rejected the request; <c>Retry-After</c> says when to try again.</summary>
    public const string RateLimited = "request.rate_limited";

    /// <summary>
    /// Answers outside an endpoint (middleware) with a ProblemDetails body carrying <paramref name="code"/>, in the
    /// same format the endpoints and <c>UseStatusCodePages</c> produce.
    /// </summary>
    public static async Task WriteProblemAsync(this HttpContext context, int status, string title, string code)
    {
        context.Response.StatusCode = status;
        await context.RequestServices.GetRequiredService<IProblemDetailsService>().WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = { Status = status, Title = title, Extensions = { [Member] = code } },
        });
    }
}
