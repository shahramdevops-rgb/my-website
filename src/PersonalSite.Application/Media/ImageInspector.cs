using System.Buffers.Binary;

namespace PersonalSite.Application.Media;

/// <summary>The image formats the site accepts for upload.</summary>
public enum ImageFormat
{
    Jpeg,
    Png,
    Webp,
}

/// <summary>What the file's own bytes say it is. Content type and extension come from here, never from the upload.</summary>
public sealed record ImageInfo(ImageFormat Format, int Width, int Height)
{
    public string ContentType => Format switch
    {
        ImageFormat.Jpeg => "image/jpeg",
        ImageFormat.Png => "image/png",
        _ => "image/webp",
    };

    public string Extension => Format switch
    {
        ImageFormat.Jpeg => ".jpg",
        ImageFormat.Png => ".png",
        _ => ".webp",
    };
}

/// <summary>
/// Recognizes JPEG, PNG and WebP by their magic bytes (the fixed signature every file of that format starts with)
/// and reads the pixel size from the header. A file name or a Content-Type header is whatever the sender typed:
/// <c>virus.exe</c> renamed to <c>photo.png</c> still starts with <c>MZ</c>, and is refused here.
/// Only the header is read, not the whole picture decoded: enough to know the type and the size.
/// </summary>
public static class ImageInspector
{
    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static ReadOnlySpan<byte> Vp8StartCode => [0x9D, 0x01, 0x2A];

    /// <summary>The image's format and size, or null when the bytes are not a JPEG, PNG or WebP this can read.</summary>
    public static ImageInfo? Inspect(ReadOnlySpan<byte> data)
    {
        var info = data.StartsWith(PngSignature) ? Png(data)
            : data is [0xFF, 0xD8, 0xFF, ..] ? Jpeg(data)
            : data.Length >= 12 && data.StartsWith("RIFF"u8) && data[8..12].SequenceEqual("WEBP"u8) ? WebP(data)
            : null;

        return info is { Width: > 0, Height: > 0 } ? info : null;
    }

    // The first chunk is always IHDR: length, "IHDR", then width and height as big-endian 32-bit numbers.
    private static ImageInfo? Png(ReadOnlySpan<byte> data)
    {
        if (data.Length < 24 || !data[12..16].SequenceEqual("IHDR"u8))
        {
            return null;
        }

        var width = BinaryPrimitives.ReadUInt32BigEndian(data[16..]);
        var height = BinaryPrimitives.ReadUInt32BigEndian(data[20..]);
        return width <= int.MaxValue && height <= int.MaxValue ? new ImageInfo(ImageFormat.Png, (int)width, (int)height) : null;
    }

    // A JPEG is a list of segments, each "FF <marker> <2-byte length> <data>". The size is in the frame header
    // (a SOF segment), which comes after metadata such as EXIF, so the segments before it are skipped by length.
    private static ImageInfo? Jpeg(ReadOnlySpan<byte> data)
    {
        var position = 2;
        while (position + 4 <= data.Length)
        {
            if (data[position] != 0xFF)
            {
                return null;
            }

            var marker = data[position + 1];
            if (marker == 0xFF)
            {
                // Fill byte: markers may be padded with extra FFs.
                position++;
                continue;
            }

            if (marker is 0x01 or (>= 0xD0 and <= 0xD8))
            {
                // Markers without a length (TEM, RSTn, SOI).
                position += 2;
                continue;
            }

            if (marker is 0xD9 or 0xDA)
            {
                // End of image, or image data starting, before any frame header: not a usable JPEG.
                return null;
            }

            var length = BinaryPrimitives.ReadUInt16BigEndian(data[(position + 2)..]);
            if (length < 2)
            {
                return null;
            }

            if (IsStartOfFrame(marker))
            {
                // Length (2), sample precision (1), height (2), width (2).
                if (position + 9 > data.Length)
                {
                    return null;
                }

                var height = BinaryPrimitives.ReadUInt16BigEndian(data[(position + 5)..]);
                var width = BinaryPrimitives.ReadUInt16BigEndian(data[(position + 7)..]);
                return new ImageInfo(ImageFormat.Jpeg, width, height);
            }

            position += 2 + length;
        }

        return null;
    }

    // SOF0–SOF15, except the three markers that share the range: DHT (C4), JPG (C8) and DAC (CC).
    private static bool IsStartOfFrame(byte marker) => marker is >= 0xC0 and <= 0xCF and not 0xC4 and not 0xC8 and not 0xCC;

    // "RIFF" <size> "WEBP", then the first chunk's name says which of the three WebP flavours this is.
    private static ImageInfo? WebP(ReadOnlySpan<byte> data)
    {
        if (data.Length < 30)
        {
            return null;
        }

        var chunk = data[12..16];
        if (chunk.SequenceEqual("VP8 "u8))
        {
            // Lossy: a 3-byte frame tag, the start code 9D 01 2A, then width and height in 14 bits each.
            return data[23..26].SequenceEqual(Vp8StartCode)
                ? new ImageInfo(
                    ImageFormat.Webp,
                    BinaryPrimitives.ReadUInt16LittleEndian(data[26..]) & 0x3FFF,
                    BinaryPrimitives.ReadUInt16LittleEndian(data[28..]) & 0x3FFF)
                : null;
        }

        if (chunk.SequenceEqual("VP8L"u8))
        {
            // Lossless: the signature byte 2F, then width − 1 and height − 1 in 14 bits each.
            if (data[20] != 0x2F)
            {
                return null;
            }

            var bits = BinaryPrimitives.ReadUInt32LittleEndian(data[21..]);
            return new ImageInfo(ImageFormat.Webp, (int)(bits & 0x3FFF) + 1, (int)((bits >> 14) & 0x3FFF) + 1);
        }

        // Extended (alpha, animation, metadata): 4 bytes of flags, then canvas width − 1 and height − 1 in 24 bits each.
        return chunk.SequenceEqual("VP8X"u8)
            ? new ImageInfo(ImageFormat.Webp, ReadUInt24(data[24..]) + 1, ReadUInt24(data[27..]) + 1)
            : null;
    }

    private static int ReadUInt24(ReadOnlySpan<byte> data) => data[0] | (data[1] << 8) | (data[2] << 16);
}
