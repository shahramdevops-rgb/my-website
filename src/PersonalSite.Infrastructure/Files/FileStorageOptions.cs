namespace PersonalSite.Infrastructure.Files;

/// <summary>
/// Section <c>Media</c>. <see cref="UploadsPath"/> is the directory uploaded files go to; a relative path is resolved
/// against the working directory, which is <c>/app</c> in the image, so the default <c>data/uploads</c> is the
/// <c>uploads</c> volume's mount point (<c>/app/data/uploads</c>).
/// </summary>
public sealed class FileStorageOptions
{
    public const string SectionName = "Media";

    public string UploadsPath { get; set; } = string.Empty;
}
