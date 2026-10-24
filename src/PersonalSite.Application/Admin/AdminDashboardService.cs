using System.Diagnostics.CodeAnalysis;

namespace PersonalSite.Application.Admin;

/// <summary>
/// Builds <see cref="AdminDashboardDto"/>. Every count is zero until its feature exists: projects (P6), posts (P7),
/// comments (P8), messages (P9), subscribers (P14) — each of those tasks replaces its zero with a real query.
/// </summary>
public sealed class AdminDashboardService
{
    [SuppressMessage("Performance", "CA1822:Mark members as static",
        Justification = "A DI service: the counts become queries through an injected IAppDbContext from P6 on.")]
    public Task<AdminDashboardDto> GetAsync(CancellationToken ct) =>
        Task.FromResult(new AdminDashboardDto(Posts: 0, Projects: 0, PendingComments: 0, UnreadMessages: 0, Subscribers: 0));
}
