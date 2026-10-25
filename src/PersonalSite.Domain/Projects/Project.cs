using PersonalSite.Domain.Common;

namespace PersonalSite.Domain.Projects;

/// <summary>
/// A portfolio project in one language (architecture.md §4). Its translations are separate rows that share
/// <see cref="TranslationGroup"/>. The body is the case study: Markdown is what the admin edits, HTML the rendered
/// and sanitized copy the public sees; they are always set together so the copy never drifts from its source.
/// </summary>
public sealed class Project : Entity
{
    public const int TitleMaxLength = 120;
    public const int SummaryMaxLength = 300;
    public const int UrlMaxLength = 2048;
    public const int TechStackMaxCount = 20;
    public const int TechIdMaxLength = 40;

    // For EF Core only: it sets the properties itself. Code creates projects through Create().
    private Project()
    {
    }

    public Language Language { get; private set; }

    public Guid TranslationGroup { get; private set; }

    public Slug Slug { get; private set; } = null!;

    public string Title { get; private set; } = string.Empty;

    public string Summary { get; private set; } = string.Empty;

    public string BodyMarkdown { get; private set; } = string.Empty;

    public string BodyHtml { get; private set; } = string.Empty;

    public ProjectStatus Status { get; private set; }

    public Uri? LiveUrl { get; private set; }

    public Uri? SourceUrl { get; private set; }

    /// <summary>Polled by the server (P6-T8), so https only: the check must not be readable or alterable in transit.</summary>
    public Uri? HealthUrl { get; private set; }

    public DemoKey? DemoKey { get; private set; }

    /// <summary>
    /// Résumé tech ids in the admin's order, e.g. <c>dotnet</c>, <c>postgresql</c> (ADR-013): the display name comes
    /// from the résumé, and a keyboard key can list the projects that use it. That an id exists in the résumé is
    /// checked in Application, which reads the résumé; here only its shape.
    /// </summary>
    public IReadOnlyList<string> TechStack { get; private set; } = [];

    public Guid? CoverImageId { get; private set; }

    public bool IsFeatured { get; private set; }

    /// <summary>Position in lists, ascending; the admin sets it by dragging.</summary>
    public int SortOrder { get; private set; }

    public DateOnly? StartedOn { get; private set; }

    public DateOnly? FinishedOn { get; private set; }

    /// <summary>
    /// Starts a project as <see cref="ProjectStatus.InProgress"/> with an empty body. Pass the
    /// <paramref name="translationGroup"/> of an existing project to add its translation; omit it for a new project.
    /// </summary>
    public static Project Create(Language language, Slug slug, string title, string summary, Guid? translationGroup = null)
    {
        ArgumentNullException.ThrowIfNull(slug);
        if (translationGroup == Guid.Empty)
        {
            throw new ArgumentException("An empty GUID is not a translation group.", nameof(translationGroup));
        }

        var project = new Project
        {
            Language = language,
            TranslationGroup = translationGroup ?? Guid.CreateVersion7(),
            Slug = slug,
            Status = ProjectStatus.InProgress,
        };
        project.UpdateDetails(title, summary);
        return project;
    }

    public void UpdateDetails(string title, string summary)
    {
        Title = Guard.Text(title, TitleMaxLength);
        Summary = Guard.Text(summary, SummaryMaxLength);
    }

    public void ChangeSlug(Slug slug) => Slug = slug ?? throw new ArgumentNullException(nameof(slug));

    public void SetBody(string markdown, string html)
    {
        ArgumentNullException.ThrowIfNull(markdown);
        ArgumentNullException.ThrowIfNull(html);
        BodyMarkdown = markdown;
        BodyHtml = html;
    }

    public void SetLinks(Uri? liveUrl, Uri? sourceUrl, Uri? healthUrl)
    {
        LiveUrl = Guard.WebUrl(liveUrl, UrlMaxLength, httpsOnly: false);
        SourceUrl = Guard.WebUrl(sourceUrl, UrlMaxLength, httpsOnly: false);
        HealthUrl = Guard.WebUrl(healthUrl, UrlMaxLength, httpsOnly: true);
    }

    public void SetDemo(DemoKey? demoKey) => DemoKey = demoKey;

    /// <summary>Keeps the first of repeated ids. An id has the slug shape (<c>ef-core</c>), like the résumé's.</summary>
    public void SetTechStack(IEnumerable<string> techIds)
    {
        ArgumentNullException.ThrowIfNull(techIds);
        string[] ids = [.. techIds.Distinct(StringComparer.Ordinal)];
        var invalid = Array.FindIndex(ids, id => !Slug.IsValid(id) || id.Length > TechIdMaxLength);
        if (invalid >= 0)
        {
            throw new ArgumentException($"'{ids[invalid]}' is not a tech id: a-z, 0-9 and single hyphens, at most {TechIdMaxLength} characters.", nameof(techIds));
        }

        TechStack = ids.Length <= TechStackMaxCount
            ? ids
            : throw new ArgumentException($"At most {TechStackMaxCount} technologies.", nameof(techIds));
    }

    public void SetCoverImage(Guid? mediaFileId)
    {
        if (mediaFileId == Guid.Empty)
        {
            throw new ArgumentException("An empty GUID is not a media file.", nameof(mediaFileId));
        }

        CoverImageId = mediaFileId;
    }

    /// <summary>Either date may be unknown; when both are known the project cannot finish before it started.</summary>
    public void SetPeriod(DateOnly? startedOn, DateOnly? finishedOn)
    {
        if (startedOn > finishedOn)
        {
            throw new ArgumentException("A project cannot finish before it started.", nameof(finishedOn));
        }

        StartedOn = startedOn;
        FinishedOn = finishedOn;
    }

    public void MarkLive() => Status = ProjectStatus.Live;

    public void MarkInProgress() => Status = ProjectStatus.InProgress;

    /// <summary>Also takes the project off Home: an archived project is never featured.</summary>
    public void Archive()
    {
        Status = ProjectStatus.Archived;
        IsFeatured = false;
    }

    public void Feature()
    {
        if (Status == ProjectStatus.Archived)
        {
            throw new InvalidOperationException("An archived project cannot be featured.");
        }

        IsFeatured = true;
    }

    public void Unfeature() => IsFeatured = false;

    public void Reorder(int sortOrder)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(sortOrder);
        SortOrder = sortOrder;
    }
}
