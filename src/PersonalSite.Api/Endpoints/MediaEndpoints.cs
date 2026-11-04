using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Application.Media;

namespace PersonalSite.Api.Endpoints;

public static class MediaEndpoints
{
    /// <summary>
    /// Largest upload request: the file (<see cref="MediaService.MaxBytes"/>) plus room for the multipart boundaries,
    /// part headers and the alt text. Every other endpoint keeps Kestrel's 1 MB limit (P4-T7).
    /// </summary>
    public const long MaxUploadRequestSize = MediaService.MaxBytes + (64 * 1024);

    // A stored file never changes (a new upload gets a new key), so browsers and caches may keep it for a year
    // without asking again; "immutable" also skips the revalidation request on reload.
    private const string _cacheForever = "public, max-age=31536000, immutable";

    /// <summary><c>POST /api/admin/media</c>: mapped inside the admin group, so it requires the <c>Admin</c> policy.</summary>
    public static IEndpointRouteBuilder MapAdminMediaEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost(Routes.Media, UploadAsync)
            .WithName("UploadMedia")
            .WithSummary("Uploads an image: JPEG, PNG or WebP, at most 5 MB and 10,000 pixels a side.")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
            // Raises Kestrel's body limit for this endpoint only; the routing middleware applies it before the body
            // is read.
            .WithMetadata(new RequestSizeLimitAttribute(MaxUploadRequestSize))
            // Form endpoints ask for ASP.NET's antiforgery token by default. CSRF is already stopped for every unsafe
            // request, forms included, by the SameSite=Strict cookie and the Fetch Metadata check (P5-T3); a token
            // would be a third mechanism and an extra round trip for the admin UI.
            .DisableAntiforgery();

        return endpoints;
    }

    /// <summary>
    /// <c>GET /media/{key}</c>: public, outside <c>/api</c> and the OpenAPI document — it serves files, not JSON.
    /// The key may contain slashes (<c>2026/11/….webp</c>), hence the catch-all parameter.
    /// </summary>
    public static IEndpointRouteBuilder MapMediaEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(Routes.Media + "/{**key}", GetAsync)
            .WithName("GetMedia")
            .ExcludeFromDescription();

        return endpoints;
    }

    private static async Task<Results<Created<MediaFileDto>, ProblemHttpResult>> UploadAsync(
        IFormFile file, [FromForm] string? altText, MediaService media, CancellationToken ct)
    {
        await using var content = file.OpenReadStream();
        var result = await media.UploadAsync(new MediaUpload(content, file.Length, file.FileName, altText), ct);
        return result.IsSuccess
            ? TypedResults.Created(result.Value.Url, result.Value)
            : result.Error.ToProblem();
    }

    private static async Task<Results<FileStreamHttpResult, ProblemHttpResult>> GetAsync(
        string key, MediaService media, HttpResponse response, CancellationToken ct)
    {
        var result = await media.OpenAsync(key, ct);
        if (!result.IsSuccess)
        {
            return result.Error.ToProblem();
        }

        response.Headers.CacheControl = _cacheForever;

        // The content type is the one found in the file's bytes at upload; nosniff (SecurityHeadersMiddleware) stops
        // the browser from guessing another. The result disposes the stream after writing it.
        return TypedResults.Stream(result.Value.Content, result.Value.ContentType);
    }
}
