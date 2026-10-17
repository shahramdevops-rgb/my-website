using System.Globalization;

namespace PersonalSite.Web.Formatting;

/// <summary>
/// .NET formats numbers and dates with ASCII digits in every culture; the culture's own digits are only listed in
/// <see cref="NumberFormatInfo.NativeDigits"/> (fa: ۰۱۲۳۴۵۶۷۸۹, en: 0123456789). This applies them, so "1405"
/// becomes "۱۴۰۵" in fa and stays "1405" in en — the culture decides, no view ever replaces digits by hand.
/// Use it on formatted values only, never on free text (a version like "ASP.NET Core 10" must keep its digits).
/// </summary>
public static class NativeDigits
{
    public static string Apply(string formatted, CultureInfo culture)
    {
        var digits = culture.NumberFormat.NativeDigits;
        if (digits[0] == "0")
        {
            return formatted;
        }

        return string.Create(formatted.Length, (formatted, digits), static (span, state) =>
        {
            for (var i = 0; i < span.Length; i++)
            {
                var c = state.formatted[i];
                span[i] = char.IsAsciiDigit(c) ? state.digits[c - '0'][0] : c;
            }
        });
    }
}
