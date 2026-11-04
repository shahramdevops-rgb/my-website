using Microsoft.Extensions.Options;
using PersonalSite.Infrastructure.Files;

namespace PersonalSite.UnitTests.Media;

/// <summary>The storage on a real temporary directory, removed after each test.</summary>
public sealed class LocalFileStorageTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), $"personalsite-storage-{Guid.NewGuid():N}");
    private readonly LocalFileStorage _storage;

    public LocalFileStorageTests() =>
        _storage = new LocalFileStorage(Options.Create(new FileStorageOptions { UploadsPath = _root }));

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task SaveAsync_NewKey_StoresBytesThatOpenReadReturns()
    {
        await _storage.SaveAsync("2026/11/a.png", TestImages.OnePixelPng, Ct);

        await using var stream = (await _storage.OpenReadAsync("2026/11/a.png", Ct)).ShouldNotBeNull();
        using var copy = new MemoryStream();
        await stream.CopyToAsync(copy, Ct);
        copy.ToArray().ShouldBe(TestImages.OnePixelPng);
        Directory.GetFiles(Path.Combine(_root, "2026", "11")).ShouldHaveSingleItem(); // no .tmp left behind
    }

    [Fact]
    public async Task SaveAsync_ExistingKey_ThrowsAndKeepsTheFirstFile()
    {
        await _storage.SaveAsync("a.png", TestImages.OnePixelPng, Ct);

        await Should.ThrowAsync<IOException>(() => _storage.SaveAsync("a.png", new byte[] { 1, 2, 3 }, Ct));

        (await File.ReadAllBytesAsync(Path.Combine(_root, "a.png"), Ct)).ShouldBe(TestImages.OnePixelPng);
        Directory.GetFiles(_root).ShouldHaveSingleItem();
    }

    [Fact]
    public async Task OpenReadAsync_MissingKey_ReturnsNull()
    {
        (await _storage.OpenReadAsync("2026/11/missing.png", Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task DeleteAsync_StoredKey_RemovesFileAndToleratesASecondCall()
    {
        await _storage.SaveAsync("a.png", TestImages.OnePixelPng, Ct);

        await _storage.DeleteAsync("a.png", Ct);
        await _storage.DeleteAsync("a.png", Ct);

        File.Exists(Path.Combine(_root, "a.png")).ShouldBeFalse();
    }

    [Theory]
    [InlineData("../outside.png")]
    [InlineData("2026/../../outside.png")]
    [InlineData("/etc/passwd")]
    public async Task AnyOperation_KeyOutsideTheRoot_Throws(string key)
    {
        await Should.ThrowAsync<ArgumentException>(() => _storage.SaveAsync(key, TestImages.OnePixelPng, Ct));
        await Should.ThrowAsync<ArgumentException>(() => _storage.OpenReadAsync(key, Ct));
        await Should.ThrowAsync<ArgumentException>(() => _storage.DeleteAsync(key, Ct));
    }

    [Fact]
    public async Task AnyOperation_SiblingDirectoryWithSamePrefix_Throws()
    {
        // "uploads-old" starts with the same characters as "uploads" but is not inside it.
        var key = $"../{Path.GetFileName(_root)}-old/a.png";

        await Should.ThrowAsync<ArgumentException>(() => _storage.SaveAsync(key, TestImages.OnePixelPng, Ct));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }
}
