using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PersonalSite.Domain.Common;

namespace PersonalSite.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Sets <see cref="IAuditable.CreatedAt"/> and <see cref="IAuditable.UpdatedAt"/> just before EF Core saves,
/// using <see cref="TimeProvider"/> (UTC, replaceable in tests).
/// </summary>
public sealed class AuditInterceptor(TimeProvider timeProvider) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ApplyAuditTimestamps(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditTimestamps(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    internal void ApplyAuditTimestamps(DbContext? dbContext)
    {
        if (dbContext is null)
        {
            return;
        }

        var now = timeProvider.GetUtcNow();

        foreach (var entry in dbContext.ChangeTracker.Entries<IAuditable>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Property(e => e.CreatedAt).CurrentValue = now;
                    entry.Property(e => e.UpdatedAt).CurrentValue = now;
                    break;

                case EntityState.Modified:
                    // CreatedAt is written once; an update must never overwrite it.
                    entry.Property(e => e.CreatedAt).IsModified = false;
                    entry.Property(e => e.UpdatedAt).CurrentValue = now;
                    break;
            }
        }
    }
}
