namespace PersonalSite.Domain.Common;

/// <summary>
/// An entity whose creation and last-change times are recorded automatically.
/// The setters stay private: <c>AuditInterceptor</c> (Infrastructure) fills the values when changes are saved,
/// so no service has to remember to do it.
/// </summary>
public interface IAuditable
{
    DateTimeOffset CreatedAt { get; }

    DateTimeOffset UpdatedAt { get; }
}
