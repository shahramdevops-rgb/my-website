using Microsoft.AspNetCore.Authorization;
using PersonalSite.Infrastructure.Identity;

namespace PersonalSite.Api.Configuration;

/// <summary>Names of the authorization policies (CLAUDE.md §10).</summary>
public static class AuthorizationPolicies
{
    /// <summary>
    /// A signed-in user in the <c>Admin</c> role. Applied once to the whole <c>/api/admin</c> group (ApiEndpoints),
    /// never endpoint by endpoint, so a new admin endpoint can't be added without it (P5-T4).
    /// </summary>
    public const string Admin = "Admin";

    public static AuthorizationBuilder AddAdminPolicy(this AuthorizationBuilder authorization) =>
        authorization.AddPolicy(Admin, policy => policy.RequireAuthenticatedUser().RequireRole(AppRoles.Admin));
}
