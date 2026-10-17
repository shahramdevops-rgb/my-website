namespace PersonalSite.Infrastructure.Persistence;

/// <summary>
/// Database settings, filled from <c>ConnectionStrings:Default</c> and validated at startup,
/// so a missing connection string stops the app immediately instead of failing on the first query.
/// </summary>
public sealed class DatabaseOptions
{
    public string ConnectionString { get; set; } = string.Empty;
}
