using Microsoft.Extensions.DependencyInjection;

namespace PersonalSite.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Infrastructure implementations of Application interfaces (EF Core, files, email, markdown).
    /// Called once from the composition root (<c>Program.cs</c>). Gets its configuration parameter with EF Core in P0-T5.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        return services;
    }
}
