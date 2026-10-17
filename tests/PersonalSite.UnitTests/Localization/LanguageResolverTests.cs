using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using PersonalSite.Web.Configuration;
using PersonalSite.Web.Localization;

namespace PersonalSite.UnitTests.Localization;

/// <summary>
/// Uses two cultures although the site has only "fa" today: with a single language every rule would give the same
/// answer, so the order cookie → Accept-Language → default could not be observed.
/// </summary>
public sealed class LanguageResolverTests
{
    private readonly LanguageResolver _resolver = new(Options.Create(new CultureOptions
    {
        SupportedCultures = ["fa", "en"],
        DefaultCulture = "fa",
    }));

    [Fact]
    public void Resolve_NoCookieNoHeader_ReturnsDefault()
    {
        _resolver.Resolve(Request()).ShouldBe("fa");
    }

    [Fact]
    public void Resolve_SupportedCookie_WinsOverHeader()
    {
        _resolver.Resolve(Request(cookie: "en", acceptLanguage: "fa-IR")).ShouldBe("en");
    }

    [Fact]
    public void Resolve_UnsupportedCookie_FallsBackToHeader()
    {
        _resolver.Resolve(Request(cookie: "de", acceptLanguage: "en-US")).ShouldBe("en");
    }

    [Theory]
    [InlineData("en-US,en;q=0.9", "en")]          // region is ignored: en-US → en
    [InlineData("de-DE,fa;q=0.5,en;q=0.8", "en")] // highest-quality supported language wins
    [InlineData("en;q=0,fa;q=0.1", "fa")]         // q=0 means "not acceptable"
    [InlineData("de,fr", "fa")]                   // nothing supported → default
    [InlineData("EN", "en")]                      // canonical spelling from configuration
    public void Resolve_AcceptLanguageHeader_PicksBestSupported(string header, string expected)
    {
        _resolver.Resolve(Request(acceptLanguage: header)).ShouldBe(expected);
    }

    private static HttpRequest Request(string? cookie = null, string? acceptLanguage = null)
    {
        var context = new DefaultHttpContext();
        if (cookie is not null)
        {
            context.Request.Headers.Cookie = $"{LanguageResolver.CookieName}={cookie}";
        }

        if (acceptLanguage is not null)
        {
            context.Request.Headers.AcceptLanguage = acceptLanguage;
        }

        return context.Request;
    }
}
