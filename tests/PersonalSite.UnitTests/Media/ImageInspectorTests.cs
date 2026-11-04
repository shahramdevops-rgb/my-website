using PersonalSite.Application.Media;

namespace PersonalSite.UnitTests.Media;

public sealed class ImageInspectorTests
{
    public static TheoryData<string, byte[], ImageFormat, int, int> Images => new()
    {
        { "real 1×1 PNG", TestImages.OnePixelPng, ImageFormat.Png, 1, 1 },
        { "PNG", TestImages.Png(640, 480), ImageFormat.Png, 640, 480 },
        { "baseline JPEG", TestImages.Jpeg(1600, 900), ImageFormat.Jpeg, 1600, 900 },
        { "progressive JPEG with fill bytes", TestImages.ProgressiveJpegWithFillBytes(300, 200), ImageFormat.Jpeg, 300, 200 },
        { "lossy WebP", TestImages.LossyWebp(800, 600), ImageFormat.Webp, 800, 600 },
        { "lossless WebP", TestImages.LosslessWebp(1024, 768), ImageFormat.Webp, 1024, 768 },
        { "extended WebP", TestImages.ExtendedWebp(4000, 3000), ImageFormat.Webp, 4000, 3000 },
    };

    public static TheoryData<string, byte[]> NotImages => new()
    {
        { "Windows program", TestImages.Executable },
        { "empty file", [] },
        { "GIF", [.. "GIF89a"u8, 1, 0, 1, 0, 0, 0, 0] },
        { "SVG", [.. "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"u8] },
        { "truncated PNG", TestImages.Png(640, 480)[..20] },
        { "PNG of zero width", TestImages.Png(0, 480) },
        { "JPEG without a frame header", TestImages.JpegWithoutFrameHeader },
        { "WAV (RIFF but not WebP)", [.. "RIFF"u8, 36, 0, 0, 0, .. "WAVE"u8, .. "fmt "u8, .. new byte[20]] },
    };

    [Theory]
    [MemberData(nameof(Images))]
    public void Inspect_SupportedImage_ReadsFormatAndSize(string name, byte[] data, ImageFormat format, int width, int height)
    {
        var info = ImageInspector.Inspect(data).ShouldNotBeNull(name);

        info.Format.ShouldBe(format);
        info.Width.ShouldBe(width);
        info.Height.ShouldBe(height);
    }

    [Theory]
    [MemberData(nameof(NotImages))]
    public void Inspect_AnythingElse_ReturnsNull(string name, byte[] data) =>
        ImageInspector.Inspect(data).ShouldBeNull(name);

    [Theory]
    [InlineData(ImageFormat.Jpeg, "image/jpeg", ".jpg")]
    [InlineData(ImageFormat.Png, "image/png", ".png")]
    [InlineData(ImageFormat.Webp, "image/webp", ".webp")]
    public void ImageInfo_Format_GivesContentTypeAndExtension(ImageFormat format, string contentType, string extension)
    {
        var info = new ImageInfo(format, 1, 1);

        info.ContentType.ShouldBe(contentType);
        info.Extension.ShouldBe(extension);
    }
}
