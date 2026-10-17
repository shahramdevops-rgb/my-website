using System.Net;
using PersonalSite.Api.Infrastructure;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Health;

public sealed class HealthEndpointsTests(WebAppFactory factory)
{
    [Fact]
    public async Task GetHealth_AppRunning_ReturnsOk()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(Routes.Health, UriKind.Relative), TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetHealthReady_DatabaseReachable_ReportsDatabaseHealthy()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(Routes.HealthReady, UriKind.Relative), TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        body.ShouldContain("\"database\":\"Healthy\"");
    }
}
