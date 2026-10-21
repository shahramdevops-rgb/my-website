namespace PersonalSite.Application.Site;

/// <summary>What every page of the front-end needs about the site itself (<c>GET /api/site</c>).</summary>
public sealed record SiteInfoDto(SiteNameDto Name, SocialLinksDto Social, PublicFeaturesDto Features);
