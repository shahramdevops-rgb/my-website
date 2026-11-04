using AngleSharp.Html.Parser;
using Microsoft.Extensions.Options;
using PersonalSite.Application.Site;
using PersonalSite.Infrastructure.Markdown;

namespace PersonalSite.UnitTests.Markdown;

public sealed class MarkdigRendererTests
{
    private readonly MarkdigRenderer _renderer =
        new(Options.Create(new SiteOptions { BaseUrl = new Uri("https://mahdiazghandi.ir") }));

    // Payloads typed into the Markdown editor. Each must come out without a way to run script.
    public static TheoryData<string, string> MarkdownPayloads => new()
    {
        { "script tag", "<script>alert(1)</script>" },
        { "script tag inside a paragraph", "Hello <script>alert(1)</script> world" },
        { "event handler on raw HTML", "<img src=x onerror=alert(1)>" },
        { "svg with onload", "<svg onload=alert(1)></svg>" },
        { "iframe", "<iframe src=\"https://example.com\"></iframe>" },
        { "javascript link", "[click](javascript:alert(1))" },
        { "javascript link, mixed case", "[click](JaVaScRiPt:alert(1))" },
        { "javascript link, entity-encoded", "[click](&#106;avascript:alert(1))" },
        { "javascript link, tab inside the scheme", "[click](java&#x09;script:alert(1))" },
        { "javascript autolink", "<javascript:alert(1)>" },
        { "javascript reference link", "[click][x]\n\n[x]: javascript:alert(1)" },
        { "javascript image", "![x](javascript:alert(1))" },
        { "vbscript link", "[click](vbscript:msgbox(1))" },
        { "data URL link", "[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)" },
        { "quote breaking out of a link title", "[x](https://example.com \"\\\" onmouseover=\\\"alert(1)\")" },
        { "code fence language breaking out", "```\"><script>alert(1)</script>\ncode\n```" },
    };

    // HTML handed straight to the sanitizer, as if Markdig had let it through: the second layer on its own.
    public static TheoryData<string, string> HtmlPayloads => new()
    {
        { "script tag", "<p>a</p><script>alert(1)</script>" },
        { "event handler", "<img src=\"/media/a.png\" onerror=\"alert(1)\">" },
        { "javascript href", "<a href=\"javascript:alert(1)\">x</a>" },
        { "javascript href with whitespace", "<a href=\" javascript:alert(1)\">x</a>" },
        { "svg with script", "<svg><script>alert(1)</script></svg>" },
        { "style tag", "<style>body{background:url(javascript:alert(1))}</style>" },
        { "style attribute expression", "<p style=\"background:url(javascript:alert(1))\">x</p>" },
        { "iframe", "<iframe src=\"https://example.com\"></iframe>" },
        { "object", "<object data=\"javascript:alert(1)\"></object>" },
        { "form with formaction", "<form><button formaction=\"javascript:alert(1)\">x</button></form>" },
        { "meta refresh", "<meta http-equiv=\"refresh\" content=\"0;url=javascript:alert(1)\">" },
        { "base tag", "<base href=\"javascript:alert(1)//\">" },
    };

    [Theory]
    [MemberData(nameof(MarkdownPayloads))]
    public void Render_XssPayload_LeavesNoWayToRunScript(string name, string markdown)
    {
        var html = _renderer.Render(markdown).Html;

        ShouldBeInert(html, name);
    }

    [Theory]
    [MemberData(nameof(HtmlPayloads))]
    public void Sanitize_XssPayload_RemovesItEvenWithoutMarkdig(string name, string html) =>
        ShouldBeInert(_renderer.Sanitize(html), name);

    [Fact]
    public void Render_RawHtml_ShowsItAsText()
    {
        var html = _renderer.Render("Use <b>bold</b> sparingly").Html;

        html.ShouldBe("<p dir=\"auto\">Use &lt;b&gt;bold&lt;/b&gt; sparingly</p>");
    }

    [Fact]
    public void Render_Paragraphs_LetEachFindItsOwnDirection()
    {
        var html = _renderer.Render("سلام دنیا\n\nHello world\n\n- مورد اول\n- second item").Html;

        html.ShouldContain("<p dir=\"auto\">سلام دنیا</p>");
        html.ShouldContain("<p dir=\"auto\">Hello world</p>");
        html.ShouldContain("<li dir=\"auto\">مورد اول</li>");
    }

    [Fact]
    public void Render_Code_IsAlwaysLeftToRight()
    {
        var html = _renderer.Render("متن با `app.Run()` در وسط\n\n```csharp\nvar x = 1;\n```").Html;

        html.ShouldContain("<code dir=\"ltr\">app.Run()</code>");
        html.ShouldContain("<pre dir=\"ltr\"><code class=\"language-csharp\" dir=\"ltr\">var x = 1;");
    }

    [Theory]
    [InlineData("[a](https://github.com/x)", true)]
    [InlineData("[a](http://example.com)", true)]
    [InlineData("[a](//example.com/x)", true)]
    [InlineData("[a](https://mahdiazghandi.ir/fa/blog)", false)]
    [InlineData("[a](/fa/projects/gym)", false)]
    [InlineData("[a](#section)", false)]
    [InlineData("[a](mailto:hi@example.com)", false)]
    public void Render_Links_MarksOnlyExternalOnes(string markdown, bool external)
    {
        var html = _renderer.Render(markdown).Html;

        html.Contains("rel=\"noopener nofollow\"", StringComparison.Ordinal).ShouldBe(external, html);
    }

    [Theory]
    [InlineData("![chart](/media/2026/11/a.png)", true)]
    [InlineData("![chart](https://mahdiazghandi.ir/media/a.png)", true)]
    [InlineData("![chart](https://example.com/tracker.png)", false)]
    [InlineData("![chart](//example.com/tracker.png)", false)]
    [InlineData("![chart](data:image/png;base64,iVBORw0KGgo=)", false)]
    public void Render_Images_KeepsOnlyThisSitesOwn(string markdown, bool kept)
    {
        var html = _renderer.Render(markdown).Html;

        html.Contains("<img", StringComparison.Ordinal).ShouldBe(kept, html);
    }

    [Fact]
    public void Render_HeadingsAndTables_KeepIdsAndColumnAlignment()
    {
        var html = _renderer.Render("## Why PostgreSQL\n\n| a | b |\n|:--|--:|\n| 1 | 2 |").Html;

        html.ShouldContain("<h2 id=\"why-postgresql\" dir=\"auto\">Why PostgreSQL</h2>");
        html.ShouldContain("text-align: right");
    }

    [Fact]
    public void Render_TaskList_HasDisabledCheckboxes()
    {
        var html = _renderer.Render("- [x] done\n- [ ] todo").Html;

        html.ShouldContain("type=\"checkbox\"");
        html.ShouldNotContain("<input type=\"checkbox\" checked=\"checked\">"); // never without disabled
        html.Split("<input").Skip(1).ShouldAllBe(input => input.Contains("disabled", StringComparison.Ordinal));
    }

    [Fact]
    public void Render_Headings_BuildTableOfContentsFromSecondAndThirdLevel()
    {
        var toc = _renderer.Render("# Title\n\n## مقدمه\n\ntext\n\n### Setup with `dotnet`\n\n#### Too deep\n\n## *Results*").TableOfContents;

        toc.Select(entry => (entry.Level, entry.Text)).ShouldBe(
        [
            (2, "مقدمه"),
            (3, "Setup with dotnet"),
            (2, "Results"),
        ]);
        toc[0].Id.ShouldBe("مقدمه");
        toc[1].Id.ShouldBe("setup-with-dotnet");
    }

    [Fact]
    public void Render_TableOfContents_UsesTheIdsInTheHtml()
    {
        var rendered = _renderer.Render("## One\n\n## One\n\n## Two");

        rendered.TableOfContents.Select(entry => entry.Id).ShouldBe(["one", "one-1", "two"]);
        foreach (var entry in rendered.TableOfContents)
        {
            rendered.Html.ShouldContain($"id=\"{entry.Id}\"");
        }
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(1, 1)]
    [InlineData(299, 1)]
    [InlineData(300, 2)]
    [InlineData(1000, 5)]
    public void ReadingMinutes_WordCount_RoundsAtTwoHundredWordsAMinute(int words, int minutes) =>
        MarkdigRenderer.ReadingMinutes(string.Join(' ', Enumerable.Repeat("کلمه", words))).ShouldBe(minutes);

    [Fact]
    public void Render_Empty_ReturnsNothing()
    {
        var rendered = _renderer.Render(string.Empty);

        rendered.Html.ShouldBeEmpty();
        rendered.TableOfContents.ShouldBeEmpty();
        rendered.ReadingMinutes.ShouldBe(0);
    }

    // Checked on the parsed result, as a browser would see it, not by searching the text: "&lt;script&gt;" shown as
    // text is harmless, while a real element or attribute is not.
    private static void ShouldBeInert(string html, string name)
    {
        using var document = new HtmlParser().ParseDocument($"<!doctype html><body>{html}</body>");
        var message = $"{name}: {html}";

        foreach (var element in document.Body!.QuerySelectorAll("*"))
        {
            _dangerousTags.ShouldNotContain(element.LocalName, message);
            foreach (var attribute in element.Attributes)
            {
                attribute.Name.ShouldNotStartWith("on", Case.Insensitive, message);
                if (attribute.Name is "href" or "src" && attribute.Value.Contains(':', StringComparison.Ordinal))
                {
                    var scheme = attribute.Value[..attribute.Value.IndexOf(':', StringComparison.Ordinal)].Trim().ToLowerInvariant();
                    _safeSchemes.ShouldContain(scheme, message);
                }

                if (attribute.Name == "style")
                {
                    attribute.Value.ShouldStartWith("text-align", Case.Sensitive, message);
                }
            }
        }
    }

    private static readonly string[] _dangerousTags =
        ["script", "iframe", "svg", "object", "embed", "style", "form", "button", "meta", "base", "link"];

    private static readonly string[] _safeSchemes = ["http", "https", "mailto"];
}
