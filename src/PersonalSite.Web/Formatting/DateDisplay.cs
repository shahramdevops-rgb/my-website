using System.Globalization;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using PersonalSite.Web.Configuration;

namespace PersonalSite.Web.Formatting;

/// <summary>
/// Turns a stored UTC instant into text for the current request culture: UTC → site time zone (Tehran) →
/// the culture's calendar (fa: Persian/Solar Hijri) → the culture's digits. The only place dates become text
/// (architecture.md §4: UTC everywhere, Persian calendar only in the view layer).
/// Patterns and phrases come from resx (Format.*, Time.*), so English later is a translation, not code.
/// </summary>
public sealed class DateDisplay(TimeProvider timeProvider, IOptions<SiteOptions> siteOptions, IStringLocalizer<SharedResource> localizer)
{
    private readonly TimeZoneInfo _timeZone = TimeZoneInfo.FindSystemTimeZoneById(siteOptions.Value.TimeZone);

    // Older than this, a relative text ("40 days ago") is less useful than the date itself.
    private static readonly TimeSpan _relativeLimit = TimeSpan.FromDays(30);

    /// <summary>The same instant as wall-clock time in the site's time zone.</summary>
    public DateTimeOffset ToSiteTime(DateTimeOffset value) => TimeZoneInfo.ConvertTime(value, _timeZone);

    /// <summary>fa: <c>۱ فروردین ۱۴۰۵</c>.</summary>
    public string FormatDate(DateTimeOffset value) => Format(value, localizer["Format.Date"]);

    /// <summary>The current year in the site time zone and culture calendar, e.g. fa: <c>۱۴۰۵</c> (footer copyright).</summary>
    public string FormatCurrentYear() => Format(timeProvider.GetUtcNow(), "yyyy");

    /// <summary>fa: <c>۱ فروردین ۱۴۰۵، ۰۰:۰۱</c>.</summary>
    public string FormatDateTime(DateTimeOffset value) => Format(value, localizer["Format.DateTime"]);

    /// <summary>
    /// fa: <c>همین الان</c>, <c>۵ دقیقه پیش</c>, <c>۳ ساعت پیش</c>, <c>۳ روز پیش</c>; after 30 days (or for a future
    /// value) the plain date. Relative text ages: on output-cached pages it is only as fresh as the cache entry.
    /// </summary>
    public string FormatRelative(DateTimeOffset value)
    {
        var elapsed = timeProvider.GetUtcNow() - value;

        return elapsed switch
        {
            { Ticks: < 0 } => FormatDate(value),
            { TotalMinutes: < 1 } => localizer["Time.JustNow"],
            { TotalHours: < 1 } => Phrase("Time.MinutesAgo", elapsed.Minutes),
            { TotalDays: < 1 } => Phrase("Time.HoursAgo", elapsed.Hours),
            _ when elapsed < _relativeLimit => Phrase("Time.DaysAgo", elapsed.Days),
            _ => FormatDate(value),
        };
    }

    private string Format(DateTimeOffset value, string pattern)
    {
        var culture = CultureInfo.CurrentCulture;
        return NativeDigits.Apply(ToSiteTime(value).ToString(pattern, culture), culture);
    }

    private string Phrase(string key, int count) =>
        localizer[key, NativeDigits.Apply(count.ToString(CultureInfo.CurrentCulture), CultureInfo.CurrentCulture)];
}
