using System.Text;
using System.Text.RegularExpressions;
using AngleSharp.Dom;
using Ganss.Xss;
using Markdig;
using Markdig.Extensions.AutoIdentifiers;
using Markdig.Renderers.Html;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using Microsoft.Extensions.Options;
using PersonalSite.Application.Common.Abstractions;
using PersonalSite.Application.Site;

namespace PersonalSite.Infrastructure.Markdown;

/// <summary>
/// Markdown → HTML in three steps, each assuming the one before it may have failed (defence in depth):
/// <list type="number">
/// <item>Markdig with raw HTML disabled: <c>&lt;script&gt;</c> typed into a post becomes visible text, not a tag.</item>
/// <item>HtmlSanitizer with an allow-list: only the tags, attributes, URL schemes and CSS property listed below
/// survive, so a <c>javascript:</c> link or an <c>onerror</c> attribute is removed even if step 1 let it through.</item>
/// <item>Our own pass over the clean DOM: text direction, <c>rel</c> on external links, no images from other sites,
/// only known CSS classes. It only adds fixed values or removes things, never copies input into markup.</item>
/// </list>
/// </summary>
internal sealed partial class MarkdigRenderer : IMarkdownRenderer
{
    /// <summary>Reading speed for <see cref="RenderedMarkdown.ReadingMinutes"/>; a common estimate for Persian and English.</summary>
    public const int WordsPerMinute = 200;

    // An explicit subset of Markdig's "advanced" extensions. Left out on purpose: media links (YouTube/Vimeo
    // iframes: a third-party request on every page view, ADR-007), math and diagrams (need JavaScript libraries at
    // runtime), generic attributes ({onclick=…} — lets the text set any attribute), custom containers (any class).
    // GitHub-style heading ids keep Persian letters, so a Persian heading gets a readable anchor.
    private static readonly MarkdownPipeline _pipeline = new MarkdownPipelineBuilder()
        .UseAutoIdentifiers(AutoIdentifierOptions.GitHub)
        .UsePipeTables()
        .UseEmphasisExtras()
        .UseTaskLists()
        .UseAutoLinks()
        .UseFootnotes()
        .UseListExtras()
        .DisableHtml()
        .Build();

    private static readonly HashSet<string> _knownClasses = new(StringComparer.Ordinal)
    {
        "contains-task-list", "task-list-item", "task-list-item-checkbox",
        "footnotes", "footnote-ref", "footnote-back-ref",
    };

    // Configured once and never changed afterwards, which makes one instance safe to share between requests.
    private readonly HtmlSanitizer _sanitizer = new(new HtmlSanitizerOptions
    {
        AllowedTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
            "strong", "em", "del", "ins", "mark", "sub", "sup", "a", "img",
            "ul", "ol", "li", "input", "div", "table", "thead", "tbody", "tr", "th", "td",
        },
        AllowedAttributes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "href", "title", "src", "alt", "id", "class", "start", "type", "checked", "disabled", "style",
        },
        // Pipe tables align columns with style="text-align: …"; nothing else may be styled.
        AllowedCssProperties = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "text-align" },
        AllowedSchemes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "http", "https", "mailto" },
        UriAttributes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "href", "src" },
    });

    private readonly string _siteHost;

    public MarkdigRenderer(IOptions<SiteOptions> site)
    {
        ArgumentNullException.ThrowIfNull(site);
        _siteHost = site.Value.BaseUrl.Host;
    }

    public RenderedMarkdown Render(string markdown)
    {
        ArgumentNullException.ThrowIfNull(markdown);
        var document = Markdig.Markdown.Parse(markdown, _pipeline);

        return new RenderedMarkdown(
            Sanitize(Markdig.Markdown.ToHtml(document, _pipeline)),
            TableOfContents(document),
            ReadingMinutes(Markdig.Markdown.ToPlainText(markdown, _pipeline)));
    }

    /// <summary>Steps 2 and 3 on any HTML; internal so tests can check them without Markdig in front.</summary>
    internal string Sanitize(string html)
    {
        // Parsed by the sanitizer's own parser: it has CSS support, without which no style attribute can be checked
        // (and all would be dropped, table column alignment included).
        using var document = _sanitizer.SanitizeDom(html, string.Empty);
        var body = document.Body!;
        Annotate(body);

        // Markdig ends every block with a newline; the last one means nothing.
        return body.InnerHtml.Trim();
    }

    internal static int ReadingMinutes(string plainText)
    {
        var words = plainText.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
        return words == 0 ? 0 : Math.Max(1, (int)Math.Round(words / (double)WordsPerMinute, MidpointRounding.AwayFromZero));
    }

    private void Annotate(IElement body)
    {
        // Each block finds its own direction from its first strong letter, so a Persian paragraph is right-to-left
        // and an English one left-to-right in the same post; the dir attribute also isolates it from its neighbours.
        foreach (var block in body.QuerySelectorAll("p, li, h1, h2, h3, h4, h5, h6, th, td"))
        {
            block.SetAttribute("dir", "auto");
        }

        // Code always reads left to right, even inside a Persian paragraph.
        foreach (var code in body.QuerySelectorAll("pre, code"))
        {
            code.SetAttribute("dir", "ltr");
        }

        // nofollow: no search-ranking endorsement of other sites; noopener: an opened page gets no handle on ours.
        foreach (var link in body.QuerySelectorAll("a[href]").Where(link => IsExternal(link.GetAttribute("href"))))
        {
            link.SetAttribute("rel", "noopener nofollow");
        }

        // Pictures only from this site (CSP img-src 'self', ADR-007): an outside image would tell another server
        // who reads which post. The sanitizer already removed src values with a forbidden scheme (data:, javascript:).
        foreach (var image in body.QuerySelectorAll("img").ToList())
        {
            var src = image.GetAttribute("src");
            if (string.IsNullOrEmpty(src) || IsExternal(src))
            {
                image.Remove();
            }
        }

        // Task-list checkboxes are the only inputs Markdig writes; they show state and are never editable.
        foreach (var input in body.QuerySelectorAll("input").ToList())
        {
            if (input.GetAttribute("type") == "checkbox")
            {
                input.SetAttribute("disabled", "disabled");
            }
            else
            {
                input.Remove();
            }
        }

        // Classes are styling hooks: keep only the ones Markdig writes, so text can never borrow a site class.
        foreach (var element in body.QuerySelectorAll("[class]"))
        {
            string[] kept = [.. element.ClassList.Where(name => _knownClasses.Contains(name) || CodeLanguageClass().IsMatch(name))];
            if (kept.Length == 0)
            {
                element.RemoveAttribute("class");
            }
            else
            {
                element.ClassName = string.Join(' ', kept);
            }
        }
    }

    // An absolute http(s) URL on another host, or a protocol-relative one (//host/…). Checked by scheme, not by
    // Uri.TryCreate alone: on Linux "/media/a.png" parses as an absolute file: URI.
    private bool IsExternal(string? url) =>
        url is not null
        && (url.StartsWith("//", StringComparison.Ordinal)
            || (Uri.TryCreate(url, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
                && !string.Equals(uri.Host, _siteHost, StringComparison.OrdinalIgnoreCase)));

    // Sections for the table of contents: top-level h2 and h3 (h1 is the page title), with the ids Markdig gave them.
    private static List<TocEntry> TableOfContents(MarkdownDocument document) =>
    [
        .. document.OfType<HeadingBlock>()
            .Where(heading => heading.Level is 2 or 3 && heading.Inline is not null)
            .Select(heading => (heading, id: heading.GetAttributes().Id))
            .Where(item => !string.IsNullOrEmpty(item.id))
            .Select(item => new TocEntry(item.heading.Level, item.id!, PlainText(item.heading.Inline!))),
    ];

    private static string PlainText(ContainerInline inlines)
    {
        var text = new StringBuilder();
        foreach (var inline in inlines.Descendants<Inline>())
        {
            switch (inline)
            {
                case LiteralInline literal:
                    text.Append(literal.Content);
                    break;
                case CodeInline code:
                    text.Append(code.Content);
                    break;
                case LineBreakInline:
                    text.Append(' ');
                    break;
            }
        }

        return text.ToString().Trim();
    }

    [GeneratedRegex(@"^language-[a-z0-9+#._-]+\z", RegexOptions.CultureInvariant)]
    private static partial Regex CodeLanguageClass();
}
