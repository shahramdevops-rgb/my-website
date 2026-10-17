using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace PersonalSite.Web.Configuration;

/// <summary>
/// Site languages, bound from the <c>Localization</c> configuration section (rules.md §10). The culture name is
/// also the URL prefix: <c>fa</c> → <c>/fa/...</c>. Adding English (P13) = adding <c>"en"</c> here plus its resx.
/// Not named LocalizationOptions: that name is taken by the framework (Microsoft.Extensions.Localization).
/// </summary>
public sealed class CultureOptions
{
    public const string SectionName = "Localization";

    [MinLength(1)]
    public IReadOnlyList<string> SupportedCultures { get; set; } = [];

    /// <summary>Used when nothing else decides the language: the <c>/</c> redirect and pages without a prefix.</summary>
    [Required]
    public string DefaultCulture { get; set; } = string.Empty;

    public bool IsSupported(string? culture) =>
        culture is not null && SupportedCultures.Contains(culture, StringComparer.OrdinalIgnoreCase);

    /// <summary>Every entry must be a culture .NET knows (ICU), and the default must be one of them.</summary>
    internal bool IsValid() =>
        SupportedCultures.All(IsKnownCulture) && IsSupported(DefaultCulture);

    private static bool IsKnownCulture(string name)
    {
        try
        {
            CultureInfo.GetCultureInfo(name, predefinedOnly: true);
            return true;
        }
        catch (CultureNotFoundException)
        {
            return false;
        }
    }
}
