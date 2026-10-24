using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Constraints;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.DependencyInjection;
using PersonalSite.Api.Configuration;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Infrastructure.Identity;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Auth;

/// <summary>
/// The authorization convention (P5-T4): every endpoint under <c>/api/admin</c> requires the <c>Admin</c> policy.
/// The endpoints are read from the routing table, not listed by hand, so an endpoint added in a later phase is
/// checked without touching this file — including one mapped outside the group by mistake.
/// </summary>
[Collection(AdminAccountTests.Name)]
public sealed class AdminAuthorizationTests(WebAppFactory factory)
{
    private const string _adminPrefix = Routes.Api + Routes.Admin;

    [Fact]
    public void AdminEndpoints_Always_RequireAdminPolicy()
    {
        var endpoints = AdminEndpoints();

        endpoints.ShouldNotBeEmpty();
        endpoints.ShouldAllBe(endpoint => endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>()
            .Any(data => data.Policy == AuthorizationPolicies.Admin));
    }

    [Fact]
    public async Task AdminEndpoints_Anonymous_Return401()
    {
        foreach (var (method, path) in AdminRequests())
        {
            var context = await factory.SendAsync(method, path);

            context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized, $"{method} {path}");
            context.Response.Headers.CacheControl.ToString().ShouldBe("no-store", $"{method} {path}");
        }
    }

    [Fact]
    public async Task AdminEndpoints_SignedInWithoutAdminRole_Return403()
    {
        await using var user = await TestUser.CreateAsync(factory, isAdmin: false);
        var cookie = await CookieForAsync(user.Email);

        foreach (var (method, path) in AdminRequests())
        {
            var context = await factory.SendAsync(method, path, configure: request => request.Headers.Cookie = cookie);

            context.Response.StatusCode.ShouldBe(StatusCodes.Status403Forbidden, $"{method} {path}");
        }
    }

    [Fact]
    public async Task GetDashboard_Admin_ReturnsCounts()
    {
        await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);
        var cookie = await admin.SignInAsync();

        var context = await factory.SendAsync(HttpMethods.Get, _adminPrefix + Routes.Dashboard,
            configure: request => request.Headers.Cookie = cookie);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
        (await context.Response.ReadJsonAsync()).GetProperty("pendingComments").GetInt32().ShouldBe(0);
    }

    private List<RouteEndpoint> AdminEndpoints() =>
        [.. factory.Services.GetServices<EndpointDataSource>()
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Where(endpoint => (endpoint.RoutePattern.RawText ?? string.Empty)
                .StartsWith(_adminPrefix, StringComparison.OrdinalIgnoreCase))];

    /// <summary>One concrete request per endpoint and method, with sample values that satisfy the route constraints.</summary>
    private IEnumerable<(string Method, string Path)> AdminRequests() =>
        from endpoint in AdminEndpoints()
        from method in endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [HttpMethods.Get]
        select (method, SamplePath(endpoint.RoutePattern));

    // A value that fails a route constraint would make routing answer 404 before authorization runs.
    private static string SamplePath(RoutePattern pattern) =>
        "/" + string.Join('/', pattern.PathSegments.Select(segment => string.Concat(segment.Parts.Select(part => part switch
        {
            RoutePatternLiteralPart literal => literal.Content,
            RoutePatternParameterPart parameter when parameter.ParameterPolicies.Any(p => p.ParameterPolicy is GuidRouteConstraint) => Guid.CreateVersion7().ToString(),
            RoutePatternParameterPart parameter when parameter.ParameterPolicies.Any(p => p.ParameterPolicy is IntRouteConstraint or LongRouteConstraint) => "1",
            RoutePatternParameterPart => "sample",
            _ => string.Empty,
        }))));

    /// <summary>
    /// A valid session cookie for a user the login endpoint would refuse (not an admin): issued by the same cookie
    /// handler and Data Protection keys, as if such a user had signed in some other way.
    /// </summary>
    private async Task<string> CookieForAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var signIn = scope.ServiceProvider.GetRequiredService<SignInManager<AppUser>>();
        signIn.Context = new DefaultHttpContext { RequestServices = scope.ServiceProvider };

        await signIn.SignInAsync((await users.FindByEmailAsync(email)).ShouldNotBeNull(), isPersistent: false);

        var cookie = TestUser.SessionCookie(signIn.Context).ShouldNotBeNull();
        return $"{cookie.Name}={cookie.Value}";
    }
}
