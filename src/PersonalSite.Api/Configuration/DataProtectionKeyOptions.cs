using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.Extensions.Options;

namespace PersonalSite.Api.Configuration;

/// <summary>
/// Where the Data Protection key ring is stored, bound from the <c>DataProtection</c> section. The keys sign and
/// encrypt the admin cookie (P5) and the form timing tokens (P8/P9). Inside a container the default location is
/// thrown away with the container, so every deploy would log the admin out and reject forms that were open;
/// production keeps them in the <c>dpkeys</c> volume (appsettings.Production.json: <c>/app/data/dp-keys</c>).
/// </summary>
public sealed class DataProtectionKeyOptions
{
    public const string SectionName = "DataProtection";

    /// <summary>
    /// Fixed name that isolates this app's keys. Without it the name defaults to the content root path, so
    /// moving the app to another folder would silently start a new key ring.
    /// </summary>
    public const string ApplicationName = "PersonalSite";

    /// <summary>Absolute directory for the key files. Unset (dev, tests): the framework's per-user default.</summary>
    public string? KeysDirectory { get; set; }

    // Rooted, not "fully qualified": /app/data/dp-keys is a Linux path, and also has to pass when checked on Windows.
    public bool IsValid() => KeysDirectory is null || Path.IsPathRooted(KeysDirectory);
}

public static class DataProtectionRegistration
{
    public static IServiceCollection AddPersistentDataProtection(this IServiceCollection services)
    {
        services.AddOptions<DataProtectionKeyOptions>()
            .BindConfiguration(DataProtectionKeyOptions.SectionName)
            .Validate(options => options.IsValid(), "DataProtection:KeysDirectory must be an absolute path.")
            .ValidateOnStart();

        services.AddDataProtection().SetApplicationName(DataProtectionKeyOptions.ApplicationName);

        // What PersistKeysToFileSystem does, but with the directory read from options when they are first used,
        // not when services are registered. Keys are stored unencrypted (no certificate): the volume is the boundary.
        services.AddOptions<KeyManagementOptions>()
            .Configure<IOptions<DataProtectionKeyOptions>, ILoggerFactory>((keyManagement, keys, loggerFactory) =>
            {
                if (keys.Value.KeysDirectory is { } directory)
                {
                    keyManagement.XmlRepository = new FileSystemXmlRepository(new DirectoryInfo(directory), loggerFactory);
                }
            });

        return services;
    }
}
