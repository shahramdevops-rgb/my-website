namespace PersonalSite.Application.Site;

/// <summary>Contact links; <c>null</c> = not configured, the front-end hides it.</summary>
public sealed record SocialLinksDto(string? Email, Uri? GitHub, Uri? Telegram);
