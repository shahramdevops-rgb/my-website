using System.Buffers.Binary;

namespace PersonalSite.UnitTests.Media;

/// <summary>
/// File headers built byte by byte, just enough for <c>ImageInspector</c>: it reads signatures and sizes, never
/// pixels. <see cref="OnePixelPng"/> is a complete, valid file.
/// </summary>
internal static class TestImages
{
    public static byte[] OnePixelPng { get; } = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

    public static byte[] Png(int width, int height) =>
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0, 0, 0, 13, .. "IHDR"u8, .. BigEndian32(width), .. BigEndian32(height),
        8, 6, 0, 0, 0, 0, 0, 0, 0,
    ];

    /// <summary>SOI, an APP0 (JFIF) segment, then a baseline frame header (SOF0), the scan and EOI.</summary>
    public static byte[] Jpeg(int width, int height) =>
    [
        0xFF, 0xD8,
        0xFF, 0xE0, 0x00, 0x10, .. "JFIF\0"u8, 1, 1, 0, 0, 1, 0, 1, 0, 0,
        0xFF, 0xC0, 0x00, 0x11, 8, .. BigEndian16(height), .. BigEndian16(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
        0xFF, 0xDA, 0x00, 0x08, 1, 1, 0, 0, 0x3F, 0,
        0xFF, 0xD9,
    ];

    /// <summary>A quantization table and fill bytes before a progressive frame header (SOF2).</summary>
    public static byte[] ProgressiveJpegWithFillBytes(int width, int height) =>
    [
        0xFF, 0xD8,
        0xFF, 0xDB, 0x00, 0x04, 0, 0,
        0xFF, 0xFF, 0xFF, 0xC2, 0x00, 0x0B, 8, .. BigEndian16(height), .. BigEndian16(width), 1, 1, 0x11, 0,
        0xFF, 0xD9,
    ];

    /// <summary>A JPEG whose image data starts before any frame header says how big it is.</summary>
    public static byte[] JpegWithoutFrameHeader =>
    [
        0xFF, 0xD8,
        0xFF, 0xDA, 0x00, 0x08, 1, 1, 0, 0, 0x3F, 0,
        0xFF, 0xD9,
    ];

    public static byte[] LossyWebp(int width, int height) =>
        Riff([.. "VP8 "u8, .. LittleEndian32(10), 0x30, 0x01, 0x00, 0x9D, 0x01, 0x2A, .. LittleEndian16(width), .. LittleEndian16(height)]);

    public static byte[] LosslessWebp(int width, int height) =>
        Riff([.. "VP8L"u8, .. LittleEndian32(5), 0x2F, .. LittleEndian32((width - 1) | ((height - 1) << 14)), 0, 0, 0, 0, 0]);

    public static byte[] ExtendedWebp(int width, int height) =>
        Riff([.. "VP8X"u8, .. LittleEndian32(10), 0x10, 0, 0, 0, .. LittleEndian24(width - 1), .. LittleEndian24(height - 1)]);

    /// <summary>A Windows program: every .exe starts with "MZ", whatever its file is named.</summary>
    public static byte[] Executable => [.. "MZ"u8, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, .. new byte[50]];

    private static byte[] Riff(byte[] chunk) => [.. "RIFF"u8, .. LittleEndian32(chunk.Length + 4), .. "WEBP"u8, .. chunk];

    private static byte[] BigEndian16(int value)
    {
        var bytes = new byte[2];
        BinaryPrimitives.WriteUInt16BigEndian(bytes, checked((ushort)value));
        return bytes;
    }

    private static byte[] BigEndian32(int value)
    {
        var bytes = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(bytes, value);
        return bytes;
    }

    private static byte[] LittleEndian16(int value)
    {
        var bytes = new byte[2];
        BinaryPrimitives.WriteUInt16LittleEndian(bytes, checked((ushort)value));
        return bytes;
    }

    private static byte[] LittleEndian24(int value) => [(byte)value, (byte)(value >> 8), (byte)(value >> 16)];

    private static byte[] LittleEndian32(int value)
    {
        var bytes = new byte[4];
        BinaryPrimitives.WriteInt32LittleEndian(bytes, value);
        return bytes;
    }
}
