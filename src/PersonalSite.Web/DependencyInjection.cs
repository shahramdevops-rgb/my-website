using System.Globalization;
using PersonalSite.Web.Configuration;
using Serilog;
using Serilog.Formatting.Compact;

namespace PersonalSite.Web;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Web-layer services: logging, options, routing, error handling, health checks and Razor Pages.
    /// </summary>
    public static IServiceCollection AddWeb(this IServiceCollection services)
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
            // so log tools can query by field. Logs never use the request culture: the site runs in "fa",
            // and Persian digits/calendar in logs hurt searching. JSON values are culture-invariant by design.
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
            .ValidateOnStart();

        services.AddRouting(options => options.LowercaseUrls = true);
        services.AddProblemDetails();
        services.AddHealthChecks();
        services.AddRazorPages();

        return services;
    }
}
