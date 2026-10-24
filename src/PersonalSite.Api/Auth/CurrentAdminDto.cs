namespace PersonalSite.Api.Auth;

/// <summary>Answer of <c>GET /api/auth/me</c>: who is signed in to the admin panel.</summary>
public sealed record CurrentAdminDto(string Email);
