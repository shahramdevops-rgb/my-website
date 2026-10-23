namespace PersonalSite.Infrastructure.Persistence.Seed;

/// <summary>
/// The admin account to create on a database that has none, bound from the <c>Admin</c> section
/// (env: <c>Admin__Email</c>, <c>Admin__Password</c>; dev host: user-secrets). Read only while seeding: once the
/// admin exists, both values can (and in production should) be removed from the environment.
/// </summary>
public sealed class AdminSeedOptions
{
    public const string SectionName = "Admin";

    public string? Email { get; set; }

    public string? Password { get; set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Email) && !string.IsNullOrWhiteSpace(Password);

    // Both or neither: an email without a password (or the reverse) is a typo in .env, not "seeding switched off".
    public bool IsValid() => string.IsNullOrWhiteSpace(Email) == string.IsNullOrWhiteSpace(Password);
}
