using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Localization.Routing;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.WebEncoders;
using PersonalSite.Web.Configuration;
using PersonalSite.Web.Formatting;
using PersonalSite.Web.Localization;
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
            .Validate(options => TimeZoneInfo.TryFindSystemTimeZoneById(options.TimeZone, out _), "Site:TimeZone is not a known time zone.")
            .ValidateOnStart();

        services.AddRouting(options =>
        {
            options.LowercaseUrls = true;
            options.ConstraintMap[CultureRouteConstraint.Name] = typeof(CultureRouteConstraint);
        });
        services.AddProblemDetails();
        services.AddHealthChecks();
        services.AddRazorPages(options => options.Conventions.Add(new CultureRouteConvention()))
            .AddViewLocalization();

        services.AddCultureLocalization();

        return services;
    }

    private static void AddCultureLocalization(this IServiceCollection services)
    {
        services.AddOptions<CultureOptions>()
            .BindConfiguration(CultureOptions.SectionName)
            .ValidateDataAnnotations()
            .Validate(options => options.IsValid(), "Localization: unknown culture, or DefaultCulture not in SupportedCultures.")
            .ValidateOnStart();

        // resx files live in Resources/ (SharedResource.fa.resx, later Pages/X.fa.resx for view localization).
        services.AddLocalization(options => options.ResourcesPath = "Resources");
        services.AddSingleton<ILanguageResolver, LanguageResolver>();
        services.AddSingleton<DateDisplay>();
        services.AddSingleton<NumberDisplay>();

        // Razor's encoder by default writes every non-Latin letter as an entity (م → &#x645;), which bloats Persian
        // pages several times over. Allowing all Unicode ranges keeps letters as-is; characters that matter for
        // XSS (< > & " ') are still always encoded.
        services.Configure<WebEncoderOptions>(options => options.TextEncoderSettings = new TextEncoderSettings(UnicodeRanges.All));

        // The URL is the only source of the page language: the {culture} route value sets CurrentCulture and
        // CurrentUICulture. No cookie/header providers here — those only matter for the "/" redirect (LanguageResolver).
        services.AddOptions<RequestLocalizationOptions>()
            .Configure<IOptions<CultureOptions>>((options, cultures) =>
            {
                CultureInfo[] supported = [.. cultures.Value.SupportedCultures.Select(CultureInfo.GetCultureInfo)];
                options.DefaultRequestCulture = new RequestCulture(cultures.Value.DefaultCulture);
                options.SupportedCultures = supported;
                options.SupportedUICultures = supported;
                options.RequestCultureProviders =
                [
                    new RouteDataRequestCultureProvider
                    {
                        RouteDataStringKey = CultureRouteConvention.RouteKey,
                        UIRouteDataStringKey = CultureRouteConvention.RouteKey,
                    },
                ];
                // Adds "Content-Language: fa" to responses.
                options.ApplyCurrentCultureToResponseHeaders = true;
            });
    }
}
