using PersonalSite.Api.Configuration;
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

        // Every admin endpoint is mapped inside this group, so the policy is never forgotten on one of them; the
        // UI's login redirect is only convenience (architecture.md §5.2). A test lists the group's endpoints from
        // the routing table and calls each anonymously (P5-T4).
        var admin = api.MapGroup(Routes.Admin)
            .RequireAuthorization(AuthorizationPolicies.Admin)
            .WithTags("Admin")
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        admin.MapAdminDashboardEndpoints();

        return endpoints;
    }
}
