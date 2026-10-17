namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Container healthcheck client, run as <c>dotnet PersonalSite.Api.dll --healthcheck</c>.
/// The chiseled runtime image has no shell, curl or wget, so the app binary probes its own
/// <c>/health</c> endpoint and reports through the exit code (0 = healthy, 1 = unhealthy).
/// </summary>
public static class HealthProbe
{
    public const string Argument = "--healthcheck";

    public static async Task<int> RunAsync()
    {
        // ASPNETCORE_HTTP_PORTS is set to 8080 by the official images; it may list several ports ("8080;8081").
        var port = Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS")?.Split(';')[0] ?? "8080";
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };

        try
        {
            using var response = await client.GetAsync(new Uri($"http://localhost:{port}{Routes.Health}"));
            return response.IsSuccessStatusCode ? 0 : 1;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return 1;
        }
    }
}
