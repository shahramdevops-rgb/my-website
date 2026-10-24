using Microsoft.AspNetCore.Http;
using PersonalSite.Api.Infrastructure;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Security;

/// <summary>
/// CSRF defence (P5-T3): an unsafe request a browser sends for another site is refused before any endpoint runs.
/// <c>POST /api/auth/logout</c> is the probe: it needs no account and answers 204 when it is reached.
/// </summary>
public sealed class CrossOriginProtectionTests(WebAppFactory factory)
{
    private const string _logout = Routes.Api + Routes.Auth + Routes.Logout;

    [Theory]
    [InlineData("cross-site")]
    [InlineData("same-site")]
    public async Task Post_FetchMetadataFromAnotherOrigin_Returns403(string fetchSite)
    {
        var context = await PostLogoutAsync(request => request.Headers[CrossOriginProtectionMiddleware.FetchSiteHeader] = fetchSite);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status403Forbidden);
        (await context.Response.ReadProblemCodeAsync()).ShouldBe(ErrorCodes.CrossOriginRequest);
    }

    [Theory]
    [InlineData("https://evil.example")]
    [InlineData("https://localhost")]
    [InlineData("http://localhost:3000")]
    [InlineData("null")]
    public async Task Post_ForeignOriginWithoutFetchMetadata_Returns403(string origin)
    {
        var context = await PostLogoutAsync(request => request.Headers.Origin = origin);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status403Forbidden);
    }

    [Theory]
    [InlineData("same-origin")]
    [InlineData("none")]
    public async Task Post_SameOriginFetchMetadata_ReachesEndpoint(string fetchSite)
    {
        // A cross-site Origin next to it doesn't matter: Sec-Fetch-Site is the stronger signal and wins.
        var context = await PostLogoutAsync(request =>
        {
            request.Headers[CrossOriginProtectionMiddleware.FetchSiteHeader] = fetchSite;
            request.Headers.Origin = "https://evil.example";
        });

        context.Response.StatusCode.ShouldBe(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task Post_MatchingOriginWithoutFetchMetadata_ReachesEndpoint()
    {
        var context = await PostLogoutAsync(request => request.Headers.Origin = "http://localhost");

        context.Response.StatusCode.ShouldBe(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task Post_NoBrowserHeaders_ReachesEndpoint()
    {
        // The Next.js server, curl: no cookies of a victim to abuse, so nothing to check.
        var context = await PostLogoutAsync();

        context.Response.StatusCode.ShouldBe(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task Get_CrossSite_IsNotChecked()
    {
        var context = await factory.SendAsync(HttpMethods.Get, Routes.Api + Routes.Site,
            configure: request => request.Headers[CrossOriginProtectionMiddleware.FetchSiteHeader] = "cross-site");

        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
    }

    private Task<HttpContext> PostLogoutAsync(Action<HttpRequest>? configure = null) =>
        factory.SendAsync(HttpMethods.Post, _logout, configure: configure);
}
