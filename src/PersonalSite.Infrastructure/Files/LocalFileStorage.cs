using Microsoft.Extensions.Options;
using PersonalSite.Application.Common.Abstractions;

namespace PersonalSite.Infrastructure.Files;

/// <summary>
/// <see cref="IFileStorage"/> on a local directory (the <c>uploads</c> volume in production). Keys are relative
/// paths under the root; every key is resolved to a full path and checked to still be under the root, so a key
/// such as <c>../../etc/passwd</c> or <c>/etc/passwd</c> fails even if a caller forgot to validate it.
/// </summary>
internal sealed class LocalFileStorage(IOptions<FileStorageOptions> options) : IFileStorage
{
    // Windows paths are case-insensitive, Linux paths are not.
    private static readonly StringComparison _pathComparison =
        OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

    // With a trailing separator, so "/app/data/uploads-old" does not count as inside "/app/data/uploads".
    private readonly string _root =
        Path.TrimEndingDirectorySeparator(Path.GetFullPath(options.Value.UploadsPath)) + Path.DirectorySeparatorChar;

    public async Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken ct)
    {
        var path = PathFor(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        // Written under a temporary name, then renamed: a reader never sees half a file, and the rename (no
        // overwrite) fails if the key already exists. Same directory, so the rename is atomic on one file system.
        var temporary = $"{path}.{Guid.NewGuid():N}.tmp";
        try
        {
            await using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, FileOptions.Asynchronous))
            {
                await stream.WriteAsync(content, ct);
            }

            File.Move(temporary, path, overwrite: false);
        }
        finally
        {
            // Nothing left to delete after a successful move.
            File.Delete(temporary);
        }
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
    {
        try
        {
            Stream stream = new FileStream(PathFor(key), FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.Asynchronous);
            return Task.FromResult<Stream?>(stream);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            return Task.FromResult<Stream?>(null);
        }
    }

    public Task DeleteAsync(string key, CancellationToken ct)
    {
        var path = PathFor(key);
        if (File.Exists(path))
        {
            File.Delete(path);
        }

        return Task.CompletedTask;
    }

    private string PathFor(string key)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        var path = Path.GetFullPath(Path.Combine(_root, key));
        return path.StartsWith(_root, _pathComparison)
            ? path
            : throw new ArgumentException("The key leads outside the storage root.", nameof(key));
    }
}
