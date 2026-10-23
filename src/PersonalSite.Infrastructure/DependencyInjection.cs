using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using PersonalSite.Application.Common.Abstractions;
using PersonalSite.Infrastructure.Persistence;
using PersonalSite.Infrastructure.Persistence.Interceptors;
using PersonalSite.Infrastructure.Persistence.Seed;

namespace PersonalSite.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Infrastructure implementations of Application interfaces (EF Core, files, email, markdown).
    /// Called once from the composition root (<c>Program.cs</c>).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddPersistence();

        return services;
    }

    private static void AddPersistence(this IServiceCollection services)
    {
        // The connection string is read from IConfiguration when options are first resolved, not here,
        // so hosts that add configuration later (e.g. WebApplicationFactory in tests) still win.
        services.AddOptions<DatabaseOptions>()
            .Configure<IConfiguration>((options, configuration) =>
                options.ConnectionString = configuration.GetConnectionString(AppDbContext.ConnectionStringName) ?? string.Empty)
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.ConnectionString),
                $"ConnectionStrings:{AppDbContext.ConnectionStringName} is not set.")
            .ValidateOnStart();

        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<AuditInterceptor>();

        services.AddDbContext<AppDbContext>((serviceProvider, options) => options
            .UseNpgsql(serviceProvider.GetRequiredService<IOptions<DatabaseOptions>>().Value.ConnectionString)
            .UseSnakeCaseNamingConvention()
            .AddInterceptors(serviceProvider.GetRequiredService<AuditInterceptor>()));

        // Same scoped instance whether a service asks for the interface or the concrete type.
        services.AddScoped<IAppDbContext>(serviceProvider => serviceProvider.GetRequiredService<AppDbContext>());

        // The single admin account (P5-T2). Both-or-neither is checked at web start; --migrate checks it when seeding.
        services.AddOptions<AdminSeedOptions>()
            .BindConfiguration(AdminSeedOptions.SectionName)
            .Validate(options => options.IsValid(), "Admin:Email and Admin:Password must be set together.")
            .ValidateOnStart();
        services.AddScoped<AdminSeeder>();

        // Readiness check: can we open a connection and run a query? Exposed at /health/ready.
        services.AddHealthChecks().AddDbContextCheck<AppDbContext>(name: "database");
    }
}
