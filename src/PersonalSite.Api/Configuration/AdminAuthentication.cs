using Microsoft.AspNetCore.Identity;
using PersonalSite.Infrastructure.Identity;
using PersonalSite.Infrastructure.Persistence;

namespace PersonalSite.Api.Configuration;

/// <summary>
/// Sign-in for the admin panel (architecture.md §5.3): ASP.NET Core Identity with its EF Core stores, and an
/// authentication cookie. The browser sees one origin (Caddy), so the cookie reaches <c>/api/*</c> on its own: no
/// CORS, no token in JavaScript. Login/logout: <c>AuthEndpoints</c> (P5-T3); the <c>Admin</c> policy follows in P5-T4.
/// </summary>
public static class AdminAuthentication
{
    /// <summary>
    /// The sign-in cookie. The <c>__Host-</c> prefix makes the browser accept it only with <c>Secure</c>,
    /// <c>Path=/</c> and no <c>Domain</c>, so a page on another subdomain or on plain http can't plant or overwrite
    /// it. Browsers treat <c>http://localhost</c> as secure, so dev works too. The front-end's <c>proxy.ts</c> checks
    /// for it to send visitors to the login page (P5-T5) — UX only, the API stays the gate.
    /// </summary>
    public const string CookieName = "__Host-admin";

    public const int MinPasswordLength = 12;
    public const int MaxFailedAccessAttempts = 5;
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(7);

    public static IServiceCollection AddAdminAuthentication(this IServiceCollection services)
    {
        // AddIdentityCore, not AddIdentity: no Razor UI defaults (login page paths, redirects) for an API.
        services
            .AddIdentityCore<AppUser>(options =>
            {
                // Length instead of composition rules (NIST SP 800-63B): a long passphrase beats "P@ssw0rd1".
                options.Password.RequiredLength = MinPasswordLength;
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;

                // 5 wrong passwords in a row lock the account for 15 minutes: at most ~480 guesses a day, however
                // many IPs an attacker has. The `login` rate limit (RateLimiting) slows each IP down further.
                options.Lockout.MaxFailedAccessAttempts = MaxFailedAccessAttempts;
                options.Lockout.DefaultLockoutTimeSpan = LockoutDuration;
                options.Lockout.AllowedForNewUsers = true;

                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager();

        // The Identity cookie is the default scheme: RequireAuthorization() on an endpoint reads this cookie.
        services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();

        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = CookieName;
            // Not readable from JavaScript: an XSS bug can't copy the session out of the browser.
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            // Never sent with a request started by another site: the first CSRF defence (CrossOriginProtectionMiddleware is the second).
            options.Cookie.SameSite = SameSiteMode.Strict;

            // Sliding: a request after more than half of the 7 days issues a fresh cookie, so an admin who uses the
            // panel weekly stays signed in, and an unused session ends 7 days after its last renewal.
            options.ExpireTimeSpan = SessionLifetime;
            options.SlidingExpiration = true;

            // Identity's defaults redirect to a login page (302). An API answers with the status code instead; the
            // front-end decides where to go. UseStatusCodePages turns the empty response into ProblemDetails.
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        services.AddAuthorization();

        return services;
    }
}
