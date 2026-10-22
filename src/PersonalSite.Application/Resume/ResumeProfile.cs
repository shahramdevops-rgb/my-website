namespace PersonalSite.Application.Resume;

// The structured résumé (ADR-013): one file per language (Api/Content/resume.{fa,en}.json) deserialized into these
// records, validated at startup (ResumeContentValidator) and served as-is by GET /api/resume. Every other rendering
// (Resume page, About skills grid, keyboard hero, /api/resume.json, curl card, llms.txt, MCP) reads the same data.
// Dates are month precision, "yyyy-MM": a résumé never needs the day, and the front-end formats them per locale.

/// <summary>The whole résumé in one language.</summary>
public sealed record ResumeProfile(
    ResumeBasics Basics,
    IReadOnlyList<ResumeLink> Links,
    IReadOnlyList<ResumeExperience> Experience,
    IReadOnlyList<ResumeEducation> Education,
    IReadOnlyList<ResumeSkillGroup> Skills,
    IReadOnlyList<ResumeTech> TechStack);

/// <summary>Who: name (ADR-017), one-line headline, short summary, location.</summary>
public sealed record ResumeBasics(string Name, string Headline, string Summary, string Location);

/// <summary>A public profile or page (e.g. GitHub). Absolute https URL.</summary>
public sealed record ResumeLink(string Label, Uri Url);

/// <summary>
/// A job or engagement. <c>end</c> = <c>null</c> means "present". <c>tech</c> holds ids from
/// <c>techStack</c>, so the keyboard hero can list the work that used each technology.
/// </summary>
public sealed record ResumeExperience(
    string Organization,
    string Role,
    string Start,
    string Summary,
    IReadOnlyList<string> Highlights,
    IReadOnlyList<string> Tech,
    string? End = null,
    string? Location = null);

/// <summary>A degree. <c>end</c> = <c>null</c> means "in progress".</summary>
public sealed record ResumeEducation(
    string Institution,
    string Degree,
    string Field,
    string Start,
    string? End = null);

/// <summary>A category of skills ("Back-end", "Front-end" …) with its items, in display order.</summary>
public sealed record ResumeSkillGroup(string Category, IReadOnlyList<string> Items);

/// <summary>
/// One technology of the stack (a keycap of the keyboard hero). <c>id</c> is a language-neutral slug
/// (<c>csharp</c>, <c>postgresql</c>), identical in both files; <c>name</c> and <c>description</c> are localized.
/// </summary>
public sealed record ResumeTech(string Id, string Name, string Description);
