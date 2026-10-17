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

    /// <summary>Contact links shown in the footer (and later on the contact page). Unset ones are simply not shown.</summary>
    public SocialLinks Social { get; set; } = new();

    /// <summary>Only Email, GitHub and Telegram — no LinkedIn or phone for now (CLAUDE.md §5).</summary>
    public sealed class SocialLinks
    {
        /// <summary>e.g. <c>hello@mahdiazghandi.ir</c>.</summary>
        public string? Email { get; set; }

        /// <summary>Profile URL, e.g. <c>https://github.com/name</c>.</summary>
        public Uri? GitHub { get; set; }

        /// <summary>Profile URL, e.g. <c>https://t.me/name</c>.</summary>
        public Uri? Telegram { get; set; }

        internal bool IsValid() =>
            (Email is null || new EmailAddressAttribute().IsValid(Email))
            && GitHub is null or { IsAbsoluteUri: true, Scheme: "https" }
            && Telegram is null or { IsAbsoluteUri: true, Scheme: "https" };
    }
}
