using System.Globalization;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using PersonalSite.Api;
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

// Bootstrap logger: records failures that happen before the host's real logger exists
// (e.g. invalid options caught by ValidateOnStart). AddApi() replaces it once the host is built.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture)
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Services
        .AddApplication()
        .AddInfrastructure()
        .AddApi();

    if (OpenApiGeneration.IsRunning)
    {
        // The build has no connection string or secrets: skip ValidateOnStart, nothing connects anyway.
        builder.Services.RemoveAll<IStartupValidator>();
    }

    var app = builder.Build();

    if (app.Environment.IsDevelopment() && !OpenApiGeneration.IsRunning)
    {
        // Dev convenience: the local DB always matches the code. Production migrates as a deploy step instead.
        await app.Services.MigrateDatabaseAsync(CancellationToken.None);
    }

    // Middleware order matters: each component only sees what runs after it.
    // The exception handler goes first so it can catch failures from everything below; with AddProblemDetails it
    // answers with a ProblemDetails JSON body (no stack trace). Development shows the developer exception page.
    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler();
    }

    // Empty 4xx/5xx responses (e.g. an unknown route's 404) get a ProblemDetails body too.
    app.UseStatusCodePages();
    app.UseMiddleware<SecurityHeadersMiddleware>();
    app.UseSerilogRequestLogging();

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
