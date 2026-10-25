using PersonalSite.Domain.Common;

namespace PersonalSite.Domain.Media;

/// <summary>
/// An uploaded file's record (architecture.md §4); the bytes live in file storage under <see cref="StorageKey"/>.
/// Checking what a file really is (magic bytes, size limit) happens on upload (P6-T3); this class only keeps the
/// facts consistent.
/// </summary>
public sealed class MediaFile : Entity
{
    public const int StorageKeyMaxLength = 200;
    public const int OriginalFileNameMaxLength = 255;
    public const int ContentTypeMaxLength = 100;
    public const int AltTextMaxLength = 300;

    // For EF Core only: it sets the properties itself. Code creates media files through Create().
    private MediaFile()
    {
    }

    /// <summary>A path relative to the storage root, e.g. <c>2026/10/0192f…a1.webp</c>; never absolute, never <c>..</c>.</summary>
    public string StorageKey { get; private set; } = string.Empty;

    /// <summary>The name on the uploader's computer: shown in the admin only, never used as a path.</summary>
    public string OriginalFileName { get; private set; } = string.Empty;

    public string ContentType { get; private set; } = string.Empty;

    public long SizeBytes { get; private set; }

    /// <summary>Pixels; set for images (with <see cref="Height"/>), null for other files.</summary>
    public int? Width { get; private set; }

    public int? Height { get; private set; }

    /// <summary>Text for screen readers; null when the admin has not written one yet.</summary>
    public string? AltText { get; private set; }

    /// <summary>Pass <paramref name="width"/> and <paramref name="height"/> together for images, neither for other files.</summary>
    public static MediaFile Create(
        string storageKey,
        string originalFileName,
        string contentType,
        long sizeBytes,
        int? width = null,
        int? height = null,
        string? altText = null)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(sizeBytes);
        if (width.HasValue != height.HasValue)
        {
            throw new ArgumentException("Width and height are set together or not at all.", nameof(height));
        }

        if (width is <= 0 || height is <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(width), "Image dimensions must be positive.");
        }

        var file = new MediaFile
        {
            StorageKey = RelativeKey(storageKey),
            OriginalFileName = Guard.Text(originalFileName, OriginalFileNameMaxLength),
            ContentType = Guard.Text(contentType, ContentTypeMaxLength),
            SizeBytes = sizeBytes,
            Width = width,
            Height = height,
        };
        file.ChangeAltText(altText);
        return file;
    }

    public void ChangeAltText(string? altText) => AltText = Guard.OptionalText(altText, AltTextMaxLength);

    // The key is joined to the storage root when the file is read, so anything that could step outside the root
    // (an absolute path, a backslash Windows treats as a separator, a ".." segment) is refused here as well.
    private static string RelativeKey(string storageKey)
    {
        var key = Guard.Text(storageKey, StorageKeyMaxLength);
        var escapesRoot = key.StartsWith('/')
            || key.Contains('\\', StringComparison.Ordinal)
            || key.Contains(':', StringComparison.Ordinal)
            || key.Split('/').Any(segment => segment is "" or "." or "..");
        return escapesRoot
            ? throw new ArgumentException($"'{key}' is not a relative storage key.", nameof(storageKey))
            : key;
    }
}
