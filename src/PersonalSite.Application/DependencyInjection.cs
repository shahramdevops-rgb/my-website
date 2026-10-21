using Microsoft.Extensions.DependencyInjection;
using Microsoft.FeatureManagement;
using PersonalSite.Application.Site;

namespace PersonalSite.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Application-layer services (feature services, validators).
    /// Called once from the composition root (<c>Program.cs</c>).
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        // Flags come from the "FeatureManagement" configuration section (names: Features/FeatureFlags.cs).
        services.AddFeatureManagement();

        services.AddScoped<SiteInfoService>();

        return services;
    }
}
