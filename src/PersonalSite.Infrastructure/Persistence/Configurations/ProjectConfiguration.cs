using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalSite.Domain.Common;
using PersonalSite.Domain.Media;
using PersonalSite.Domain.Projects;
using PersonalSite.Infrastructure.Persistence.Conversions;

namespace PersonalSite.Infrastructure.Persistence.Configurations;

/// <summary>
/// Table <c>projects</c> (architecture.md §4). Lengths come from the entity's constants, so the column and the
/// domain rule cannot disagree. The check constraints repeat a few domain rules in the database: the domain throws
/// before a bad value gets here, so they only catch a bug or a hand-written UPDATE.
/// </summary>
internal sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    // Longest name is "InProgress"; room for a longer status later without a column change.
    private const int _enumMaxLength = 20;

    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_projects_period", "finished_on IS NULL OR started_on IS NULL OR started_on <= finished_on");
            table.HasCheckConstraint("ck_projects_sort_order", "sort_order >= 0");
            table.HasCheckConstraint("ck_projects_archived_not_featured", "NOT (is_featured AND status = 'Archived')");
        });

        // UUID v7 made in code (Entity), never by the database.
        builder.Property(project => project.Id).ValueGeneratedNever();

        builder.Property(project => project.Language).HasConversion<LanguageConverter>().HasMaxLength(LanguageConverter.MaxLength);
        builder.Property(project => project.Slug).HasConversion<SlugConverter>().HasMaxLength(Slug.MaxLength);
        builder.Property(project => project.Title).HasMaxLength(Project.TitleMaxLength);
        builder.Property(project => project.Summary).HasMaxLength(Project.SummaryMaxLength);

        // Bodies have no limit (rules.md §7): text columns.
        builder.Property(project => project.BodyMarkdown);
        builder.Property(project => project.BodyHtml);

        builder.Property(project => project.Status).HasConversion<string>().HasMaxLength(_enumMaxLength);
        builder.Property(project => project.DemoKey).HasConversion<string>().HasMaxLength(_enumMaxLength);

        builder.Property(project => project.LiveUrl).HasConversion<AbsoluteUriConverter>().HasMaxLength(Project.UrlMaxLength);
        builder.Property(project => project.SourceUrl).HasConversion<AbsoluteUriConverter>().HasMaxLength(Project.UrlMaxLength);
        builder.Property(project => project.HealthUrl).HasConversion<AbsoluteUriConverter>().HasMaxLength(Project.UrlMaxLength);

        // A PostgreSQL array (character varying(40)[]): the ids are values of the project, read with it and never
        // joined on their own, so a join table would add a table and a query for nothing. Order is kept.
        builder.PrimitiveCollection(project => project.TechStack).ElementType().HasMaxLength(Project.TechIdMaxLength);

        // A media file in use as a cover cannot be deleted: the admin replaces the cover first. SET NULL would make
        // a public page lose its image without anyone deciding that.
        builder.HasOne<MediaFile>()
            .WithMany()
            .HasForeignKey(project => project.CoverImageId)
            .OnDelete(DeleteBehavior.Restrict);

        // The public URL /{lang}/projects/{slug}: one project per slug in each language, the same slug may be reused
        // by its translation.
        builder.HasIndex(project => new { project.Language, project.Slug }).IsUnique();

        // One row per language in a translation group; also serves "find this project's translations" (hreflang).
        builder.HasIndex(project => new { project.TranslationGroup, project.Language }).IsUnique();

        // The public list and Home's featured cards: WHERE language = @lang ORDER BY sort_order.
        builder.HasIndex(project => new { project.Language, project.SortOrder });
    }
}
