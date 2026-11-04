using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PersonalSite.Application.Common.Abstractions;
using PersonalSite.Application.Common.Results;
using PersonalSite.Domain.Media;

namespace PersonalSite.Application.Media;

/// <summary>
/// Uploading images (admin) and reading them back (public <c>GET /media/{key}</c>). A file is accepted only for
/// what its bytes are (<see cref="ImageInspector"/>); the stored record keeps the type and size found there.
/// </summary>
public sealed partial class MediaService(IAppDbContext db, IFileStorage storage, TimeProvider timeProvider, ILogger<MediaService> logger)
{
    /// <summary>Largest accepted file: 5 MB, plenty for a web image.</summary>
    public const long MaxBytes = 5 * 1024 * 1024;

    /// <summary>
    /// Largest accepted width or height. A small file can claim a huge canvas; anything that later decodes images
    /// (thumbnails, previews) would need width × height × 4 bytes of memory for it.
    /// </summary>
    public const int MaxDimension = 10_000;

    /// <summary>Public path prefix of stored files.</summary>
    public const string UrlPrefix = "/media/";

    public async Task<Result<MediaFileDto>> UploadAsync(MediaUpload upload, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(upload);
        if (upload.Length > MaxBytes)
        {
            return MediaErrors.TooLarge;
        }

        if (upload.AltText?.Trim().Length > MediaFile.AltTextMaxLength)
        {
            return MediaErrors.AltTextTooLong;
        }

        // At most 5 MB, already buffered by the server, so reading it whole keeps the checks simple and exact.
        var bytes = new byte[upload.Length];
        await upload.Content.ReadExactlyAsync(bytes, ct);

        if (ImageInspector.Inspect(bytes) is not { } image)
        {
            return MediaErrors.UnsupportedType;
        }

        if (image.Width > MaxDimension || image.Height > MaxDimension)
        {
            return MediaErrors.DimensionsTooLarge;
        }

        var file = MediaFile.Create(
            NewStorageKey(image),
            DisplayName(upload.FileName, image),
            image.ContentType,
            bytes.LongLength,
            image.Width,
            image.Height,
            upload.AltText);

        // Bytes first, then the record: a record must never point at a file that isn't there. If saving the record
        // fails, the file is removed again, so no orphan is left on disk.
        await storage.SaveAsync(file.StorageKey, bytes, ct);
        try
        {
            db.MediaFiles.Add(file);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            await storage.DeleteAsync(file.StorageKey, CancellationToken.None);
            throw;
        }

        return ToDto(file);
    }

    /// <summary>
    /// Opens a stored file by its key. Only keys with a record are served: a stray file in the uploads directory,
    /// or a key someone made up, is a 404 without touching the disk.
    /// </summary>
    public async Task<Result<MediaContent>> OpenAsync(string storageKey, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(storageKey);
        if (storageKey.Length > MediaFile.StorageKeyMaxLength)
        {
            return MediaErrors.NotFound;
        }

        var contentType = await db.MediaFiles
            .AsNoTracking()
            .Where(file => file.StorageKey == storageKey)
            .Select(file => file.ContentType)
            .SingleOrDefaultAsync(ct);
        if (contentType is null)
        {
            return MediaErrors.NotFound;
        }

        if (await storage.OpenReadAsync(storageKey, ct) is not { } content)
        {
            // A record without its bytes: e.g. a database restored without the matching uploads backup.
            LogFileMissing(storageKey);
            return MediaErrors.NotFound;
        }

        return new MediaContent(content, contentType);
    }

    private static MediaFileDto ToDto(MediaFile file) => new(
        file.Id,
        UrlPrefix + file.StorageKey,
        file.OriginalFileName,
        file.ContentType,
        file.SizeBytes,
        file.Width,
        file.Height,
        file.AltText);

    // Year/month folders keep directories small; the name is a fresh UUID v7, the extension the real format's.
    // Nothing here comes from the upload, so no name can collide, overwrite or step outside the folder.
    private string NewStorageKey(ImageInfo image)
    {
        var now = timeProvider.GetUtcNow();
        return string.Create(CultureInfo.InvariantCulture, $"{now:yyyy}/{now:MM}/{Guid.CreateVersion7():N}{image.Extension}");
    }

    // Shown in the admin only. Browsers may send "C:\fakepath\photo.jpg" or a path: keep the last segment, drop
    // control characters, and cut to the column's length without splitting a surrogate pair (invalid UTF-8).
    private static string DisplayName(string? fileName, ImageInfo image)
    {
        var name = fileName ?? string.Empty;
        name = new string([.. name[(name.LastIndexOfAny(['/', '\\']) + 1)..].Where(c => !char.IsControl(c))]).Trim();
        if (name.Length == 0)
        {
            return "upload" + image.Extension;
        }

        var max = MediaFile.OriginalFileNameMaxLength;
        return name.Length <= max ? name : name[..(char.IsHighSurrogate(name[max - 1]) ? max - 1 : max)].TrimEnd();
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Media record {StorageKey} has no file in storage")]
    private partial void LogFileMissing(string storageKey);
}
