using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace PersonalSite.Application.Resume;

/// <summary>
/// Startup check of the résumé files. The JSON reader already rejects missing, unknown and null fields; this adds the
/// rules a schema can't express: non-blank text, valid months in order, https links, known tech ids, and that both
/// languages describe the same facts (same jobs, degrees, dates, links and stack — only the wording may differ).
/// </summary>
public sealed partial class ResumeContentValidator : IValidateOptions<ResumeContent>
{
    public ValidateOptionsResult Validate(string? name, ResumeContent options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var failures = new List<string>();

        ValidateProfile(options.Fa, "fa", failures);
        ValidateProfile(options.En, "en", failures);

        if (options is { Fa: { } fa, En: { } en })
        {
            ValidateSameFacts(fa, en, failures);
        }

        return failures.Count == 0 ? ValidateOptionsResult.Success : ValidateOptionsResult.Fail(failures);
    }

    private static void ValidateProfile(ResumeProfile? profile, string language, List<string> failures)
    {
        if (profile is null)
        {
            failures.Add($"{language}: the résumé is missing.");
            return;
        }

        var check = new Checker(language, failures);

        check.Text(profile.Basics.Name, "basics.name");
        check.Text(profile.Basics.Headline, "basics.headline");
        check.Text(profile.Basics.Summary, "basics.summary");
        check.Text(profile.Basics.Location, "basics.location");

        for (var i = 0; i < profile.Links.Count; i++)
        {
            var link = profile.Links[i];
            check.Text(link.Label, $"links[{i}].label");
            check.True(link.Url is { IsAbsoluteUri: true, Scheme: "https" }, $"links[{i}].url must be an absolute https URL.");
        }

        var techIds = new HashSet<string>(StringComparer.Ordinal);
        check.True(profile.TechStack.Count > 0, "techStack must not be empty.");
        for (var i = 0; i < profile.TechStack.Count; i++)
        {
            var tech = profile.TechStack[i];
            check.True(TechIdPattern().IsMatch(tech.Id ?? string.Empty), $"techStack[{i}].id must be a lowercase slug (e.g. \"csharp\", \"entity-framework\").");
            check.True(techIds.Add(tech.Id ?? string.Empty), $"techStack[{i}].id \"{tech.Id}\" is used twice.");
            check.Text(tech.Name, $"techStack[{i}].name");
            check.Text(tech.Description, $"techStack[{i}].description");
        }

        check.True(profile.Experience.Count > 0, "experience must not be empty.");
        for (var i = 0; i < profile.Experience.Count; i++)
        {
            var job = profile.Experience[i];
            var path = $"experience[{i}]";
            check.Text(job.Organization, $"{path}.organization");
            check.Text(job.Role, $"{path}.role");
            check.Text(job.Summary, $"{path}.summary");
            check.Period(job.Start, job.End, path);

            for (var h = 0; h < job.Highlights.Count; h++)
            {
                check.Text(job.Highlights[h], $"{path}.highlights[{h}]");
            }

            foreach (var id in job.Tech)
            {
                check.True(techIds.Contains(id ?? string.Empty), $"{path}.tech: \"{id}\" is not an id in techStack.");
            }
        }

        check.True(profile.Education.Count > 0, "education must not be empty.");
        for (var i = 0; i < profile.Education.Count; i++)
        {
            var degree = profile.Education[i];
            var path = $"education[{i}]";
            check.Text(degree.Institution, $"{path}.institution");
            check.Text(degree.Degree, $"{path}.degree");
            check.Text(degree.Field, $"{path}.field");
            check.Period(degree.Start, degree.End, path);
        }

        check.True(profile.Skills.Count > 0, "skills must not be empty.");
        for (var i = 0; i < profile.Skills.Count; i++)
        {
            var group = profile.Skills[i];
            check.Text(group.Category, $"skills[{i}].category");
            check.True(group.Items.Count > 0, $"skills[{i}].items must not be empty.");
            for (var s = 0; s < group.Items.Count; s++)
            {
                check.Text(group.Items[s], $"skills[{i}].items[{s}]");
            }
        }
    }

    // The two files are translations of one résumé (ADR-013): renderings in different languages must never disagree.
    private static void ValidateSameFacts(ResumeProfile fa, ResumeProfile en, List<string> failures)
    {
        void Same(bool condition, string what)
        {
            if (!condition)
            {
                failures.Add($"fa/en: {what} must be the same in both languages.");
            }
        }

        Same(fa.TechStack.Select(t => t.Id).SequenceEqual(en.TechStack.Select(t => t.Id)), "techStack ids (and their order)");
        Same(fa.Links.Select(l => l.Url).SequenceEqual(en.Links.Select(l => l.Url)), "links (urls and order)");
        Same(fa.Skills.Count == en.Skills.Count, "the number of skill groups");

        Same(
            fa.Experience.Select(j => (j.Start, j.End, Tech: string.Join(',', j.Tech)))
                .SequenceEqual(en.Experience.Select(j => (j.Start, j.End, Tech: string.Join(',', j.Tech)))),
            "experience entries (count, order, dates, tech)");

        Same(
            fa.Education.Select(d => (d.Start, d.End)).SequenceEqual(en.Education.Select(d => (d.Start, d.End))),
            "education entries (count, order, dates)");
    }

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex TechIdPattern();

    [GeneratedRegex(@"^\d{4}-(0[1-9]|1[0-2])$")]
    private static partial Regex YearMonthPattern();

    /// <summary>Collects failures as "language: path problem" so one startup error lists everything to fix.</summary>
    private sealed class Checker(string language, List<string> failures)
    {
        public void True(bool condition, string message)
        {
            if (!condition)
            {
                failures.Add($"{language}: {message}");
            }
        }

        public void Text(string? value, string path) =>
            True(!string.IsNullOrWhiteSpace(value), $"{path} must not be empty.");

        // "yyyy-MM" strings compare correctly as plain text, so ordinal comparison is a date comparison.
        public void Period(string start, string? end, string path)
        {
            var startValid = YearMonthPattern().IsMatch(start ?? string.Empty);
            True(startValid, $"{path}.start must be a month as yyyy-MM.");

            if (end is null)
            {
                return;
            }

            var endValid = YearMonthPattern().IsMatch(end);
            True(endValid, $"{path}.end must be a month as yyyy-MM, or null for \"present\".");
            True(!startValid || !endValid || string.CompareOrdinal(start, end) <= 0, $"{path}.end must not be before start.");
        }
    }
}
