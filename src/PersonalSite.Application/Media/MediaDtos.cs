namespace PersonalSite.Application.Media;

/// <summary>
/// An upload as the Api received it. <paramref name="FileName"/> is the sender's name for it and is only shown in
/// the admin; nothing about the stored file (key, extension, content type) is taken from it.
/// </summary>
public sealed record MediaUpload(Stream Content, long Length, string? FileName, string? AltText);

/// <summary>A stored media file. <paramref name="Url"/> is site-relative (<c>/media/2026/11/….webp</c>).</summary>
public sealed record MediaFileDto(
    Guid Id,
    string Url,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    int? Width,
    int? Height,
    string? AltText);

/// <summary>A stored file opened for reading; whoever writes it to the response disposes <paramref name="Content"/>.</summary>
public sealed record MediaContent(Stream Content, string ContentType);
