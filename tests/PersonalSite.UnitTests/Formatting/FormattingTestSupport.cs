using System.Globalization;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PersonalSite.Web;
using PersonalSite.Web.Configuration;
using PersonalSite.Web.Formatting;

namespace PersonalSite.UnitTests.Formatting;

/// <summary>Builds the formatters the way the app does: real resx strings, a fixed clock, a chosen culture.</summary>
internal static class FormattingTestSupport
{
    public static IStringLocalizer<SharedResource> Localizer { get; } = new StringLocalizer<SharedResource>(
        new ResourceManagerStringLocalizerFactory(
            Options.Create(new LocalizationOptions { ResourcesPath = "Resources" }),
            NullLoggerFactory.Instance));

    public static DateDisplay CreateDateDisplay(DateTimeOffset utcNow) => new(
        new FixedTimeProvider(utcNow),
        Options.Create(new SiteOptions { BaseUrl = new Uri("https://example.test") }),
        Localizer);

    /// <summary>
    /// Sets the request culture (as RequestLocalization does) and restores the previous one on Dispose,
    /// so a test can't leak its culture into another test that runs on the same thread later.
    /// </summary>
    public static IDisposable UseCulture(string name)
    {
        var (culture, uiCulture) = (CultureInfo.CurrentCulture, CultureInfo.CurrentUICulture);
        CultureInfo.CurrentCulture = CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo(name);
        return new Restore(() => (CultureInfo.CurrentCulture, CultureInfo.CurrentUICulture) = (culture, uiCulture));
    }

    private sealed class Restore(Action restore) : IDisposable
    {
        public void Dispose() => restore();
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
