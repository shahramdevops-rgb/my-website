using System.Text.RegularExpressions;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Pages;

/// <summary>Shared layout: landmarks, skip link, menu, footer (P1-T5).</summary>
public sealed partial class LayoutTests(WebAppFactory factory)
{
    private async Task<string> GetHomeAsync()
    {
        using var client = factory.CreateClient();
        return await client.GetStringAsync(new Uri("/fa", UriKind.Relative), TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task GetHome_Layout_HasSkipLinkAndLandmarks()
    {
        var html = await GetHomeAsync();

        // The skip link is the first link on the page and points at <main>.
        LinkHref().Match(html).Groups["href"].Value.ShouldBe("#main");
        html.ShouldContain("<header");
        html.ShouldContain("<nav aria-label=\"منوی اصلی\"");
        html.ShouldContain("<main id=\"main\" tabindex=\"-1\"");
        html.ShouldContain("<footer");
    }

    [Fact]
    public async Task GetHome_Menu_MarksCurrentPage()
    {
        var html = await GetHomeAsync();

        html.ShouldContain("""<a href="/fa" aria-current="page" """.TrimEnd());
    }

    [Fact]
    public async Task GetHome_Footer_ShowsConfiguredContactLinks()
    {
        var html = await GetHomeAsync();

        html.ShouldContain("href=\"mailto:hello@example.test\"");
        html.ShouldContain("href=\"https://github.com/example\"");
        html.ShouldContain("href=\"https://t.me/example\"");
    }

    [Fact]
    public async Task GetHome_Copyright_UsesPersianYear()
    {
        var html = await GetHomeAsync();

        PersianYearCopyright().IsMatch(html).ShouldBeTrue("footer should show © and a year in Persian digits");
    }

    [Fact]
    public async Task GetHome_WithoutJs_IsDarkAndHidesThemeToggle()
    {
        var html = await GetHomeAsync();

        // What a visitor without JS gets: the dark theme, and no toggle that couldn't do anything.
        html.ShouldContain("data-theme=\"dark\"");
        ThemeToggleTag().Match(html).Value.ShouldContain("invisible");
    }

    [Fact]
    public async Task GetHome_AllUiText_ComesFromResx()
    {
        var html = await GetHomeAsync();

        // A missing resx entry renders its key (e.g. "Nav.About") instead of failing — catch that here.
        ResxKey().Matches(html).Select(m => m.Value).ShouldBeEmpty();
    }

    [GeneratedRegex("""<a href="(?<href>[^"]*)" """)]
    private static partial Regex LinkHref();

    [GeneratedRegex(@"<button[^>]*x-data=""themeToggle""[^>]*>")]
    private static partial Regex ThemeToggleTag();

    [GeneratedRegex("© [۰-۹]{4} ")]
    private static partial Regex PersianYearCopyright();

    [GeneratedRegex(@"\b(?:Site|Layout|Nav|Footer|Home|Error|Format|Time|Blog|Theme)\.[A-Z]\w*")]
    private static partial Regex ResxKey();
}
