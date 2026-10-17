using System.Text.RegularExpressions;

namespace PersonalSite.UnitTests.Design;

/// <summary>
/// Rules for the botanical SVG motifs in Pages/Shared/Motifs (P1-T8): decorative, theme-colored, sized before they
/// load, CSP-safe, and animated only for visitors who haven't asked for reduced motion.
/// </summary>
public sealed partial class MotifTests
{
    private const string _reducedMotionGuard = "@media (prefers-reduced-motion: no-preference) {";

    private static readonly string _motifsFolder = RepositoryPaths.Web("Pages", "Shared", "Motifs");

    public static TheoryData<string> Motifs() => new(MotifNames());

    [Fact]
    public void MotifsFolder_Always_HasTheMotifLibrary()
    {
        MotifNames().ShouldBe(["_BloomCluster", "_HeroBotanical", "_LeafDivider", "_Sprig", "_VineCorner"]);
    }

    [Theory]
    [MemberData(nameof(Motifs))]
    public void Motif_RootSvg_IsHiddenFromAssistiveTech(string motif)
    {
        var svg = RootSvg(motif);

        // Decoration only: screen readers skip it, and old Edge/IE can't Tab into it.
        svg.ShouldContain("aria-hidden=\"true\"");
        svg.ShouldContain("focusable=\"false\"");
    }

    [Theory]
    [MemberData(nameof(Motifs))]
    public void Motif_RootSvg_HasIntrinsicSize(string motif)
    {
        var svg = RootSvg(motif);

        // width/height equal to the viewBox give the browser the aspect ratio before layout: no layout shift.
        var viewBox = ViewBox().Match(svg);
        viewBox.Success.ShouldBeTrue($"{motif}: viewBox=\"0 0 W H\" missing");
        svg.ShouldContain($"width=\"{viewBox.Groups["w"].Value}\"");
        svg.ShouldContain($"height=\"{viewBox.Groups["h"].Value}\"");
    }

    [Theory]
    [MemberData(nameof(Motifs))]
    public void Motif_Paint_UsesOnlyCurrentColor(string motif)
    {
        var markup = Markup(motif);

        // currentColor follows the wrapper's token class (text-primary, text-bloom), so the theme re-colors it.
        PaintValue().Matches(markup).Select(m => m.Groups["value"].Value).Distinct()
            .ShouldBeSubsetOf(["none", "currentColor"], motif);
        RawColor().IsMatch(markup).ShouldBeFalse($"{motif}: raw color value");
    }

    [Theory]
    [MemberData(nameof(Motifs))]
    public void Motif_Markup_HasNoInlineStylesOrIds(string motif)
    {
        var markup = Markup(motif);

        // The CSP has no 'unsafe-inline' for styles; ids would clash when a motif appears twice on a page.
        StyleOrId().Matches(markup).Select(m => m.Value).ShouldBeEmpty(motif);
    }

    [Fact]
    public void Stylesheet_Animations_OnlyWithoutReducedMotionPreference()
    {
        var css = CssComment().Replace(File.ReadAllText(RepositoryPaths.Web("Styles", "app.css")), "");
        var (guarded, unguarded) = SplitGuardedBlocks(css);

        guarded.ShouldContain(".motif-sway");
        unguarded.ShouldNotContain("animation:");
    }

    private static string[] MotifNames() =>
        [.. Directory.GetFiles(_motifsFolder, "*.cshtml").Select(file => Path.GetFileNameWithoutExtension(file)).Order()];

    private static string Markup(string motif) => File.ReadAllText(Path.Combine(_motifsFolder, motif + ".cshtml"));

    private static string RootSvg(string motif)
    {
        var tags = SvgTag().Matches(Markup(motif));
        tags.Count.ShouldBe(1, $"{motif}: exactly one <svg> per motif");
        return tags[0].Value;
    }

    // Brace matching: the CSS inside every reduced-motion guard, and everything outside them.
    private static (string Guarded, string Unguarded) SplitGuardedBlocks(string css)
    {
        var guarded = new List<string>();
        var start = css.IndexOf(_reducedMotionGuard, StringComparison.Ordinal);
        while (start >= 0)
        {
            var end = start + _reducedMotionGuard.Length;
            for (var depth = 1; depth > 0; end++)
            {
                depth += css[end] switch { '{' => 1, '}' => -1, _ => 0 };
            }

            guarded.Add(css[start..end]);
            css = css.Remove(start, end - start);
            start = css.IndexOf(_reducedMotionGuard, StringComparison.Ordinal);
        }

        guarded.ShouldNotBeEmpty("no reduced-motion guard in app.css");
        return (string.Concat(guarded), css);
    }

    [GeneratedRegex(@"<svg\b[^>]*>")]
    private static partial Regex SvgTag();

    [GeneratedRegex(@"viewBox=""0 0 (?<w>\d+) (?<h>\d+)""")]
    private static partial Regex ViewBox();

    [GeneratedRegex(@"\s(?:fill|stroke|color)=""(?<value>[^""]*)""")]
    private static partial Regex PaintValue();

    [GeneratedRegex(@"#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(")]
    private static partial Regex RawColor();

    [GeneratedRegex(@"\s(?:style|id)=""|<style\b")]
    private static partial Regex StyleOrId();

    [GeneratedRegex(@"/\*.*?\*/", RegexOptions.Singleline)]
    private static partial Regex CssComment();
}
