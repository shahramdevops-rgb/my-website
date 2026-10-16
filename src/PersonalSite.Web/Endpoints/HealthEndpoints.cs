using PersonalSite.Web.Infrastructure;

namespace PersonalSite.Web.Endpoints;

public static class HealthEndpoints
{
    /// <summary>
    /// Liveness check: "is the process up and serving requests?" It deliberately checks no dependencies,
    /// so a database outage doesn't make Docker restart a healthy web container. The DB check goes to
    /// <c>/health/ready</c> in P0-T5.
    /// </summary>
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks(Routes.Health);

        return endpoints;
    }
}
