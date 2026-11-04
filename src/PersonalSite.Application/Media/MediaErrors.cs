using PersonalSite.Application.Common.Results;
using PersonalSite.Domain.Media;

namespace PersonalSite.Application.Media;

/// <summary>Expected failures of uploading and serving media. The codes are part of the API contract.</summary>
public static class MediaErrors
{
    public static readonly Error TooLarge = new(
        "media.too_large", $"The file is larger than {MediaService.MaxBytes / (1024 * 1024)} MB.", ErrorKind.TooLarge);

    public static readonly Error UnsupportedType = new(
        "media.unsupported_type", "The file is not a JPEG, PNG or WebP image.", ErrorKind.Validation);

    public static readonly Error DimensionsTooLarge = new(
        "media.dimensions_too_large", $"The image is wider or taller than {MediaService.MaxDimension} pixels.", ErrorKind.Validation);

    public static readonly Error AltTextTooLong = new(
        "media.alt_text_too_long", $"The alt text is longer than {MediaFile.AltTextMaxLength} characters.", ErrorKind.Validation);

    public static readonly Error NotFound = new("media.not_found", "No such file.", ErrorKind.NotFound);
}
