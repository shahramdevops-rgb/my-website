namespace PersonalSite.Application.Admin;

/// <summary>Counts on the admin dashboard; each links to its admin page (P5-T5).</summary>
public sealed record AdminDashboardDto(
    int Posts,
    int Projects,
    int PendingComments,
    int UnreadMessages,
    int Subscribers);
