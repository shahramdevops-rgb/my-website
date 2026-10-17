namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Fixed paths of the API. Feature endpoints live under <c>/api</c> (from P2-T2); infrastructure endpoints don't.
/// </summary>
public static class Routes
{
    public const string Health = "/health";
    public const string HealthReady = "/health/ready";
}
