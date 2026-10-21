using System.Net;
using System.Text.Json;
using PersonalSite.Api.Infrastructure;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Site;

public sealed class SiteEndpointsTests(WebAppFactory factory)
{
    private static readonly Uri _siteUri = new(Routes.Api + Routes.Site, UriKind.Relative);

    [Fact]
    public async Task GetSite_Configured_ReturnsNamesSocialLinksAndFlags()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(_siteUri, TestContext.Current.CancellationToken);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));

        // Read as raw JSON on purpose: the property names are the contract the front-end's types are built from.
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var root = body.RootElement;
        root.GetProperty("name").GetProperty("fa").GetString().ShouldBe("مهدی ازقندی");
        root.GetProperty("name").GetProperty("en").GetString().ShouldBe("Mahdi Azghandi");
        root.GetProperty("social").GetProperty("email").GetString().ShouldBe(WebAppFactory.SocialEmail);
        root.GetProperty("social").GetProperty("gitHub").GetString().ShouldBe(WebAppFactory.SocialGitHub);
        root.GetProperty("social").GetProperty("telegram").GetString().ShouldBe(WebAppFactory.SocialTelegram);
        root.GetProperty("features").GetProperty("newsletterSignup").GetBoolean().ShouldBe(WebAppFactory.NewsletterSignupEnabled);
        root.GetProperty("features").GetProperty("semanticSearch").GetBoolean().ShouldBe(WebAppFactory.SemanticSearchEnabled);
    }

    [Fact]
    public async Task GetUnknownApiPath_Always_ReturnsProblemDetails404()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(Routes.Api + "/does-not-exist", UriKind.Relative), TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }
}
