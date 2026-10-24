using Microsoft.AspNetCore.Http.HttpResults;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Application.Admin;

namespace PersonalSite.Api.Endpoints;

public static class AdminDashboardEndpoints
{
    /// <summary><c>GET /api/admin/dashboard</c>: the counts on the admin panel's start page.</summary>
    public static IEndpointRouteBuilder MapAdminDashboardEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(Routes.Dashboard, GetDashboardAsync)
            .WithName("GetAdminDashboard")
            .WithSummary("Counts for the admin dashboard.");

        return endpoints;
    }

    private static async Task<Ok<AdminDashboardDto>> GetDashboardAsync(AdminDashboardService dashboard, CancellationToken ct) =>
        TypedResults.Ok(await dashboard.GetAsync(ct));
}
