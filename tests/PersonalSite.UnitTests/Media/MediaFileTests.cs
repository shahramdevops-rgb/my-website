using PersonalSite.Domain.Media;

namespace PersonalSite.UnitTests.Media;

public sealed class MediaFileTests
{
    [Fact]
    public void Create_Image_StoresFacts()
    {
        var file = MediaFile.Create("2026/10/cover.webp", "Cover.webp", "image/webp", 52_000, 1600, 900, "  Gym dashboard  ");

        file.StorageKey.ShouldBe("2026/10/cover.webp");
        file.Width.ShouldBe(1600);
        file.Height.ShouldBe(900);
        file.AltText.ShouldBe("Gym dashboard");
    }

    [Fact]
    public void Create_DocumentWithoutDimensions_LeavesThemNull()
    {
        var file = MediaFile.Create("resume/en.pdf", "Resume.pdf", "application/pdf", 120_000);

        file.Width.ShouldBeNull();
        file.Height.ShouldBeNull();
        file.AltText.ShouldBeNull();
    }

    [Theory]
    [InlineData("/etc/passwd")]
    [InlineData("../secrets.txt")]
    [InlineData("2026/../../x.webp")]
    [InlineData("2026//x.webp")]
    [InlineData("2026\\x.webp")]
    [InlineData("C:x.webp")]
    public void Create_KeyOutsideStorageRoot_Throws(string storageKey)
    {
        Should.Throw<ArgumentException>(() => MediaFile.Create(storageKey, "x.webp", "image/webp", 1, 1, 1));
    }

    [Fact]
    public void Create_OnlyWidth_Throws()
    {
        Should.Throw<ArgumentException>(() => MediaFile.Create("x.webp", "x.webp", "image/webp", 1, width: 10));
    }

    [Fact]
    public void Create_ZeroSize_Throws()
    {
        Should.Throw<ArgumentOutOfRangeException>(() => MediaFile.Create("x.webp", "x.webp", "image/webp", 0, 1, 1));
    }

    [Fact]
    public void ChangeAltText_Blank_ClearsIt()
    {
        var file = MediaFile.Create("x.webp", "x.webp", "image/webp", 1, 1, 1, "Old text");

        file.ChangeAltText("   ");

        file.AltText.ShouldBeNull();
    }
}
