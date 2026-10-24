using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using PersonalSite.Application.Admin;
using PersonalSite.Application.Resume;
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
        services.AddScoped<AdminDashboardService>();

        // The Api fills ResumeContent from its content files; this validator runs on it at startup (ValidateOnStart).
        services.AddSingleton<IValidateOptions<ResumeContent>, ResumeContentValidator>();
        services.AddSingleton<ResumeService>();

        return services;
    }
}
