using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Net.Http.Headers;
using PersonalSite.Api.Auth;
using PersonalSite.Api.Configuration;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Infrastructure.Identity;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Auth;

/// <summary>
/// <c>/api/auth/*</c> (P5-T3) on the real pipeline: Identity on PostgreSQL, the cookie, lockout and the <c>login</c>
/// rate limit. Each test uses its own client IP, so rate-limit counters never leak between tests.
/// </summary>
[Collection(AdminAccountTests.Name)]
public sealed class AuthEndpointsTests(WebAppFactory factory)
{
    private const string _password = "a long enough passphrase";
    private const string _login = Routes.Api + Routes.Auth + Routes.Login;
    private const string _logout = Routes.Api + Routes.Auth + Routes.Logout;
    private const string _me = Routes.Api + Routes.Auth + Routes.Me;

    [Fact]
    public async Task Login_AdminWithRightPassword_Returns204AndPersistentSessionCookie()
    {
        await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);

        var context = await factory.SendAsync(HttpMethods.Post, _login, new { email = admin.Email, password = _password });

        context.Response.StatusCode.ShouldBe(StatusCodes.Status204NoContent);
        context.Response.Headers.CacheControl.ToString().ShouldContain("no-store");
        var cookie = SessionCookie(context).ShouldNotBeNull();
        cookie.Expires.ShouldNotBeNull().ShouldBeGreaterThan(DateTimeOffset.UtcNow.AddDays(6));
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401InvalidCredentialsWithoutCookie()
    {
        await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);

        var context = await factory.SendAsync(HttpMethods.Post, _login, new { email = admin.Email, password = "not the password" });

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        (await context.Response.ReadProblemCodeAsync()).ShouldBe(ErrorCodes.InvalidCredentials);
        SessionCookie(context).ShouldBeNull();
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401SameAsWrongPassword()
    {
        var context = await factory.SendAsync(HttpMethods.Post, _login, new { email = "nobody@example.com", password = _password });

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        (await context.Response.ReadProblemCodeAsync()).ShouldBe(ErrorCodes.InvalidCredentials);
    }

    [Fact]
    public async Task Login_RightPasswordButNotAdmin_Returns401()
    {
        await using var user = await TestUser.CreateAsync(factory, isAdmin: false);

        var context = await factory.SendAsync(HttpMethods.Post, _login, new { email = user.Email, password = _password });

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        SessionCookie(context).ShouldBeNull();
    }

    [Fact]
    public async Task Login_FiveWrongPasswords_LocksOutEvenTheRightPassword()
    {
        await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);
        var from = ApiRequests.NewClientAddress();

        for (var attempt = 0; attempt < AdminAuthentication.MaxFailedAccessAttempts; attempt++)
        {
            await factory.SendAsync(HttpMethods.Post, _login, new { email = admin.Email, password = "not the password" }, from);
        }

        var context = await factory.SendAsync(HttpMethods.Post, _login, new { email = admin.Email, password = _password }, from);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        (await context.Response.ReadProblemCodeAsync()).ShouldBe(ErrorCodes.InvalidCredentials);
        SessionCookie(context).ShouldBeNull();
    }

    [Theory]
    [InlineData("", _password)]
    [InlineData("admin@example.com", "")]
    [InlineData("admin@example.com", null)]
    public async Task Login_MissingField_Returns400(string email, string? password)
    {
        var context = await factory.SendAsync(HttpMethods.Post, _login, new { email, password });

        context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task Login_PasswordLongerThanLimit_Returns400WithoutHashing()
    {
        var context = await factory.SendAsync(HttpMethods.Post, _login,
            new { email = "admin@example.com", password = new string('x', LoginRequest.MaxPasswordLength + 1) });

        context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
        (await context.Response.ReadJsonAsync()).GetProperty("errors").TryGetProperty("password", out _).ShouldBeTrue();
    }

    [Fact]
    public async Task Login_MoreThanLimitFromOneAddress_Returns429WithRetryAfterOnlyForThatAddress()
    {
        var from = ApiRequests.NewClientAddress();
        var attempt = new { email = "nobody@example.com", password = "a guessed password" };

        for (var i = 0; i < RateLimiting.LoginPermitLimit; i++)
        {
            (await factory.SendAsync(HttpMethods.Post, _login, attempt, from)).Response.StatusCode
                .ShouldBe(StatusCodes.Status401Unauthorized);
        }

        var limited = await factory.SendAsync(HttpMethods.Post, _login, attempt, from);
        var otherAddress = await factory.SendAsync(HttpMethods.Post, _login, attempt);

        limited.Response.StatusCode.ShouldBe(StatusCodes.Status429TooManyRequests);
        (await limited.Response.ReadProblemCodeAsync()).ShouldBe(ErrorCodes.RateLimited);
        int.Parse(limited.Response.Headers.RetryAfter.ToString(), System.Globalization.CultureInfo.InvariantCulture)
            .ShouldBeInRange(1, (int)RateLimiting.LoginWindow.TotalSeconds);
        otherAddress.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task Me_Anonymous_Returns401NotCached()
    {
        var context = await factory.SendAsync(HttpMethods.Get, _me);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        context.Response.Headers.CacheControl.ToString().ShouldContain("no-store");
    }

    [Fact]
    public async Task Me_WithSessionCookie_ReturnsAdminEmail()
    {
        await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);
        var cookie = await SignInAsync(admin.Email);

        var context = await factory.SendAsync(HttpMethods.Get, _me, configure: request => request.Headers.Cookie = cookie);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
        (await context.Response.ReadJsonAsync()).GetProperty("email").GetString().ShouldBe(admin.Email);
    }

    [Fact]
    public async Task Logout_WithSessionCookie_Returns204AndExpiresCookie()
    {
        await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);
        var cookie = await SignInAsync(admin.Email);

        var context = await factory.SendAsync(HttpMethods.Post, _logout, configure: request => request.Headers.Cookie = cookie);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status204NoContent);
        SessionCookie(context).ShouldNotBeNull().Expires.ShouldNotBeNull().ShouldBeLessThan(DateTimeOffset.UtcNow);
    }

    /// <summary>Signs in through the endpoint and returns the <c>Cookie</c> header value for later requests.</summary>
    private async Task<string> SignInAsync(string email)
    {
        var context = await factory.SendAsync(HttpMethods.Post, _login, new { email, password = _password });
        var cookie = SessionCookie(context).ShouldNotBeNull();
        return $"{cookie.Name}={cookie.Value}";
    }

    private static SetCookieHeaderValue? SessionCookie(HttpContext context) =>
        SetCookieHeaderValue.ParseList([.. context.Response.Headers.SetCookie.OfType<string>()])
            .SingleOrDefault(cookie => cookie.Name == AdminAuthentication.CookieName);

    /// <summary>A throwaway account, deleted again at the end of the test (the collection expects no admin left).</summary>
    private sealed class TestUser(WebAppFactory factory, string email) : IAsyncDisposable
    {
        public string Email { get; } = email;

        public static async Task<TestUser> CreateAsync(WebAppFactory factory, bool isAdmin)
        {
            using var scope = factory.Services.CreateScope();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            if (!await roles.RoleExistsAsync(AppRoles.Admin))
            {
                (await roles.CreateAsync(new IdentityRole<Guid>(AppRoles.Admin) { Id = Guid.CreateVersion7() })).Succeeded.ShouldBeTrue();
            }

            var email = $"user-{Guid.NewGuid():N}@example.com";
            var user = new AppUser { UserName = email, Email = email, EmailConfirmed = true };
            (await users.CreateAsync(user, _password)).Succeeded.ShouldBeTrue();
            if (isAdmin)
            {
                (await users.AddToRoleAsync(user, AppRoles.Admin)).Succeeded.ShouldBeTrue();
            }

            return new TestUser(factory, email);
        }

        public async ValueTask DisposeAsync()
        {
            using var scope = factory.Services.CreateScope();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            if (await users.FindByEmailAsync(Email) is { } user)
            {
                await users.DeleteAsync(user);
            }
        }
    }
}
