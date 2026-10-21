using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using PersonalSite.Application.Features;

namespace PersonalSite.Application.Site;

/// <summary>Builds <see cref="SiteInfoDto"/> from configuration (<c>Site</c>) and the public feature flags.</summary>
public sealed class SiteInfoService(IOptions<SiteOptions> options, IVariantFeatureManager features)
{
    public async Task<SiteInfoDto> GetAsync(CancellationToken ct)
    {
        var site = options.Value;

        return new SiteInfoDto(
            new SiteNameDto(site.Name.Fa, site.Name.En),
            new SocialLinksDto(site.Social.Email, site.Social.GitHub, site.Social.Telegram),
            new PublicFeaturesDto(
                NewsletterSignup: await features.IsEnabledAsync(FeatureFlags.NewsletterSignup, ct),
                Comments: await features.IsEnabledAsync(FeatureFlags.CommentsEnabled, ct),
                Analytics: await features.IsEnabledAsync(FeatureFlags.AnalyticsUmami, ct),
                SemanticSearch: await features.IsEnabledAsync(FeatureFlags.AiSemanticSearch, ct)));
    }
}
