using Microsoft.Extensions.DependencyInjection;

namespace PersonalSite.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Application-layer services (feature services, validators).
    /// Called once from the composition root (<c>Program.cs</c>). Empty until the first feature lands.
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        return services;
    }
}
