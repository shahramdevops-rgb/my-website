using Microsoft.Extensions.Options;
using PersonalSite.Application.Resume;

namespace PersonalSite.UnitTests.Resume;

public sealed class ResumeContentValidatorTests
{
    private readonly ResumeContentValidator _validator = new();

    [Fact]
    public void Validate_CompleteContent_Succeeds()
    {
        var result = _validator.Validate(name: null, Content(Profile(), Profile()));

        result.Succeeded.ShouldBeTrue(result.FailureMessage);
    }

    [Fact]
    public void Validate_MissingLanguage_Fails()
    {
        var result = _validator.Validate(name: null, new ResumeContent { Fa = Profile() });

        FailuresOf(result).ShouldContain("en: the résumé is missing.");
    }

    [Fact]
    public void Validate_BlankText_FailsWithPath()
    {
        var profile = Profile() with { Basics = Profile().Basics with { Headline = " " } };

        var result = _validator.Validate(name: null, Content(profile, Profile()));

        FailuresOf(result).ShouldContain("fa: basics.headline must not be empty.");
    }

    [Theory]
    [InlineData("2021-13")]
    [InlineData("2021-3")]
    [InlineData("21-03")]
    [InlineData("2021/03")]
    public void Validate_StartNotYearMonth_Fails(string start)
    {
        var result = _validator.Validate(name: null, Content(WithJob(start, end: null), WithJob(start, end: null)));

        FailuresOf(result).ShouldContain("fa: experience[0].start must be a month as yyyy-MM.");
    }

    [Fact]
    public void Validate_EndBeforeStart_Fails()
    {
        var result = _validator.Validate(name: null, Content(WithJob("2022-05", "2021-01"), WithJob("2022-05", "2021-01")));

        FailuresOf(result).ShouldContain("en: experience[0].end must not be before start.");
    }

    [Fact]
    public void Validate_JobUsesUnknownTechId_Fails()
    {
        var profile = Profile() with { Experience = [Job() with { Tech = ["cobol"] }] };

        var result = _validator.Validate(name: null, Content(profile, profile));

        FailuresOf(result).ShouldContain("fa: experience[0].tech: \"cobol\" is not an id in techStack or alsoUsed.");
    }

    [Fact]
    public void Validate_JobUsesAlsoUsedTech_Succeeds()
    {
        var profile = Profile() with { Experience = [Job() with { Tech = ["csharp", "python"] }] };

        var result = _validator.Validate(name: null, Content(profile, profile));

        result.Succeeded.ShouldBeTrue(string.Join(" ", FailuresOf(result)));
    }

    [Fact]
    public void Validate_SameTechInBothLists_Fails()
    {
        var profile = Profile() with { AlsoUsed = [Tech("csharp")] };

        var result = _validator.Validate(name: null, Content(profile, profile));

        FailuresOf(result).ShouldContain("fa: alsoUsed[0].id \"csharp\" is used twice.");
    }

    [Fact]
    public void Validate_AlsoUsedLongerThanOneRow_Fails()
    {
        var profile = Profile() with
        {
            AlsoUsed = [.. Enumerable.Range(0, ResumeContentValidator.MaxAlsoUsed + 1).Select(i => Tech($"tool-{i}"))],
        };

        var result = _validator.Validate(name: null, Content(profile, profile));

        FailuresOf(result).ShouldContain($"fa: alsoUsed has room for at most {ResumeContentValidator.MaxAlsoUsed} technologies (one row of the keyboard).");
    }

    [Fact]
    public void Validate_LanguagesDisagreeOnAlsoUsed_Fails()
    {
        var result = _validator.Validate(name: null, Content(Profile(), Profile() with { AlsoUsed = [Tech("django")] }));

        FailuresOf(result).ShouldContain("fa/en: alsoUsed ids (and their order) must be the same in both languages.");
    }

    [Theory]
    [InlineData("csharp", "csharp", "techStack[1].id \"csharp\" is used twice.")]
    [InlineData("csharp", "C Sharp", "techStack[1].id must be a lowercase slug (e.g. \"csharp\", \"entity-framework\").")]
    public void Validate_BadTechIds_Fails(string first, string second, string expected)
    {
        var profile = Profile() with { TechStack = [Tech(first), Tech(second)], Experience = [Job() with { Tech = [] }] };

        var result = _validator.Validate(name: null, Content(profile, profile));

        FailuresOf(result).ShouldContain($"fa: {expected}");
    }

    [Fact]
    public void Validate_LinkNotHttps_Fails()
    {
        var profile = Profile() with { Links = [new ResumeLink("GitHub", new Uri("http://github.com/example"))] };

        var result = _validator.Validate(name: null, Content(profile, profile));

        FailuresOf(result).ShouldContain("fa: links[0].url must be an absolute https URL.");
    }

    [Fact]
    public void Validate_LanguagesDisagreeOnFacts_Fails()
    {
        // Each file is valid on its own, but the English one moved a job's start date: the two would disagree.
        var result = _validator.Validate(name: null, Content(WithJob("2021-01", end: null), WithJob("2021-02", end: null)));

        FailuresOf(result).ShouldContain("fa/en: experience entries (count, order, dates, tech) must be the same in both languages.");
    }

    // Null when validation succeeded.
    private static IEnumerable<string> FailuresOf(ValidateOptionsResult result) => result.Failures ?? [];

    private static ResumeContent Content(ResumeProfile fa, ResumeProfile en) => new() { Fa = fa, En = en };

    private static ResumeProfile WithJob(string start, string? end) =>
        Profile() with { Experience = [Job() with { Start = start, End = end }] };

    private static ResumeProfile Profile() => new(
        new ResumeBasics("Mahdi Azghandi", "Full-stack engineer", "Builds real systems.", "Iran"),
        Links: [new ResumeLink("GitHub", new Uri("https://github.com/example"))],
        Experience: [Job()],
        Education: [new ResumeEducation("University of Guilan", "BSc", "Electrical Engineering", "2010-09", "2014-06")],
        Skills: [new ResumeSkillGroup("Back-end", ["C#", "PostgreSQL"])],
        TechStack: [Tech("csharp"), Tech("postgresql")],
        AlsoUsed: [Tech("python")]);

    private static ResumeExperience Job() =>
        new("Example Co", "Engineer", "2021-01", "Built things.", ["Shipped a thing."], ["csharp"]);

    private static ResumeTech Tech(string id) => new(id, id, $"About {id}.");
}
