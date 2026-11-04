namespace PersonalSite.Application.Common.Abstractions;

/// <summary>
/// Turns the Markdown the admin writes into the HTML the public sees (ADR-005). The one render path for saved
/// content and the editor's preview alike, so the preview is exactly what will be published. The HTML is already
/// sanitized: it is the only HTML the front-end inserts as markup (rules.md: <c>bodyHtml</c> only).
/// </summary>
public interface IMarkdownRenderer
{
    RenderedMarkdown Render(string markdown);
}

/// <summary>
/// The result of one render: safe HTML, the headings for a table of contents (in document order), and an estimate
/// of the reading time (0 for an empty text).
/// </summary>
public sealed record RenderedMarkdown(string Html, IReadOnlyList<TocEntry> TableOfContents, int ReadingMinutes);

/// <summary>A section heading: its level (2 or 3), the <c>id</c> the HTML gives it (the link target), its text.</summary>
public sealed record TocEntry(int Level, string Id, string Text);
