using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PersonalSite.Application.Common.Abstractions;
using PersonalSite.Infrastructure.Identity;

namespace PersonalSite.Infrastructure.Persistence;

/// <summary>
/// EF Core unit of work for the whole site. Registered as scoped: one instance per HTTP request,
/// because a DbContext tracks entities and is not thread-safe. Derives from <c>IdentityDbContext</c>, so the
/// Identity tables (users, roles, claims, logins, tokens) live in the same database and migrations as the content.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options), IAppDbContext
{
    /// <summary>Key under <c>ConnectionStrings</c> (env var: <c>ConnectionStrings__Default</c>).</summary>
    public const string ConnectionStringName = "Default";

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // First: maps the Identity tables. Configurations below may refine them, never the other way round.
        base.OnModelCreating(builder);

        // Picks up every IEntityTypeConfiguration<T> in Persistence/Configurations.
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
