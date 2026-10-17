namespace PersonalSite.Domain.Common;

/// <summary>
/// Base class for entities: a time-ordered UUID v7 key (index-friendly, safe in admin URLs) plus audit timestamps.
/// </summary>
public abstract class Entity : IAuditable
{
    public Guid Id { get; private init; } = Guid.CreateVersion7();

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }
}
