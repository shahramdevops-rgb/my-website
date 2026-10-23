using System.Globalization;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using PersonalSite.Api;
using PersonalSite.Api.Configuration;
using PersonalSite.Api.Endpoints;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Application;
using PersonalSite.Infrastructure;
using PersonalSite.Infrastructure.Persistence;
using Serilog;

// Container healthcheck mode: probe /health and exit, without starting a web host (see HealthProbe).
if (args is [HealthProbe.Argument])
{
    return await HealthProbe.RunAsync();
}

// Deploy step: apply migrations and exit (see MigrationCommand). Not passed on as a command-line config value.
var migrateOnly = args is [MigrationCommand.Argument];

// Bootstrap logger: records failures that happen before the host's real logger exists
// (e.g. invalid options caught by ValidateOnStart). AddApi() replaces it once the host is built.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture)
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(migrateOnly ? [] : args);

    builder.Services
        .AddApplication()
        .AddInfrastructure()
        .AddApi();

    if (OpenApiGeneration.IsRunning)
    {
        // The build has no connection string or secrets: skip ValidateOnStart, nothing connects anyway.
        builder.Services.RemoveAll<IStartupValidator>();

        // The tool runs as Production (appsettings.Production.json), but the build machine has no /app/data volume:
        // keep the framework's per-user key location instead of creating the production directory.
        builder.Services.PostConfigure<DataProtectionKeyOptions>(options => options.KeysDirectory = null);
    }

    var app = builder.Build();

    if (migrateOnly)
    {
        // The host is built (configuration, DbContext) but never started: no web server, no startup validation of
        // unrelated options. Only the connection string is needed.
        await app.Services.MigrateDatabaseAsync(CancellationToken.None);
        Log.Information("Migration step finished");
        return 0;
    }

    if (app.Environment.IsDevelopment() && !OpenApiGeneration.IsRunning)
    {
        // Dev convenience: the local DB always matches the code. Production migrates as a deploy step instead.
        await app.Services.MigrateDatabaseAsync(CancellationToken.None);
    }

    // Middleware order matters: each component only sees what runs after it.
    // Forwarded headers first: everything below (HSTS, logging, later rate limits and cookies) must see the client's
    // real IP and the https scheme Caddy received, not Caddy's own address and plain http.
    app.UseForwardedHeaders();

    // The exception handler comes next so it can catch failures from everything below; with AddProblemDetails it
    // answers with a ProblemDetails JSON body (no stack trace). Development shows the developer exception page.
    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler();

        // Strict-Transport-Security on HTTPS responses (default max-age 30 days, no includeSubDomains/preload, so
        // it is easy to back out of). No UseHttpsRedirection: Caddy redirects http → https before the API is reached.
        app.UseHsts();
    }

    // Empty 4xx/5xx responses (e.g. an unknown route's 404) get a ProblemDetails body too.
    app.UseStatusCodePages();
    app.UseMiddleware<SecurityHeadersMiddleware>();
    app.UseSerilogRequestLogging();

    // Reads the admin cookie into HttpContext.User, then enforces RequireAuthorization() on the matched endpoint.
    // After request logging, so a 401/403 is logged too; after forwarded headers, so Secure cookies see https.
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapHealthEndpoints();
    app.MapApiEndpoints();

    await app.RunAsync();
    return 0;
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    // HostAbortedException is thrown on purpose by tools such as `dotnet ef`; it is not a crash.
    Log.Fatal(ex, "Application terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}
