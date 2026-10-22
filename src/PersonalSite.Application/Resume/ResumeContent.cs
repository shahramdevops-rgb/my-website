using PersonalSite.Domain.Common;

namespace PersonalSite.Application.Resume;

/// <summary>
/// The résumé in every site language, used as an options type: the Api fills it from the content files and
/// <see cref="ResumeContentValidator"/> checks it with <c>ValidateOnStart</c>, so a broken file stops the app at
/// startup instead of failing the first visitor.
/// </summary>
public sealed class ResumeContent
{
    public ResumeProfile? Fa { get; set; }

    public ResumeProfile? En { get; set; }

    public ResumeProfile Get(Language language)
    {
        var profile = language switch
        {
            Language.Fa => Fa,
            Language.En => En,
            _ => throw new ArgumentOutOfRangeException(nameof(language), language, "Unsupported language."),
        };

        // Unreachable once startup validation has passed; a null here is a bug, not an expected failure.
        return profile ?? throw new InvalidOperationException($"The {language} résumé is not loaded.");
    }
}
