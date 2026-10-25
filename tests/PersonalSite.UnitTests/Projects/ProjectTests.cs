using PersonalSite.Domain.Common;
using PersonalSite.Domain.Projects;

namespace PersonalSite.UnitTests.Projects;

public sealed class ProjectTests
{
    [Fact]
    public void Create_NewProject_StartsInProgressWithOwnTranslationGroup()
    {
        var project = Project.Create(Language.Fa, Slug.Create("gym"), "  Gym system  ", "Check-ins and lockers.");

        project.Status.ShouldBe(ProjectStatus.InProgress);
        project.Title.ShouldBe("Gym system");
        project.TranslationGroup.ShouldNotBe(Guid.Empty);
        project.IsFeatured.ShouldBeFalse();
        project.BodyMarkdown.ShouldBeEmpty();
        project.TechStack.ShouldBeEmpty();
    }

    [Fact]
    public void Create_WithTranslationGroup_JoinsThatGroup()
    {
        var persian = NewProject();

        var english = Project.Create(Language.En, Slug.Create("gym"), "Gym system", "Check-ins.", persian.TranslationGroup);

        english.TranslationGroup.ShouldBe(persian.TranslationGroup);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_BlankTitle_Throws(string title)
    {
        Should.Throw<ArgumentException>(() => Project.Create(Language.Fa, Slug.Create("gym"), title, "Summary."));
    }

    [Fact]
    public void UpdateDetails_TitleTooLong_Throws()
    {
        var project = NewProject();

        Should.Throw<ArgumentException>(() => project.UpdateDetails(new string('a', Project.TitleMaxLength + 1), "Summary."));
    }

    [Fact]
    public void SetBody_MarkdownAndHtml_StoresBoth()
    {
        var project = NewProject();

        project.SetBody("## Problem", "<h2 id=\"problem\">Problem</h2>");

        project.BodyMarkdown.ShouldBe("## Problem");
        project.BodyHtml.ShouldBe("<h2 id=\"problem\">Problem</h2>");
    }

    [Fact]
    public void SetLinks_HttpsHealthUrl_StoresLinks()
    {
        var project = NewProject();

        project.SetLinks(new Uri("http://gym.example"), new Uri("https://github.com/x/y"), new Uri("https://gym.example/health"));

        project.LiveUrl.ShouldBe(new Uri("http://gym.example"));
        project.HealthUrl.ShouldBe(new Uri("https://gym.example/health"));
    }

    [Fact]
    public void SetLinks_HttpHealthUrl_Throws()
    {
        var project = NewProject();

        Should.Throw<ArgumentException>(() => project.SetLinks(null, null, new Uri("http://gym.example/health")));
    }

    [Theory]
    [InlineData("ftp://gym.example")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://user:secret@gym.example")]
    public void SetLinks_UnsafeLiveUrl_Throws(string url)
    {
        var project = NewProject();

        Should.Throw<ArgumentException>(() => project.SetLinks(new Uri(url), null, null));
    }

    [Fact]
    public void SetLinks_RelativeUrl_Throws()
    {
        var project = NewProject();

        Should.Throw<ArgumentException>(() => project.SetLinks(new Uri("/projects/gym", UriKind.Relative), null, null));
    }

    [Fact]
    public void SetLinks_Nulls_ClearsLinks()
    {
        var project = NewProject();
        project.SetLinks(new Uri("https://gym.example"), null, new Uri("https://gym.example/health"));

        project.SetLinks(null, null, null);

        project.LiveUrl.ShouldBeNull();
        project.HealthUrl.ShouldBeNull();
    }

    [Fact]
    public void SetTechStack_RepeatedIds_KeepsFirstOfEachInOrder()
    {
        var project = NewProject();

        project.SetTechStack(["dotnet", "postgresql", "dotnet", "ef-core"]);

        project.TechStack.ShouldBe(["dotnet", "postgresql", "ef-core"]);
    }

    [Theory]
    [InlineData("")]
    [InlineData("ASP.NET Core")]
    [InlineData("React")]
    [InlineData(" react")]
    public void SetTechStack_NotAnId_Throws(string id)
    {
        var project = NewProject();

        Should.Throw<ArgumentException>(() => project.SetTechStack(["dotnet", id]));
    }

    [Fact]
    public void SetTechStack_TooMany_Throws()
    {
        var project = NewProject();
        var ids = Enumerable.Range(1, Project.TechStackMaxCount + 1).Select(i => $"tech-{i}");

        Should.Throw<ArgumentException>(() => project.SetTechStack(ids));
    }

    [Fact]
    public void SetCoverImage_EmptyGuid_Throws()
    {
        var project = NewProject();

        Should.Throw<ArgumentException>(() => project.SetCoverImage(Guid.Empty));
    }

    [Fact]
    public void SetPeriod_FinishedBeforeStarted_Throws()
    {
        var project = NewProject();

        Should.Throw<ArgumentException>(() => project.SetPeriod(new DateOnly(2026, 5, 1), new DateOnly(2026, 4, 1)));
    }

    [Fact]
    public void SetPeriod_OnlyStarted_StoresIt()
    {
        var project = NewProject();

        project.SetPeriod(new DateOnly(2026, 5, 1), null);

        project.StartedOn.ShouldBe(new DateOnly(2026, 5, 1));
        project.FinishedOn.ShouldBeNull();
    }

    [Fact]
    public void Feature_LiveProject_SetsIsFeatured()
    {
        var project = NewProject();
        project.MarkLive();

        project.Feature();

        project.IsFeatured.ShouldBeTrue();
    }

    [Fact]
    public void Archive_FeaturedProject_ArchivesAndUnfeatures()
    {
        var project = NewProject();
        project.Feature();

        project.Archive();

        project.Status.ShouldBe(ProjectStatus.Archived);
        project.IsFeatured.ShouldBeFalse();
    }

    [Fact]
    public void Feature_ArchivedProject_Throws()
    {
        var project = NewProject();
        project.Archive();

        Should.Throw<InvalidOperationException>(project.Feature);
    }

    [Fact]
    public void MarkLive_ArchivedProject_CanBeFeaturedAgain()
    {
        var project = NewProject();
        project.Archive();

        project.MarkLive();
        project.Feature();

        project.IsFeatured.ShouldBeTrue();
    }

    [Fact]
    public void Reorder_NonNegative_SetsSortOrder()
    {
        var project = NewProject();

        project.Reorder(3);

        project.SortOrder.ShouldBe(3);
    }

    [Fact]
    public void Reorder_Negative_Throws()
    {
        var project = NewProject();

        Should.Throw<ArgumentOutOfRangeException>(() => project.Reorder(-1));
    }

    private static Project NewProject() =>
        Project.Create(Language.Fa, Slug.Create("gym"), "Gym system", "Check-ins and lockers.");
}
