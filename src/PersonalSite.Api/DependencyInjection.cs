using System.Globalization;
using PersonalSite.Api.Configuration;
using Serilog;
using Serilog.Formatting.Compact;

namespace PersonalSite.Api;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Api-layer services: logging, options, routing, error handling and health checks.
    /// </summary>
    public static IServiceCollection AddApi(this IServiceCollection services)
    {
        services.AddSerilog((serviceProvider, logger) =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var environment = serviceProvider.GetRequiredService<IHostEnvironment>();

            logger
                .ReadFrom.Configuration(configuration)
                .ReadFrom.Services(serviceProvider)
                .Enrich.FromLogContext();

            // Development: readable lines. Production: one JSON object per line (template + typed fields),
            // so log tools can query by field. Always culture-invariant: Persian digits/calendar in logs hurt searching.
            if (environment.IsDevelopment())
            {
                logger.WriteTo.Console(formatProvider: CultureInfo.InvariantCulture);
            }
            else
            {
                logger.WriteTo.Console(new CompactJsonFormatter());
            }
        });

        services.AddOptions<SiteOptions>()
            .BindConfiguration(SiteOptions.SectionName)
            .ValidateDataAnnotations()
            .Validate(options => options.BaseUrl is { IsAbsoluteUri: true }, "Site:BaseUrl must be an absolute URL.")
            .Validate(options => options.Social.IsValid(), "Site:Social: Email must be an email address, GitHub/Telegram absolute https URLs.")
            .ValidateOnStart();

        services.AddRouting(options => options.LowercaseUrls = true);
        services.AddProblemDetails();
        services.AddHealthChecks();

        return services;
    }
}
