using System.Net;
using System.Text.RegularExpressions;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Pages;

/// <summary>The Tailwind output is built, linked from the layout and served (P1-T1).</summary>
public sealed partial class StylesheetTests(WebAppFactory factory)
{
    [Fact]
    public async Task GetHome_StylesheetLinked_ServesCompiledTailwindCss()
    {
        using var client = factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;

        var html = await client.GetStringAsync(new Uri("/", UriKind.Relative), ct);
        var match = StylesheetHref().Match(html);
        match.Success.ShouldBeTrue("layout should link /css/app.css");

        using var response = await client.GetAsync(new Uri(match.Groups["href"].Value, UriKind.Relative), ct);
        var css = await response.Content.ReadAsStringAsync(ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("text/css");
        css.ShouldContain("--color-surface");
    }

    [GeneratedRegex(@"<link rel=""stylesheet"" href=""(?<href>/css/app[^""]*)""")]
    private static partial Regex StylesheetHref();
}
