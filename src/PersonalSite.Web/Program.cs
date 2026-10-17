using System.Globalization;
using PersonalSite.Application;
using PersonalSite.Infrastructure;
using PersonalSite.Infrastructure.Persistence;
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

    if (app.Environment.IsDevelopment())
    {
        // Dev convenience: the local DB always matches the code. Production migrates as a deploy step instead.
        await app.Services.MigrateDatabaseAsync(CancellationToken.None);
    }

    // Middleware order matters: each component only sees what runs after it.
    // The exception handler goes first so it can catch failures from everything below.
    // (In Development the developer exception page is enabled automatically instead.)
    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler(Routes.Error);
    }

    app.UseSerilogRequestLogging();
    app.UseRouting();
    // After UseRouting: the culture comes from the {culture} route value, which routing has just matched.
    app.UseRequestLocalization();

    app.MapHealthEndpoints();
    app.MapLanguageRedirect();
    // Serves wwwroot (e.g. the compiled Tailwind CSS) with compression and long-lived caching.
    app.MapStaticAssets();
    app.MapRazorPages().WithStaticAssets();

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
