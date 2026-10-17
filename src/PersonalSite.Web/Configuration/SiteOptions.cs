using System.ComponentModel.DataAnnotations;

namespace PersonalSite.Web.Configuration;

/// <summary>
/// Site-wide settings bound from the <c>Site</c> configuration section (env var: <c>Site__BaseUrl</c>).
/// Validated at startup, so a missing or invalid value stops the app instead of failing on the first request.
/// </summary>
public sealed class SiteOptions
{
    public const string SectionName = "Site";

    /// <summary>
    /// Canonical public URL (production: <c>https://mahdiazghandi.ir</c>, see architecture.md §9.1).
    /// Used for canonical links, sitemap, feeds and OG tags.
    /// </summary>
    [Required]
    public required Uri BaseUrl { get; set; }

    /// <summary>
    /// IANA time zone in which dates are shown (DB stores UTC). A site setting, not a culture one: an English page
    /// later still shows when something happened in Tehran. Needs tzdata in the image (the "-extra" runtime has it).
    /// </summary>
    [Required]
    public string TimeZone { get; set; } = "Asia/Tehran";
}
