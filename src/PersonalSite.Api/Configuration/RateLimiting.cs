using System.Globalization;
using System.Net;
using System.Threading.RateLimiting;
using PersonalSite.Api.Infrastructure;

namespace PersonalSite.Api.Configuration;

/// <summary>Names of the rate-limit policies (CLAUDE.md §10). <c>public-forms</c> and <c>public-api</c> follow with P8/P9/P10.</summary>
public static class RateLimitPolicies
{
    public const string Login = "login";
}

/// <summary>
/// Per-client rate limits, partitioned by the client's IP address. That is the real visitor's address because
/// <c>UseForwardedHeaders</c> runs first and believes only the edge proxy, which overwrites any
/// <c>X-Forwarded-For</c> a client sends. Counters live in memory: a restart resets them, which is fine for a
/// single API instance.
/// </summary>
public static class RateLimiting
{
    /// <summary>
    /// <c>login</c>: 10 attempts per IP per 15 minutes. Typos by the admin fit easily; a password-guessing script is
    /// slowed to 40 tries an hour per address. Identity's lockout (5 failures → 15 min, AdminAuthentication) protects
    /// the account across addresses. The limit also caps CPU: every attempt costs one PBKDF2 hash on a server shared
    /// with another production app.
    /// </summary>
    public const int LoginPermitLimit = 10;
    public static readonly TimeSpan LoginWindow = TimeSpan.FromMinutes(15);

    public static IServiceCollection AddRateLimits(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.OnRejected = async (context, _) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
                }

                await context.HttpContext.WriteProblemAsync(
                    StatusCodes.Status429TooManyRequests, "Too many requests.", ErrorCodes.RateLimited);
            };

            // Fixed window, no queue: a rejected request is answered at once instead of holding a connection open.
            options.AddPolicy(RateLimitPolicies.Login, context => RateLimitPartition.GetFixedWindowLimiter(
                ClientAddress(context),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = LoginPermitLimit,
                    Window = LoginWindow,
                    QueueLimit = 0,
                }));
        });

        return services;
    }

    // IPv4 clients can arrive as IPv4-mapped IPv6 (::ffff:203.0.113.7); one key per real address.
    private static string ClientAddress(HttpContext context) =>
        context.Connection.RemoteIpAddress is { } address
            ? (address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address).ToString()
            : IPAddress.None.ToString();
}
