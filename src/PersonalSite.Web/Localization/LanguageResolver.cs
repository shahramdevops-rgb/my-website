using Microsoft.Extensions.Options;
using PersonalSite.Web.Configuration;

namespace PersonalSite.Web.Localization;

/// <summary>Picks the language for a request that has none in its URL (only <c>/</c> today).</summary>
public interface ILanguageResolver
{
    /// <returns>A supported culture name, e.g. <c>fa</c>.</returns>
    string Resolve(HttpRequest request);
}

/// <summary>
/// Order (architecture.md §5.4): the <c>lang</c> cookie (explicit choice) → <c>Accept-Language</c> (browser
/// setting) → the default. A GeoIP step slots in between the first two in P14.
/// </summary>
public sealed class LanguageResolver(IOptions<CultureOptions> options) : ILanguageResolver
{
    /// <summary>Set by the language switcher (P1-T11).</summary>
    public const string CookieName = "lang";

    public string Resolve(HttpRequest request)
    {
        var cultures = options.Value;

        if (request.Cookies.TryGetValue(CookieName, out var cookie) && cultures.IsSupported(cookie))
        {
            return Canonical(cookie);
        }

        // Highest quality first; "fa-IR" counts as "fa". Header values are client input, so only names on our
        // own list can come back from here.
        var fromHeader = request.GetTypedHeaders().AcceptLanguage
            .Where(language => language.Quality is not 0)
            .OrderByDescending(language => language.Quality ?? 1)
            .Select(language => language.Value.Value ?? string.Empty)
            .Select(name => cultures.IsSupported(name) ? name : name.Split('-')[0])
            .FirstOrDefault(cultures.IsSupported);

        return Canonical(fromHeader ?? cultures.DefaultCulture);

        // The configured spelling (e.g. "fa", not "FA"), so redirects always produce the same URL.
        string Canonical(string culture) =>
            cultures.SupportedCultures.First(supported => supported.Equals(culture, StringComparison.OrdinalIgnoreCase));
    }
}
