using Microsoft.EntityFrameworkCore;
using PersonalSite.Application.Common.Abstractions;

namespace PersonalSite.Infrastructure.Persistence;

/// <summary>
/// EF Core unit of work for the whole site. Registered as scoped: one instance per HTTP request,
/// because a DbContext tracks entities and is not thread-safe. Becomes an <c>IdentityDbContext</c> in P4.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    /// <summary>Key under <c>ConnectionStrings</c> (env var: <c>ConnectionStrings__Default</c>).</summary>
    public const string ConnectionStringName = "Default";

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Picks up every IEntityTypeConfiguration<T> in Persistence/Configurations.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
