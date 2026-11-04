using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PersonalSite.Api.Endpoints;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Application.Media;
using PersonalSite.Infrastructure.Persistence;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Media;

/// <summary>
/// Uploading through <c>POST /api/admin/media</c> and reading back through <c>GET /media/{key}</c> (P6-T3).
/// In the admin-account collection: these tests sign in as a throwaway admin.
/// </summary>
[Collection(AdminAccountTests.Name)]
public sealed class MediaEndpointsTests(WebAppFactory factory)
{
    private const string _uploadPath = Routes.Api + Routes.Admin + Routes.Media;

    // A complete, valid 1×1 PNG.
    private static readonly byte[] _png = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Upload_RenamedExecutable_Returns400AndStoresNothing()
    {
        // A Windows program sent as "photo.png" with an image content type: both are only what the sender says.
        byte[] executable = [.. "MZ"u8, 0x90, 0x00, 0x03, .. new byte[200]];
        var fileName = $"photo-{Guid.NewGuid():N}.png";
        var filesBefore = StoredFileCount();

        using var response = await UploadAsync(executable, fileName, "image/png");

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await ProblemCodeAsync(response)).ShouldBe("media.unsupported_type");
        StoredFileCount().ShouldBe(filesBefore);
        await using var scope = factory.Services.CreateAsyncScope();
        (await scope.ServiceProvider.GetRequiredService<AppDbContext>().MediaFiles.AnyAsync(f => f.OriginalFileName == fileName, Ct)).ShouldBeFalse();
    }

    [Fact]
    public async Task Upload_ValidImageWithMisleadingNameAndType_StoresItAsWhatItIsAndServesIt()
    {
        // Named .JPG and sent as octet-stream, but the bytes are a PNG: stored and served as image/png.
        using var upload = await UploadAsync(_png, "C:\\fakepath\\Cover.JPG", "application/octet-stream", altText: "  A single pixel  ");

        upload.StatusCode.ShouldBe(HttpStatusCode.Created);
        var file = (await upload.Content.ReadFromJsonAsync<MediaFileDto>(Ct)).ShouldNotBeNull();
        file.ContentType.ShouldBe("image/png");
        file.Url.ShouldStartWith(MediaService.UrlPrefix);
        file.Url.ShouldEndWith(".png");
        upload.Headers.Location.ShouldBe(new Uri(file.Url, UriKind.Relative));
        file.OriginalFileName.ShouldBe("Cover.JPG");
        file.SizeBytes.ShouldBe(_png.Length);
        file.Width.ShouldBe(1);
        file.Height.ShouldBe(1);
        file.AltText.ShouldBe("A single pixel");

        using var client = factory.CreateClient();
        using var served = await client.GetAsync(file.Url, Ct);

        served.StatusCode.ShouldBe(HttpStatusCode.OK);
        served.Content.Headers.ContentType?.MediaType.ShouldBe("image/png");
        (await served.Content.ReadAsByteArrayAsync(Ct)).ShouldBe(_png);
        served.Headers.CacheControl.ShouldNotBeNull().ToString().ShouldBe("public, max-age=31536000, immutable");
        served.Headers.GetValues("X-Content-Type-Options").ShouldBe(["nosniff"]);
    }

    [Fact]
    public async Task Upload_FileOverFiveMegabytes_Returns413()
    {
        // The in-memory test server has no Kestrel body limit, so the request reaches the service's own check.
        var tooLarge = new byte[MediaService.MaxBytes + 1];
        _png.CopyTo(tooLarge, 0);

        using var response = await UploadAsync(tooLarge, "big.png", "image/png");

        response.StatusCode.ShouldBe(HttpStatusCode.RequestEntityTooLarge);
        (await ProblemCodeAsync(response)).ShouldBe("media.too_large");
    }

    [Fact]
    public void UploadEndpoint_Always_RaisesTheBodyLimitForItselfOnly()
    {
        var endpoints = factory.Services.GetServices<EndpointDataSource>().SelectMany(source => source.Endpoints).OfType<RouteEndpoint>().ToList();

        var upload = endpoints.Single(e => e.RoutePattern.RawText == _uploadPath);
        upload.Metadata.GetMetadata<IRequestSizeLimitMetadata>().ShouldNotBeNull().MaxRequestBodySize.ShouldBe(MediaEndpoints.MaxUploadRequestSize);
        MediaEndpoints.MaxUploadRequestSize.ShouldBeLessThan(10 * 1024 * 1024); // the edge proxy's limit
        endpoints.Where(e => e != upload).ShouldAllBe(e => e.Metadata.GetMetadata<IRequestSizeLimitMetadata>() == null);
    }

    [Theory]
    [InlineData("/media/2026/11/0192f000000070008000000000000000.png")]
    [InlineData("/media/..%2F..%2Fappsettings.json")]
    [InlineData("/media/appsettings.json")]
    public async Task Get_KeyWithoutRecord_Returns404(string path)
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri(path, UriKind.Relative), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        response.Headers.CacheControl.ShouldBeNull();
    }

    private async Task<HttpResponseMessage> UploadAsync(byte[] bytes, string fileName, string contentType, string? altText = null)
    {
        await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);
        var cookie = await admin.SignInAsync();

        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(file, "file", fileName);
        if (altText is not null)
        {
            form.Add(new StringContent(altText), "altText");
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        using var request = new HttpRequestMessage(HttpMethod.Post, _uploadPath) { Content = form };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, Ct);
    }

    private static async Task<string?> ProblemCodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<Dictionary<string, object>>(Ct))?.GetValueOrDefault("code")?.ToString();

    private int StoredFileCount() =>
        Directory.Exists(factory.UploadsPath) ? Directory.GetFiles(factory.UploadsPath, "*", SearchOption.AllDirectories).Length : 0;
}
