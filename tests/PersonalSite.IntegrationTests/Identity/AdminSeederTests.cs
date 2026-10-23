using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PersonalSite.Infrastructure;
using PersonalSite.Infrastructure.Identity;
using PersonalSite.Infrastructure.Persistence;
using PersonalSite.Infrastructure.Persistence.Seed;
using PersonalSite.IntegrationTests.Infrastructure;

namespace PersonalSite.IntegrationTests.Identity;

/// <summary>
/// The admin account comes from configuration, once (P5-T2). The tests in this class run one after another on the
/// shared database, and each one leaves it without an admin.
/// </summary>
public sealed class AdminSeederTests(WebAppFactory factory)
{
    private const string _password = "a long enough passphrase";

    [Fact]
    public async Task Seed_NotConfiguredAndNoAdmin_ReturnsNotConfiguredWithoutThrowing()
    {
        using var scope = factory.Services.CreateScope();

        var result = await Seeder(scope.ServiceProvider, new AdminSeedOptions()).SeedAsync(TestContext.Current.CancellationToken);

        result.ShouldBe(AdminSeedResult.NotConfigured);
        (await Users(scope.ServiceProvider).GetUsersInRoleAsync(AppRoles.Admin)).ShouldBeEmpty();
    }

    [Fact]
    public async Task Seed_ConfiguredOnFreshDatabase_CreatesOneAdminWhoCanSignIn()
    {
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        using var scope = factory.Services.CreateScope();
        var users = Users(scope.ServiceProvider);

        try
        {
            var first = await Seeder(scope.ServiceProvider, new AdminSeedOptions { Email = email, Password = _password })
                .SeedAsync(TestContext.Current.CancellationToken);
            // A second run with other values (a later deploy, a changed .env) must not add or change anything.
            var second = await Seeder(scope.ServiceProvider, new AdminSeedOptions { Email = "other@example.com", Password = "another long passphrase" })
                .SeedAsync(TestContext.Current.CancellationToken);

            first.ShouldBe(AdminSeedResult.Created);
            second.ShouldBe(AdminSeedResult.AlreadyExists);
            var admin = (await users.GetUsersInRoleAsync(AppRoles.Admin)).ShouldHaveSingleItem();
            admin.Email.ShouldBe(email);
            admin.EmailConfirmed.ShouldBeTrue();
            admin.LockoutEnabled.ShouldBeTrue();
            (await users.FindByEmailAsync("other@example.com")).ShouldBeNull();

            var signIn = scope.ServiceProvider.GetRequiredService<SignInManager<AppUser>>();
            (await signIn.CheckPasswordSignInAsync(admin, _password, lockoutOnFailure: true)).Succeeded.ShouldBeTrue();
            (await signIn.CheckPasswordSignInAsync(admin, "another long passphrase", lockoutOnFailure: false)).Succeeded.ShouldBeFalse();
        }
        finally
        {
            if (await users.FindByEmailAsync(email) is { } admin)
            {
                await users.DeleteAsync(admin);
            }
        }
    }

    [Fact]
    public async Task Seed_PasswordTooShort_ThrowsAndCreatesNothing()
    {
        var email = $"admin-{Guid.NewGuid():N}@example.com";
        using var scope = factory.Services.CreateScope();

        var error = await Should.ThrowAsync<InvalidOperationException>(() =>
            Seeder(scope.ServiceProvider, new AdminSeedOptions { Email = email, Password = "too short" })
                .SeedAsync(TestContext.Current.CancellationToken));

        error.Message.ShouldContain("create the admin account");
        (await Users(scope.ServiceProvider).FindByEmailAsync(email)).ShouldBeNull();
    }

    [Fact]
    public void StartupValidation_EmailWithoutPassword_Fails()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{AppDbContext.ConnectionStringName}"] = "Host=localhost",
                [$"{AdminSeedOptions.SectionName}:{nameof(AdminSeedOptions.Email)}"] = "admin@example.com",
            })
            .Build();
        using var provider = new ServiceCollection()
            .AddLogging()
            .AddSingleton<IConfiguration>(configuration)
            .AddInfrastructure()
            .BuildServiceProvider();

        Should.Throw<OptionsValidationException>(() => provider.GetRequiredService<IStartupValidator>().Validate())
            .Failures.ShouldContain("Admin:Email and Admin:Password must be set together.");
    }

    [Fact]
    public void Endpoints_Always_OfferNoWayToRegister()
    {
        var patterns = factory.Services.GetServices<EndpointDataSource>()
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText ?? string.Empty)
            .ToList();

        // Sanity check that the list is the real one, then: no sign-up route of any spelling.
        patterns.ShouldContain(pattern => pattern.Contains("site", StringComparison.Ordinal));
        patterns.ShouldNotContain(pattern =>
            pattern.Contains("register", StringComparison.OrdinalIgnoreCase)
            || pattern.Contains("signup", StringComparison.OrdinalIgnoreCase)
            || pattern.Contains("sign-up", StringComparison.OrdinalIgnoreCase));
    }

    private static UserManager<AppUser> Users(IServiceProvider services) =>
        services.GetRequiredService<UserManager<AppUser>>();

    private static AdminSeeder Seeder(IServiceProvider services, AdminSeedOptions options) => new(
        services.GetRequiredService<AppDbContext>(),
        Users(services),
        services.GetRequiredService<RoleManager<IdentityRole<Guid>>>(),
        Options.Create(options),
        NullLogger<AdminSeeder>.Instance);
}
