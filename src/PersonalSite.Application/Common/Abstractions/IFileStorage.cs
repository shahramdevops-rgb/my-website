namespace PersonalSite.Application.Common.Abstractions;

/// <summary>
/// Where uploaded files' bytes live, addressed by a relative storage key (<c>2026/11/0192f…a1.webp</c>). Today a
/// directory on the uploads volume (<c>LocalFileStorage</c>); an object store would be another implementation.
/// The caller makes the key; the storage only refuses a key that would lead outside its root.
/// </summary>
public interface IFileStorage
{
    /// <summary>Stores a new file. A key that already exists is an error: stored files never change.</summary>
    Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken ct);

    /// <summary>Opens the file for reading, or returns null when there is none. The caller disposes the stream.</summary>
    Task<Stream?> OpenReadAsync(string key, CancellationToken ct);

    /// <summary>Deletes the file; a missing file is not an error.</summary>
    Task DeleteAsync(string key, CancellationToken ct);
}
