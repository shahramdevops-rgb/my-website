namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Migration mode, run as <c>dotnet PersonalSite.Api.dll --migrate</c> (in production:
/// <c>docker compose run --rm api --migrate</c>, a step of the deploy script). Applies pending EF Core migrations
/// and exits without starting the web server. A normal start never migrates outside Development (architecture.md §9).
/// </summary>
public static class MigrationCommand
{
    public const string Argument = "--migrate";
}
