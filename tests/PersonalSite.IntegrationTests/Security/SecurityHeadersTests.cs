using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Security;

/// <summary>Baseline Content-Security-Policy (P1-T7; hardened in P12-T1).</summary>
public sealed class SecurityHeadersTests(WebAppFactory factory)
{
    [Fact]
    public async Task GetHome_ContentSecurityPolicy_AllowsOnlyOwnOriginAndNoEval()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri("/fa", UriKind.Relative), TestContext.Current.CancellationToken);

        response.Headers.TryGetValues("Content-Security-Policy", out var values).ShouldBeTrue();
        var policy = values.ShouldHaveSingleItem();
        policy.ShouldContain("default-src 'self'");
        policy.ShouldContain("object-src 'none'");
        policy.ShouldContain("frame-ancestors 'none'");
        // Alpine runs as its CSP build precisely so that neither of these is ever needed.
        policy.ShouldNotContain("unsafe-eval");
        policy.ShouldNotContain("unsafe-inline");
    }
}
