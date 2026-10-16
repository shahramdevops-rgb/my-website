using System.Globalization;
using PersonalSite.Application;
using PersonalSite.Infrastructure;
using PersonalSite.Web;
using PersonalSite.Web.Endpoints;
using PersonalSite.Web.Infrastructure;
using Serilog;

// Container healthcheck mode: probe /health and exit, without starting a web host (see HealthProbe).
if (args is [HealthProbe.Argument])
{
    return await HealthProbe.RunAsync();
}

// Bootstrap logger: records failures that happen before the host's real logger exists
// (e.g. invalid options caught by ValidateOnStart). AddWeb() replaces it once the host is built.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(formatProvider: CultureInfo.InvariantCulture)
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Services
        .AddApplication()
        .AddInfrastructure()
        .AddWeb();

    var app = builder.Build();

    // Middleware order matters: each component only sees what runs after it.
    // The exception handler goes first so it can catch failures from everything below.
    // (In Development the developer exception page is enabled automatically instead.)
    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler(Routes.Error);
    }

    app.UseSerilogRequestLogging();
    app.UseRouting();

    app.MapHealthEndpoints();
    app.MapRazorPages();

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
