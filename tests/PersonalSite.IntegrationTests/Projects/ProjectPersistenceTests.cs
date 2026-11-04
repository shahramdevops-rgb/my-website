using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PersonalSite.Domain.Common;
using PersonalSite.Domain.Media;
using PersonalSite.Domain.Projects;
using PersonalSite.Infrastructure.Persistence;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Projects;

/// <summary>
/// The projects and media_files tables (P6-T2) on real PostgreSQL: values survive a round trip, and the database
/// itself refuses what the domain forbids. Every test uses its own slugs and keys, so the shared database needs no
/// cleanup between tests.
/// </summary>
public sealed class ProjectPersistenceTests(WebAppFactory factory)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Save_ProjectWithEveryField_ReadsBackTheSameValues()
    {
        var cover = NewMediaFile(width: 1200, height: 630, altText: "Check-in screen");
        var project = NewProject(Language.Fa);
        project.SetBody("# Problem", "<h1>Problem</h1>");
        // %20 and the query: OriginalString keeps them exactly as given.
        project.SetLinks(new Uri("https://gym.example.com/a%20b?x=1"), new Uri("http://example.com/src"), new Uri("https://gym.example.com/health"));
        project.SetDemo(DemoKey.Gym);
        project.SetTechStack(["postgresql", "dotnet", "ef-core"]);
        project.SetCoverImage(cover.Id);
        project.SetPeriod(new DateOnly(2024, 3, 1), new DateOnly(2025, 1, 31));
        project.MarkLive();
        project.Feature();
        project.Reorder(3);
        await SaveAsync(cover, project);

        await using var scope = factory.Services.CreateAsyncScope();
        var db = Db(scope);
        var saved = await db.Projects.AsNoTracking().SingleAsync(p => p.Id == project.Id, Ct);
        var savedCover = await db.MediaFiles.AsNoTracking().SingleAsync(f => f.Id == cover.Id, Ct);

        saved.Language.ShouldBe(Language.Fa);
        saved.TranslationGroup.ShouldBe(project.TranslationGroup);
        saved.Slug.ShouldBe(project.Slug);
        saved.Title.ShouldBe(project.Title);
        saved.Summary.ShouldBe(project.Summary);
        saved.BodyMarkdown.ShouldBe("# Problem");
        saved.BodyHtml.ShouldBe("<h1>Problem</h1>");
        saved.Status.ShouldBe(ProjectStatus.Live);
        saved.LiveUrl.ShouldNotBeNull().OriginalString.ShouldBe("https://gym.example.com/a%20b?x=1");
        saved.SourceUrl.ShouldBe(new Uri("http://example.com/src"));
        saved.HealthUrl.ShouldBe(new Uri("https://gym.example.com/health"));
        saved.DemoKey.ShouldBe(DemoKey.Gym);
        saved.TechStack.ShouldBe(["postgresql", "dotnet", "ef-core"]);
        saved.CoverImageId.ShouldBe(cover.Id);
        saved.IsFeatured.ShouldBeTrue();
        saved.SortOrder.ShouldBe(3);
        saved.StartedOn.ShouldBe(new DateOnly(2024, 3, 1));
        saved.FinishedOn.ShouldBe(new DateOnly(2025, 1, 31));
        saved.CreatedAt.ShouldNotBe(default);
        saved.UpdatedAt.ShouldBe(saved.CreatedAt);

        savedCover.StorageKey.ShouldBe(cover.StorageKey);
        savedCover.OriginalFileName.ShouldBe("cover.webp");
        savedCover.ContentType.ShouldBe("image/webp");
        savedCover.SizeBytes.ShouldBe(cover.SizeBytes);
        savedCover.Width.ShouldBe(1200);
        savedCover.Height.ShouldBe(630);
        savedCover.AltText.ShouldBe("Check-in screen");
    }

    [Fact]
    public async Task Save_Project_StoresLanguageAndEnumsAsReadableText()
    {
        var project = NewProject(Language.En);
        project.SetDemo(DemoKey.Cinema);
        await SaveAsync(project);

        await using var scope = factory.Services.CreateAsyncScope();
        var row = await Db(scope).Database
            .SqlQuery<string>($"SELECT language || ' ' || status || ' ' || demo_key AS \"Value\" FROM projects WHERE id = {project.Id}")
            .SingleAsync(Ct);

        row.ShouldBe("en InProgress Cinema");
    }

    [Fact]
    public async Task Save_SameSlugInSameLanguage_ViolatesUniqueIndex()
    {
        var first = NewProject(Language.En);
        await SaveAsync(first);

        var error = await ShouldFailAsync(() => SaveAsync(Project.Create(Language.En, first.Slug, "Other", "Other")));

        error.SqlState.ShouldBe(PostgresErrorCodes.UniqueViolation);
        error.ConstraintName.ShouldBe("ix_projects_language_slug");
    }

    [Fact]
    public async Task Save_TranslationWithSameSlug_Succeeds()
    {
        var persian = NewProject(Language.Fa);
        var english = Project.Create(Language.En, persian.Slug, "Gym system", "Check-ins and lockers", persian.TranslationGroup);

        await SaveAsync(persian, english);

        await using var scope = factory.Services.CreateAsyncScope();
        (await Db(scope).Projects.CountAsync(p => p.TranslationGroup == persian.TranslationGroup, Ct)).ShouldBe(2);
    }

    [Fact]
    public async Task Save_SecondTranslationInSameLanguage_ViolatesUniqueIndex()
    {
        var first = NewProject(Language.Fa);
        await SaveAsync(first);

        var error = await ShouldFailAsync(() =>
            SaveAsync(Project.Create(Language.Fa, UniqueSlug(), "Copy", "Copy", first.TranslationGroup)));

        error.SqlState.ShouldBe(PostgresErrorCodes.UniqueViolation);
        error.ConstraintName.ShouldBe("ix_projects_translation_group_language");
    }

    [Fact]
    public async Task Delete_MediaFileUsedAsCover_IsRefused()
    {
        var cover = NewMediaFile(width: 800, height: 600);
        var project = NewProject(Language.En);
        project.SetCoverImage(cover.Id);
        await SaveAsync(cover, project);

        var error = await ShouldFailAsync(async () =>
        {
            await using var scope = factory.Services.CreateAsyncScope();
            await Db(scope).MediaFiles.Where(f => f.Id == cover.Id).ExecuteDeleteAsync(Ct);
        });

        error.SqlState.ShouldBe(PostgresErrorCodes.ForeignKeyViolation);
        error.ConstraintName.ShouldBe("fk_projects_media_files_cover_image_id");
    }

    [Fact]
    public async Task Save_TwoMediaFilesWithSameStorageKey_ViolatesUniqueIndex()
    {
        var first = NewMediaFile();
        await SaveAsync(first);

        var error = await ShouldFailAsync(() =>
            SaveAsync(MediaFile.Create(first.StorageKey, "copy.webp", "image/webp", 10)));

        error.SqlState.ShouldBe(PostgresErrorCodes.UniqueViolation);
        error.ConstraintName.ShouldBe("ix_media_files_storage_key");
    }

    [Fact]
    public async Task Update_ArchivingAFeaturedProjectBySql_ViolatesCheckConstraint()
    {
        var project = NewProject(Language.En);
        project.Feature();
        await SaveAsync(project);

        // The domain clears IsFeatured on Archive(); a hand-written UPDATE that forgets it is stopped by the database.
        var error = await ShouldFailAsync(async () =>
        {
            await using var scope = factory.Services.CreateAsyncScope();
            await Db(scope).Database.ExecuteSqlAsync($"UPDATE projects SET status = 'Archived' WHERE id = {project.Id}", Ct);
        });

        error.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
        error.ConstraintName.ShouldBe("ck_projects_archived_not_featured");
    }

    private static AppDbContext Db(AsyncServiceScope scope) => scope.ServiceProvider.GetRequiredService<AppDbContext>();

    private static Slug UniqueSlug() => Slug.Create($"test-{Guid.NewGuid():N}");

    private static Project NewProject(Language language) =>
        Project.Create(language, UniqueSlug(), "Gym management system", "Check-ins, lockers and memberships");

    private static MediaFile NewMediaFile(int? width = null, int? height = null, string? altText = null) =>
        MediaFile.Create($"test/{Guid.NewGuid():N}.webp", "cover.webp", "image/webp", 48_213, width, height, altText);

    private async Task SaveAsync(params object[] entities)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = Db(scope);
        db.AddRange(entities);
        await db.SaveChangesAsync(Ct);
    }

    // SaveChanges wraps the server's error in a DbUpdateException; ExecuteDelete and raw SQL throw it directly.
    private static async Task<PostgresException> ShouldFailAsync(Func<Task> action)
    {
        var error = await Should.ThrowAsync<Exception>(action);
        return (error as PostgresException ?? error.InnerException as PostgresException).ShouldNotBeNull();
    }
}
