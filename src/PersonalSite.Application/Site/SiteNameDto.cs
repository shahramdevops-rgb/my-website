namespace PersonalSite.Application.Site;

/// <summary>
/// The site name in both languages. Both are sent at once: the response is the same for every page and locale,
/// so it can be cached as one entry (and the language switcher needs the other name anyway).
/// </summary>
public sealed record SiteNameDto(string Fa, string En);
