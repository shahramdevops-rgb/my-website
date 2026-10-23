using PersonalSite.Infrastructure.Persistence.Seed;

namespace PersonalSite.UnitTests.Persistence;

public sealed class AdminSeedOptionsTests
{
    [Theory]
    [InlineData(null, null, true, false)]
    [InlineData("", " ", true, false)]
    [InlineData("admin@example.com", "a long enough passphrase", true, true)]
    [InlineData("admin@example.com", null, false, false)]
    [InlineData(null, "a long enough passphrase", false, false)]
    public void IsValid_EmailAndPassword_RequiresBothOrNeither(string? email, string? password, bool valid, bool configured)
    {
        var options = new AdminSeedOptions { Email = email, Password = password };

        options.IsValid().ShouldBe(valid);
        options.IsConfigured.ShouldBe(configured);
    }
}
