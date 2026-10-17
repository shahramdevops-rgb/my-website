using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using PersonalSite.Infrastructure.Persistence;

namespace PersonalSite.IntegrationTests.Infrastructure;

/// <summary>
/// Runs the real app in memory (no network port), connected to its own PostgreSQL container.
/// Registered once per test assembly (see AssemblyInfo.cs): the container starts once, and only one host
/// is built per process, which Serilog's bootstrap logger in Program.cs requires (it can be frozen only once).
/// </summary>
public sealed class WebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    // Not "Development": tests should behave like production (no user-secrets, no developer exception page,
    // no auto-migrate at startup), so this fixture migrates the database itself.
    public const string TestEnvironment = "Testing";

    private readonly PostgresFixture _postgres = new();

    public async ValueTask InitializeAsync()
    {
        await _postgres.InitializeAsync();

        // Accessing Services builds and starts the host, after the container (and its connection string) exists.
        await Services.MigrateDatabaseAsync(TestContext.Current.CancellationToken);
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(TestEnvironment);

        // Added after the app's own sources (appsettings, env vars), so these values win.
        builder.ConfigureAppConfiguration(configuration => configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{AppDbContext.ConnectionStringName}"] = _postgres.ConnectionString,
                ["Serilog:MinimumLevel:Default"] = "Warning",
            }));
    }
}
