namespace PersonalSite.IntegrationTests.Infrastructure;

/// <summary>
/// Test classes that create or expect the admin account share the one database (WebAppFactory), and some of them
/// assert that no admin exists. xUnit runs the classes of one collection one after another instead of in parallel.
/// Usage: <c>[Collection(AdminAccountTests.Name)]</c> on the class.
/// </summary>
[CollectionDefinition(Name)]
public sealed class AdminAccountTests
{
    public const string Name = "Admin account";
}
