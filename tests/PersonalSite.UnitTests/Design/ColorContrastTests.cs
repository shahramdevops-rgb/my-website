using System.Globalization;
using System.Text.RegularExpressions;

namespace PersonalSite.UnitTests.Design;

/// <summary>
/// Guards WCAG AA contrast for the design tokens in src/PersonalSite.Web/Styles/app.css (architecture.md §8.1),
/// so a palette tweak that makes text unreadable fails the build instead of shipping.
/// </summary>
public sealed partial class ColorContrastTests
{
    // WCAG 2.2: normal text needs 4.5:1 (SC 1.4.3); UI parts such as focus rings need 3:1 (SC 1.4.11).
    private const double _textMinimum = 4.5;
    private const double _nonTextMinimum = 3.0;

    private static readonly string[] _themes = ["dark", "light"];
    private static readonly string[] _backgrounds = ["bg", "surface", "surface-2"];

    private static readonly Lazy<string> _css = new(() => File.ReadAllText(RepositoryPaths.Web("Styles", "app.css")));

    public static TheoryData<string, string, string> TextPairs()
    {
        var data = new TheoryData<string, string, string>();
        foreach (var theme in _themes)
        {
            foreach (var foreground in new[] { "text", "muted", "primary", "bloom" })
            {
                foreach (var background in _backgrounds)
                {
                    data.Add(theme, foreground, background);
                }
            }

            data.Add(theme, "text", "primary-soft");    // tag text
            data.Add(theme, "primary", "primary-soft"); // tag text
            data.Add(theme, "bg", "primary");           // label on a primary button
        }

        return data;
    }

    public static TheoryData<string, string> ThemeBackgrounds()
    {
        var data = new TheoryData<string, string>();
        foreach (var theme in _themes)
        {
            foreach (var background in _backgrounds)
            {
                data.Add(theme, background);
            }
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(TextPairs))]
    public void ContrastRatio_TextTokenOnBackground_MeetsWcagAa(string theme, string foreground, string background)
    {
        var tokens = Tokens(theme);

        var ratio = ContrastRatio(tokens[foreground], tokens[background]);

        ratio.ShouldBeGreaterThanOrEqualTo(_textMinimum, $"{theme}: {foreground} on {background}");
    }

    [Theory]
    [MemberData(nameof(ThemeBackgrounds))]
    public void ContrastRatio_FocusRingOnBackground_MeetsNonTextMinimum(string theme, string background)
    {
        var tokens = Tokens(theme);

        var ratio = ContrastRatio(tokens["sun"], tokens[background]);

        ratio.ShouldBeGreaterThanOrEqualTo(_nonTextMinimum, $"{theme}: sun on {background}");
    }

    [Fact]
    public void LightTheme_ComparedToDark_OverridesEveryToken()
    {
        Tokens("light").Keys.Order().ShouldBe(Tokens("dark").Keys.Order());
    }

    // Dark values live in `@theme static { … }`, light overrides in `:root[data-theme="light"] { … }`.
    private static Dictionary<string, string> Tokens(string theme)
    {
        var blockStart = theme == "dark" ? "@theme static {" : ":root[data-theme=\"light\"] {";
        var start = _css.Value.IndexOf(blockStart, StringComparison.Ordinal);
        start.ShouldBeGreaterThanOrEqualTo(0, $"'{blockStart}' not found in app.css");
        var block = _css.Value[start.._css.Value.IndexOf('}', start)];

        return ColorToken().Matches(block).ToDictionary(m => m.Groups["name"].Value, m => m.Groups["hex"].Value);
    }

    // https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
    private static double ContrastRatio(string hexA, string hexB)
    {
        var (lighter, darker) = (RelativeLuminance(hexA), RelativeLuminance(hexB)) switch
        {
            var (a, b) when a >= b => (a, b),
            var (a, b) => (b, a),
        };

        return (lighter + 0.05) / (darker + 0.05);
    }

    // https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
    private static double RelativeLuminance(string hex)
    {
        static double Channel(string hex, int offset)
        {
            var value = byte.Parse(hex.AsSpan(offset, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture) / 255.0;
            return value <= 0.04045 ? value / 12.92 : Math.Pow((value + 0.055) / 1.055, 2.4);
        }

        return (0.2126 * Channel(hex, 1)) + (0.7152 * Channel(hex, 3)) + (0.0722 * Channel(hex, 5));
    }

    [GeneratedRegex(@"--color-(?<name>[a-z0-9-]+):\s*(?<hex>#[0-9a-fA-F]{6});")]
    private static partial Regex ColorToken();
}
