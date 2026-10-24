namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Fixed paths of the API. Feature endpoints live in the <see cref="Api"/> group (paths below are relative to it);
/// infrastructure endpoints don't.
/// </summary>
public static class Routes
{
    public const string Health = "/health";
    public const string HealthReady = "/health/ready";

    /// <summary>Prefix of every feature endpoint; Caddy routes it to the API (architecture.md §6).</summary>
    public const string Api = "/api";
    public const string Site = "/site";
    public const string Resume = "/resume";

    /// <summary>Admin sign-in (P5-T3): <see cref="Login"/>, <see cref="Logout"/> and <see cref="Me"/> are below it.</summary>
    public const string Auth = "/auth";
    public const string Login = "/login";
    public const string Logout = "/logout";
    public const string Me = "/me";

    /// <summary>Admin endpoints (P5-T4): the whole group requires the <c>Admin</c> policy.</summary>
    public const string Admin = "/admin";
    public const string Dashboard = "/dashboard";
}
