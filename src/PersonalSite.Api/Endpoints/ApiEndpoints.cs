using PersonalSite.Api.Infrastructure;

namespace PersonalSite.Api.Endpoints;

public static class ApiEndpoints
{
    /// <summary>
    /// Maps every feature endpoint under <c>/api</c>. Conventions set on the group apply to all of them:
    /// any endpoint can fail with a 500, which the exception handler answers with ProblemDetails, so the
    /// document says so once here instead of on each endpoint.
    /// </summary>
    public static IEndpointRouteBuilder MapApiEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var api = endpoints.MapGroup(Routes.Api)
            .ProducesProblem(StatusCodes.Status500InternalServerError);

        api.MapSiteEndpoints();
        api.MapResumeEndpoints();
        api.MapAuthEndpoints();

        return endpoints;
    }
}
