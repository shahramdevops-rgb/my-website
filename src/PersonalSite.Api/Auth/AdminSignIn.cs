using Microsoft.AspNetCore.Identity;
using PersonalSite.Infrastructure.Identity;

namespace PersonalSite.Api.Auth;

/// <summary>
/// Checks the admin's email and password and issues the <c>__Host-admin</c> cookie (P5-T3). Lives in the Api layer
/// because signing in is an HTTP concern (it writes a cookie); it talks to Identity's managers, never to the
/// DbContext. Identity's managers take no cancellation token, so neither does this.
/// </summary>
public sealed partial class AdminSignIn(
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
    IPasswordHasher<AppUser> hasher,
    ILogger<AdminSignIn> logger)
{
    // A hash of nothing in particular, made once with the app's own hasher settings (see RejectSlowly).
    private static string? _decoyHash;

    /// <summary>
    /// True when the credentials belong to an admin who isn't locked out; the cookie is then set on the response.
    /// Every failure looks the same to the caller: unknown email, wrong password, locked account, not an admin.
    /// </summary>
    public async Task<bool> SignInAsync(string email, string password)
    {
        var user = await users.FindByEmailAsync(email);
        if (user is null || !await users.IsInRoleAsync(user, AppRoles.Admin))
        {
            RejectSlowly(password);
            LogRejected(logger, "unknown account");
            return false;
        }

        // isPersistent: the cookie survives a browser restart for the 7-day sliding lifetime (AdminAuthentication).
        // lockoutOnFailure: each wrong password counts towards the 5-failure lockout; a success resets the count.
        var result = await signIn.PasswordSignInAsync(user, password, isPersistent: true, lockoutOnFailure: true);
        if (result.Succeeded)
        {
            return true;
        }

        if (result.IsLockedOut)
        {
            LogLockedOut(logger);
        }
        else
        {
            LogRejected(logger, "wrong password");
        }

        return false;
    }

    public Task SignOutAsync() => signIn.SignOutAsync();

    /// <summary>
    /// Spends the same time as a real password check. Without it an unknown email is answered in ~1 ms and a known
    /// one after a PBKDF2 hash (~50–100 ms), and that difference would tell a stranger which email is the admin's.
    /// </summary>
    private void RejectSlowly(string password)
    {
        var decoy = new AppUser();
        _decoyHash ??= hasher.HashPassword(decoy, Guid.NewGuid().ToString());
        hasher.VerifyHashedPassword(decoy, _decoyHash, password);
    }

    // No email or IP in these lines (architecture.md §7: no PII in logs); request logging has the path and status.
    [LoggerMessage(Level = LogLevel.Information, Message = "Admin sign-in rejected: {Reason}")]
    private static partial void LogRejected(ILogger logger, string reason);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Admin sign-in rejected: the account is locked out after repeated wrong passwords")]
    private static partial void LogLockedOut(ILogger logger);
}
