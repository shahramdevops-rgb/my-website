using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace PersonalSite.Infrastructure.Persistence;

public static class DatabaseMigrator
{
    /// <summary>
    /// Applies pending EF Core migrations. Called at startup in Development only: in production,
    /// migrating is an explicit deploy step (architecture.md §9), so a schema change never happens by surprise
    /// and two app instances never race to migrate.
    /// </summary>
    public static async Task MigrateDatabaseAsync(this IServiceProvider services, CancellationToken ct)
    {
        // The DbContext is scoped, and there is no request scope at startup, so create one.
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.MigrateAsync(ct);
    }
}
