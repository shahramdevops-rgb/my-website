using Testcontainers.PostgreSql;

namespace PersonalSite.IntegrationTests.Infrastructure;

/// <summary>
/// A throwaway PostgreSQL server in Docker: started before the first test that needs it, removed afterwards.
/// Same image as compose.yaml, so tests see the same SQL behaviour as dev and production.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public string ConnectionString => _container.GetConnectionString();

    public async ValueTask InitializeAsync() => await _container.StartAsync();

    public ValueTask DisposeAsync() => _container.DisposeAsync();
}
