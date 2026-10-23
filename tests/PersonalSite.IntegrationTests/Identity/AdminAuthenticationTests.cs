using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Net.Http.Headers;
using PersonalSite.Api.Configuration;
using PersonalSite.Infrastructure.Identity;
using PersonalSite.Infrastructure.Persistence;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Identity;

/// <summary>
/// Identity setup (P5-T1) against the real host and PostgreSQL: the migration creates the tables, the stores and
/// lockout work, and the cookie handler answers like an API. No auth endpoint exists yet (P5-T3), so the cookie
/// scheme is driven directly through HttpContext — the same calls those endpoints and RequireAuthorization make.
/// </summary>
public sealed class AdminAuthenticationTests(WebAppFactory factory)
{
    [Fact]
    public async Task Migrate_FreshDatabase_CreatesIdentityTablesInSnakeCase()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tables = await db.Database
            .SqlQuery<string>($"SELECT table_name AS \"Value\" FROM information_schema.tables WHERE table_schema = 'public'")
            .ToListAsync(TestContext.Current.CancellationToken);

        string[] identityTables =
        [
            "asp_net_users", "asp_net_roles", "asp_net_user_roles", "asp_net_user_claims", "asp_net_user_logins",
            "asp_net_user_tokens", "asp_net_role_claims",
        ];
        identityTables.ShouldBeSubsetOf(tables);
    }

    [Fact]
    public async Task AccessFailed_FiveTimes_LocksUserForFifteenMinutes()
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = new AppUser { UserName = $"lockout-{Guid.NewGuid():N}", Email = $"{Guid.NewGuid():N}@example.com" };
        (await users.CreateAsync(user, "a long enough passphrase")).Succeeded.ShouldBeTrue();

        try
        {
            for (var attempt = 1; attempt < AdminAuthentication.MaxFailedAccessAttempts; attempt++)
            {
                await users.AccessFailedAsync(user);
            }

            (await users.IsLockedOutAsync(user)).ShouldBeFalse();

            await users.AccessFailedAsync(user);

            (await users.IsLockedOutAsync(user)).ShouldBeTrue();
            var lockoutEnd = (await users.GetLockoutEndDateAsync(user)).ShouldNotBeNull();
            (lockoutEnd - DateTimeOffset.UtcNow).ShouldBe(AdminAuthentication.LockoutDuration, TimeSpan.FromMinutes(1));
            user.Id.Version.ShouldBe(7);
        }
        finally
        {
            await users.DeleteAsync(user);
        }
    }

    [Theory]
    [InlineData("short", false)]
    [InlineData("eleven char", false)]
    [InlineData("twelve chars", true)]
    [InlineData("لطفا یک عبارت عبور طولانی", true)]
    public async Task ValidatePassword_ByLengthOnly_AcceptsLongPassphrases(string password, bool expected)
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        var results = await Task.WhenAll(users.PasswordValidators.Select(validator =>
            validator.ValidateAsync(users, new AppUser(), password)));

        results.All(result => result.Succeeded).ShouldBe(expected);
    }

    [Fact]
    public async Task SignIn_Always_IssuesHostPrefixedHttpOnlySecureStrictCookie()
    {
        using var scope = factory.Services.CreateScope();
        var http = NewHttpContext(scope.ServiceProvider);
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "admin")], IdentityConstants.ApplicationScheme));

        await http.SignInAsync(IdentityConstants.ApplicationScheme, principal);

        var cookie = SetCookieHeaderValue.ParseList([.. http.Response.Headers.SetCookie.OfType<string>()])
            .ShouldHaveSingleItem();
        cookie.Name.ToString().ShouldBe(AdminAuthentication.CookieName);
        cookie.HttpOnly.ShouldBeTrue();
        cookie.Secure.ShouldBeTrue();
        cookie.SameSite.ShouldBe(Microsoft.Net.Http.Headers.SameSiteMode.Strict);
        cookie.Path.ToString().ShouldBe("/");
        cookie.Domain.HasValue.ShouldBeFalse();
    }

    [Fact]
    public async Task Challenge_Anonymous_Returns401WithoutRedirect()
    {
        using var scope = factory.Services.CreateScope();
        var http = NewHttpContext(scope.ServiceProvider);

        await http.ChallengeAsync();

        http.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        http.Response.Headers.Location.ShouldBeEmpty();
    }

    [Fact]
    public async Task Forbid_SignedInWithoutPermission_Returns403WithoutRedirect()
    {
        using var scope = factory.Services.CreateScope();
        var http = NewHttpContext(scope.ServiceProvider);

        await http.ForbidAsync();

        http.Response.StatusCode.ShouldBe(StatusCodes.Status403Forbidden);
        http.Response.Headers.Location.ShouldBeEmpty();
    }

    private static DefaultHttpContext NewHttpContext(IServiceProvider services)
    {
        var http = new DefaultHttpContext { RequestServices = services };
        http.Request.Scheme = "https";
        http.Request.Host = new HostString("localhost");
        http.Request.Path = "/api/admin/dashboard";
        return http;
    }
}
