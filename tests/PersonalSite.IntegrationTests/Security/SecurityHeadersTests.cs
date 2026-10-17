using System.Net;
using PersonalSite.Api.Infrastructure;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Security;

/// <summary>API security headers and error format (P2-T1). HTML pages get their CSP from the front-end (ADR-025).</summary>
public sealed class SecurityHeadersTests(WebAppFactory factory)
{
    [Fact]
    public async Task GetHealth_Always_SendsLockedDownPolicyAndNoSniff()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(Routes.Health, UriKind.Relative), TestContext.Current.CancellationToken);

        response.Headers.TryGetValues("Content-Security-Policy", out var policies).ShouldBeTrue();
        policies.ShouldHaveSingleItem().ShouldBe("default-src 'none'; frame-ancestors 'none'");
        response.Headers.TryGetValues("X-Content-Type-Options", out var sniff).ShouldBeTrue();
        sniff.ShouldHaveSingleItem().ShouldBe("nosniff");
    }

    [Fact]
    public async Task GetUnknownPath_NoEndpoint_ReturnsProblemDetails404()
    {
        using var client = factory.CreateClient();

        // The old Razor home page: the API no longer serves HTML pages.
        using var response = await client.GetAsync(new Uri("/fa", UriKind.Relative), TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }
}
