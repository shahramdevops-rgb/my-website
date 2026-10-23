using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using PersonalSite.Api.Configuration;

namespace PersonalSite.IntegrationTests.Security;

/// <summary>
/// Data Protection keys must outlive the process (P4-T2): a restart or redeploy may not invalidate cookies or form
/// tokens. A "restart" here is a second service provider on the same keys directory. No web host is built (only one
/// per test process is allowed, see WebAppFactory).
/// </summary>
public sealed class DataProtectionKeysTests : IDisposable
{
    private const string _purpose = "test";

    private readonly DirectoryInfo _keysDirectory = Directory.CreateTempSubdirectory("dp-keys-");

    [Fact]
    public void Unprotect_AfterRestartOnSameKeysDirectory_ReadsPayload()
    {
        string token;
        using (var before = BuildProvider(_keysDirectory.FullName))
        {
            token = Protector(before).Protect("payload");
        }

        using var after = BuildProvider(_keysDirectory.FullName);

        Protector(after).Unprotect(token).ShouldBe("payload");
        _keysDirectory.GetFiles("key-*.xml").ShouldNotBeEmpty();
    }

    [Fact]
    public void StartupValidation_RelativeKeysDirectory_Fails()
    {
        using var provider = BuildProvider("data/dp-keys");

        Should.Throw<OptionsValidationException>(() => provider.GetRequiredService<IStartupValidator>().Validate())
            .Failures.ShouldContain("DataProtection:KeysDirectory must be an absolute path.");
    }

    public void Dispose() => _keysDirectory.Delete(recursive: true);

    private static ServiceProvider BuildProvider(string keysDirectory)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"{DataProtectionKeyOptions.SectionName}:{nameof(DataProtectionKeyOptions.KeysDirectory)}"] = keysDirectory,
            })
            .Build();

        return new ServiceCollection()
            .AddLogging()
            .AddSingleton<IConfiguration>(configuration)
            .AddPersistentDataProtection()
            .BuildServiceProvider();
    }

    private static IDataProtector Protector(IServiceProvider provider) =>
        provider.GetRequiredService<IDataProtectionProvider>().CreateProtector(_purpose);
}
