using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Net.Http.Headers;
using PersonalSite.Api.Configuration;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Infrastructure.Identity;

namespace PersonalSite.IntegrationTests.Infrastructure;

/// <summary>
/// A throwaway account, deleted again when the test disposes it: tests in <see cref="AdminAccountTests"/> expect no
/// admin left behind. <c>await using var admin = await TestUser.CreateAsync(factory, isAdmin: true);</c>
/// </summary>
public sealed class TestUser(WebAppFactory factory, string email) : IAsyncDisposable
{
    public const string Password = "a long enough passphrase";

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
        (await users.CreateAsync(user, Password)).Succeeded.ShouldBeTrue();
        if (isAdmin)
        {
            (await users.AddToRoleAsync(user, AppRoles.Admin)).Succeeded.ShouldBeTrue();
        }

        return new TestUser(factory, email);
    }

    /// <summary>Signs in through <c>POST /api/auth/login</c> and returns the <c>Cookie</c> header for later requests.</summary>
    public async Task<string> SignInAsync()
    {
        var context = await factory.SendAsync(HttpMethods.Post, Routes.Api + Routes.Auth + Routes.Login, new { email = Email, password = Password });
        var cookie = SessionCookie(context).ShouldNotBeNull();
        return $"{cookie.Name}={cookie.Value}";
    }

    /// <summary>The admin session cookie a response sets, if any.</summary>
    public static SetCookieHeaderValue? SessionCookie(HttpContext context) =>
        SetCookieHeaderValue.ParseList([.. context.Response.Headers.SetCookie.OfType<string>()])
            .SingleOrDefault(cookie => cookie.Name == AdminAuthentication.CookieName);

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
