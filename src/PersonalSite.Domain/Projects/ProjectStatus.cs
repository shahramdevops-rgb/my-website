namespace PersonalSite.Domain.Projects;

/// <summary>Where a project stands. Stored as a string (rules.md §5), so the order here can change safely.</summary>
public enum ProjectStatus
{
    /// <summary>Running in production; the public card shows the "Live" badge (and the health check, P6-T8).</summary>
    Live,

    InProgress,

    /// <summary>Kept as a case study, no longer maintained; never featured on Home.</summary>
    Archived,
}
