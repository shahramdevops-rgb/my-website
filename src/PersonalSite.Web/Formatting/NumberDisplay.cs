using System.Globalization;
using Microsoft.Extensions.Localization;

namespace PersonalSite.Web.Formatting;

/// <summary>
/// Numbers for the current request culture: its separators (fa: ۱٬۲۳۴٫۵) and its digits (see <see cref="NativeDigits"/>).
/// </summary>
public sealed class NumberDisplay(IStringLocalizer<SharedResource> localizer)
{
    /// <param name="value">Any number (int, long, decimal, double…).</param>
    /// <param name="format">A .NET numeric format, e.g. <c>N0</c> (default: grouped, no decimals) or <c>N1</c>.</param>
    public string Format<T>(T value, string format = "N0")
        where T : IFormattable
    {
        var culture = CultureInfo.CurrentCulture;
        return NativeDigits.Apply(value.ToString(format, culture), culture);
    }

    /// <summary>
    /// fa: <c>۵ دقیقه مطالعه</c>. Never shows 0 — a very short post still takes a minute. Computing the minutes
    /// from the text is the blog's job (P6); this only displays them.
    /// </summary>
    public string FormatReadingTime(int minutes) =>
        localizer["Blog.ReadingTime", Format(Math.Max(1, minutes))];
}
