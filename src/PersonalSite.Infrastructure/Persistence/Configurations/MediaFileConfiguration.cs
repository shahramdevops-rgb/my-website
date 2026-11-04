using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PersonalSite.Domain.Media;

namespace PersonalSite.Infrastructure.Persistence.Configurations;

/// <summary>Table <c>media_files</c> (architecture.md §4): the record of a file whose bytes live in file storage.</summary>
internal sealed class MediaFileConfiguration : IEntityTypeConfiguration<MediaFile>
{
    public void Configure(EntityTypeBuilder<MediaFile> builder)
    {
        builder.ToTable(table =>
        {
            table.HasCheckConstraint("ck_media_files_size_bytes", "size_bytes > 0");
            table.HasCheckConstraint(
                "ck_media_files_dimensions",
                "(width IS NULL AND height IS NULL) OR (width > 0 AND height > 0)");
        });

        builder.Property(file => file.Id).ValueGeneratedNever();

        builder.Property(file => file.StorageKey).HasMaxLength(MediaFile.StorageKeyMaxLength);
        builder.Property(file => file.OriginalFileName).HasMaxLength(MediaFile.OriginalFileNameMaxLength);
        builder.Property(file => file.ContentType).HasMaxLength(MediaFile.ContentTypeMaxLength);
        builder.Property(file => file.AltText).HasMaxLength(MediaFile.AltTextMaxLength);

        // GET /media/{key} looks a file up by its key, and two records must never point at the same bytes:
        // deleting one would delete the other's file.
        builder.HasIndex(file => file.StorageKey).IsUnique();
    }
}
