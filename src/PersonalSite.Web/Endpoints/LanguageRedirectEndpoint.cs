using Microsoft.Net.Http.Headers;
using PersonalSite.Web.Localization;

namespace PersonalSite.Web.Endpoints;

public static class LanguageRedirectEndpoint
{
    /// <summary>
    /// <c>/</c> has no content of its own: it sends the visitor to their language's home, e.g. <c>/fa</c>.
    /// 302 (temporary), because the answer depends on the visitor and may change once English exists.
    /// </summary>
    public static IEndpointRouteBuilder MapLanguageRedirect(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/", (HttpContext context, ILanguageResolver resolver) =>
        {
            // The target depends on these request headers: shared caches must not reuse one visitor's redirect for another.
            context.Response.Headers.Append(HeaderNames.Vary, $"{HeaderNames.Cookie}, {HeaderNames.AcceptLanguage}");
            return Results.Redirect($"/{resolver.Resolve(context.Request)}");
        });

        return endpoints;
    }
}
