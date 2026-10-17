using System.Net.Mime;
using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using PersonalSite.Web.Infrastructure;

namespace PersonalSite.Web.Endpoints;

public static class HealthEndpoints
{
    /// <summary>
    /// <c>/health</c> = liveness: "is the process up?" It runs no checks, so a database outage doesn't make
    /// Docker restart a healthy web container. <c>/health/ready</c> = readiness: "can it do real work?"
    /// It runs every registered check (today: the database) and returns 503 if any is unhealthy.
    /// </summary>
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks(Routes.Health, new HealthCheckOptions { Predicate = _ => false });
        endpoints.MapHealthChecks(Routes.HealthReady, new HealthCheckOptions { ResponseWriter = WriteReportAsync });

        return endpoints;
    }

    /// <summary>
    /// Writes <c>{"status":"Healthy","checks":{"database":"Healthy"}}</c>. Only names and statuses:
    /// exception details could leak connection info, so they stay in the logs.
    /// </summary>
    private static Task WriteReportAsync(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = MediaTypeNames.Application.Json;

        var body = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.ToDictionary(entry => entry.Key, entry => entry.Value.Status.ToString()),
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(body), context.RequestAborted);
    }
}
