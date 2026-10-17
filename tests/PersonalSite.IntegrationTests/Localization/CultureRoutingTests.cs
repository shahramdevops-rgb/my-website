using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Localization;

/// <summary>Culture-prefixed URLs (ADR-006, architecture.md §5.4 and §6).</summary>
public sealed class CultureRoutingTests(WebAppFactory factory)
{
    // Redirects are asserted, not followed.
    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    [Fact]
    public async Task GetRoot_NoLanguagePreference_RedirectsToDefaultCulture()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync(new Uri("/", UriKind.Relative), TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.Found);
        response.Headers.Location.ShouldBe(new Uri("/fa", UriKind.Relative));
    }

    [Fact]
    public async Task GetRoot_UnsupportedBrowserLanguage_RedirectsToDefaultCulture()
    {
        using var client = CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/", UriKind.Relative));
        request.Headers.AcceptLanguage.ParseAdd("en-US,en;q=0.9");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.Found);
        response.Headers.Location.ShouldBe(new Uri("/fa", UriKind.Relative));
    }

    [Theory]
    [InlineData("/en")]
    [InlineData("/en/about")]
    [InlineData("/xx")]
    public async Task GetPage_UnsupportedCulturePrefix_ReturnsNotFound(string path)
    {
        using var client = CreateClient();

        using var response = await client.GetAsync(new Uri(path, UriKind.Relative), TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetHome_PersianCulture_RendersRtlPageWithLocalizedText()
    {
        using var client = CreateClient();

        using var response = await client.GetAsync(new Uri("/fa", UriKind.Relative), TestContext.Current.CancellationToken);
        var html = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentLanguage.ShouldBe(["fa"]);
        html.ShouldContain("""<html lang="fa" dir="rtl" """);
        // Proves the resx is found: without it the localizer would print the key itself.
        html.ShouldNotContain("Home.ComingSoon");
        html.ShouldContain("به‌زودی");
    }
}
