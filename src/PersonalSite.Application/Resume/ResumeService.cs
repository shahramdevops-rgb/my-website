using Microsoft.Extensions.Options;
using PersonalSite.Domain.Common;

namespace PersonalSite.Application.Resume;

/// <summary>Serves the structured résumé (ADR-013). In memory: the files are read once, at startup.</summary>
public sealed class ResumeService(IOptions<ResumeContent> content)
{
    public ResumeProfile Get(Language language) => content.Value.Get(language);
}
