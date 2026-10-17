using Microsoft.EntityFrameworkCore;
using PersonalSite.Domain.Common;
using PersonalSite.Infrastructure.Persistence.Interceptors;

namespace PersonalSite.UnitTests.Persistence;

/// <summary>
/// Exercises the interceptor against EF's change tracker only. Nothing is saved, so no database is needed:
/// the Npgsql provider is configured just so EF can build a model.
/// </summary>
public sealed class AuditInterceptorTests
{
    private static readonly DateTimeOffset _createdTime = new(2026, 1, 1, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset _updatedTime = new(2026, 1, 2, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void ApplyAuditTimestamps_AddedEntity_SetsCreatedAtAndUpdatedAt()
    {
        using var dbContext = new TestDbContext();
        var entity = new TestEntity();
        dbContext.Add(entity);

        new AuditInterceptor(new FixedTimeProvider(_createdTime)).ApplyAuditTimestamps(dbContext);

        Assert.Equal(_createdTime, entity.CreatedAt);
        Assert.Equal(_createdTime, entity.UpdatedAt);
    }

    [Fact]
    public void ApplyAuditTimestamps_ModifiedEntity_UpdatesOnlyUpdatedAt()
    {
        using var dbContext = new TestDbContext();
        var entity = new TestEntity();
        dbContext.Add(entity);
        new AuditInterceptor(new FixedTimeProvider(_createdTime)).ApplyAuditTimestamps(dbContext);
        dbContext.Entry(entity).State = EntityState.Modified;

        new AuditInterceptor(new FixedTimeProvider(_updatedTime)).ApplyAuditTimestamps(dbContext);

        Assert.Equal(_createdTime, entity.CreatedAt);
        Assert.Equal(_updatedTime, entity.UpdatedAt);
        Assert.False(dbContext.Entry(entity).Property(e => e.CreatedAt).IsModified);
    }

    private sealed class TestEntity : Entity;

    private sealed class TestDbContext : DbContext
    {
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) =>
            optionsBuilder.UseNpgsql("Host=unused");

        protected override void OnModelCreating(ModelBuilder modelBuilder) =>
            modelBuilder.Entity<TestEntity>();
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }
}
