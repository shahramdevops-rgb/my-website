namespace PersonalSite.Web.Infrastructure;

/// <summary>
/// Fixed, non-localized paths. Public pages get their <c>/{culture}</c> prefix from CultureRouteConvention.
/// </summary>
public static class Routes
{
    public const string Error = "/Error";
    public const string Health = "/health";
    public const string HealthReady = "/health/ready";
}
