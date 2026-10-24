using System.Globalization;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using PersonalSite.Api.Auth;
using PersonalSite.Api.Configuration;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Application.Site;
using Serilog;
using Serilog.Formatting.Compact;

namespace PersonalSite.Api;

public static class DependencyInjection
{
    /// <summary>Largest request body the API accepts, in bytes (1 MB); see <see cref="AddApi"/>.</summary>
    public const long MaxRequestBodySize = 1024 * 1024;

    /// <summary>
    /// Registers Api-layer services: logging, options, admin sign-in, rate limits, routing, error handling, OpenAPI and
    /// health checks.
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
            .Validate(options => options.Name.IsValid(), "Site:Name:Fa and Site:Name:En must be set.")
            .Validate(options => options.Social.IsValid(), "Site:Social: Email must be an email address, GitHub/Telegram absolute https URLs.")
            .ValidateOnStart();

        services.AddResumeContent();
        services.AddReverseProxyHeaders();
        services.AddPersistentDataProtection();
        services.AddAdminAuthentication();
        services.AddScoped<AdminSignIn>();
        services.AddRateLimits();

        // Kestrel accepts 30 MB bodies by default. Every endpoint today takes a few hundred bytes of JSON, so anything
        // bigger is refused (413) before it is buffered: less memory an attacker can make this API hold on a server
        // shared with another app. File uploads (P6) raise the limit on their own endpoint only.
        services.Configure<KestrelServerOptions>(options => options.Limits.MaxRequestBodySize = MaxRequestBodySize);

        services.AddRouting(options => options.LowercaseUrls = true);
        services.AddProblemDetails();

        // Code-first contract (ADR-026): the document is generated from the endpoints' signatures and metadata.
        // The build writes it to openapi/v1.json (see the csproj); it is not served at runtime.
        services.AddOpenApi(options => options
            .UseUnixLineEndings()
            .AddDocumentTransformer((document, _, _) =>
            {
                document.Info.Title = "PersonalSite API";
                document.Info.Description = "JSON API behind the personal site of Mahdi Azghandi.";
                return Task.CompletedTask;
            })
            .AddSchemaTransformer((schema, context, _) =>
            {
                // A custom-bound parameter is just "string" to the generator; list its allowed values.
                if (context.ParameterDescription?.Type == typeof(LanguageParameter))
                {
                    schema.Enum = [.. LanguageParameter.Codes.Select(code => (JsonNode)JsonValue.Create(code))];
                }

                return Task.CompletedTask;
            }));
        services.AddHealthChecks();

        return services;
    }
}
