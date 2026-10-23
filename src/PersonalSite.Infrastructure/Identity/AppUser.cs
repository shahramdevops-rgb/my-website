using Microsoft.AspNetCore.Identity;

namespace PersonalSite.Infrastructure.Identity;

/// <summary>
/// An account that can sign in to the admin panel. In practice there is one row, the admin: it is seeded from
/// configuration (P5-T2) and no registration endpoint exists. Stored in the standard Identity tables
/// (<c>asp_net_users</c>, …). Lives in Infrastructure, not Domain: it is the sign-in record of a framework, not a
/// business concept, and the Domain stays free of ASP.NET Core.
/// </summary>
public sealed class AppUser : IdentityUser<Guid>
{
    // Time-ordered UUID v7 like every other key (architecture.md §4), set here instead of left to the database.
    public AppUser() => Id = Guid.CreateVersion7();
}
