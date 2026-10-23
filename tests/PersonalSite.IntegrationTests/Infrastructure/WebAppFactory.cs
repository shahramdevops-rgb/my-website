using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using PersonalSite.Application.Features;
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

    // Known values for tests that check configuration reaches the API. The flags are the opposite of the
    // appsettings.json defaults, so a passing test proves the value came from configuration.
    public const string SocialEmail = "test@example.com";
    public const string SocialGitHub = "https://github.com/example";
    public const string SocialTelegram = "https://t.me/example";
    public const bool NewsletterSignupEnabled = false;
    public const bool SemanticSearchEnabled = true;

    // Stands in for the compose network Caddy sits on (compose.prod.yaml pins 172.30.0.0/24).
    public const string TrustedProxyNetwork = "10.20.30.0/24";

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
                ["Site:Social:Email"] = SocialEmail,
                ["Site:Social:GitHub"] = SocialGitHub,
                ["Site:Social:Telegram"] = SocialTelegram,
                [$"FeatureManagement:{FeatureFlags.NewsletterSignup}"] = NewsletterSignupEnabled.ToString(),
                [$"FeatureManagement:{FeatureFlags.AiSemanticSearch}"] = SemanticSearchEnabled.ToString(),
                ["ReverseProxy:TrustedNetworks:0"] = TrustedProxyNetwork,
            }));
    }
}
