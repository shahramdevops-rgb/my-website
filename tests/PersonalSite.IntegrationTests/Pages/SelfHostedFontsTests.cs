using System.Net;
using System.Text.RegularExpressions;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Pages;

/// <summary>Fonts never leave the site's origin (ADR-007, P1-T2).</summary>
public sealed partial class SelfHostedFontsTests(WebAppFactory factory)
{
    [Fact]
    public async Task GetStylesheet_FontFaces_PointToServedSameOriginFiles()
    {
        using var client = factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;
        var (cssUri, fontUris, _) = await LoadAsync(client, ct);

        fontUris.ShouldNotBeEmpty($"{cssUri} declares no font URLs");
        foreach (var fontUri in fontUris)
        {
            fontUri.Host.ShouldBe(client.BaseAddress!.Host, $"{fontUri} leaves the site's origin");

            using var response = await client.GetAsync(fontUri, ct);

            response.StatusCode.ShouldBe(HttpStatusCode.OK, fontUri.ToString());
            response.Content.Headers.ContentType?.MediaType.ShouldBe("font/woff2");
        }
    }

    [Fact]
    public async Task GetHome_FontPreload_MatchesAFontFaceUrl()
    {
        using var client = factory.CreateClient();
        var (_, fontUris, preloadUris) = await LoadAsync(client, TestContext.Current.CancellationToken);

        // A preload URL that differs from the @font-face URL makes the browser download the font twice.
        preloadUris.ShouldNotBeEmpty();
        preloadUris.ShouldAllBe(uri => fontUris.Contains(uri));
    }

    private static async Task<(Uri Css, Uri[] Fonts, Uri[] Preloads)> LoadAsync(HttpClient client, CancellationToken ct)
    {
        var pageUri = new Uri(client.BaseAddress!, "/fa");
        var html = await client.GetStringAsync(pageUri, ct);

        var cssMatch = StylesheetHref().Match(html);
        cssMatch.Success.ShouldBeTrue("layout should link /css/app.css");
        var cssUri = new Uri(pageUri, cssMatch.Groups["href"].Value);
        var css = await client.GetStringAsync(cssUri, ct);

        // url(...) inside the CSS resolves against the stylesheet's own URL, exactly as a browser does.
        Uri[] fonts = [.. CssUrl().Matches(css).Select(m => new Uri(cssUri, m.Groups["url"].Value)).Distinct()];
        Uri[] preloads = [.. FontPreloadHref().Matches(html).Select(m => new Uri(pageUri, m.Groups["href"].Value))];

        return (cssUri, fonts, preloads);
    }

    [GeneratedRegex(@"<link rel=""stylesheet"" href=""(?<href>/css/app[^""]*)""")]
    private static partial Regex StylesheetHref();

    [GeneratedRegex(@"<link rel=""preload"" href=""(?<href>[^""]+)"" as=""font""")]
    private static partial Regex FontPreloadHref();

    [GeneratedRegex(@"url\([""']?(?<url>[^""')]+)[""']?\)")]
    private static partial Regex CssUrl();
}
