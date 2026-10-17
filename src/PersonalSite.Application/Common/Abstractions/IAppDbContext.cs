namespace PersonalSite.Application.Common.Abstractions;

/// <summary>
/// The database as Application services see it (ADR-004: no repositories, the DbContext already is one).
/// Implemented by <c>AppDbContext</c> in Infrastructure. Each feature adds its <c>DbSet&lt;T&gt;</c> here.
/// </summary>
public interface IAppDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
