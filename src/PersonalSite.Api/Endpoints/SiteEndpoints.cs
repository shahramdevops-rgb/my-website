using Microsoft.AspNetCore.Http.HttpResults;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Application.Site;

namespace PersonalSite.Api.Endpoints;

public static class SiteEndpoints
{
    /// <summary><c>GET /api/site</c>: site name, contact links and public feature flags for the front-end shell.</summary>
    public static IEndpointRouteBuilder MapSiteEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(Routes.Site, GetSiteAsync)
            .WithName("GetSite")
            .WithTags("Site")
            .WithSummary("Site name, contact links and public feature flags.");

        return endpoints;
    }

    // Ok<T> in the return type is what puts the 200 response and its schema into the OpenAPI document.
    private static async Task<Ok<SiteInfoDto>> GetSiteAsync(SiteInfoService site, CancellationToken ct) =>
        TypedResults.Ok(await site.GetAsync(ct));
}
