using PersonalSite.Domain.Common;

namespace PersonalSite.UnitTests.Common;

public sealed class SlugTests
{
    [Theory]
    [InlineData("gym")]
    [InlineData("gym-management-system")]
    [InlineData("net-10-on-a-vps")]
    [InlineData("2026")]
    public void TryCreate_ValidSlug_ReturnsSlugWithSameValue(string value)
    {
        var created = Slug.TryCreate(value, out var slug);

        created.ShouldBeTrue();
        slug.ShouldNotBeNull().Value.ShouldBe(value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" gym")]
    [InlineData("Gym")]
    [InlineData("gym_system")]
    [InlineData("gym system")]
    [InlineData("-gym")]
    [InlineData("gym-")]
    [InlineData("gym--system")]
    [InlineData("gym\n")]
    [InlineData("باشگاه")]
    [InlineData("gym-۲")]
    [InlineData("café")]
    public void TryCreate_InvalidSlug_ReturnsFalse(string? value)
    {
        var created = Slug.TryCreate(value, out var slug);

        created.ShouldBeFalse();
        slug.ShouldBeNull();
    }

    [Fact]
    public void IsValid_AtMaxLength_ReturnsTrue()
    {
        var valid = Slug.IsValid(new string('a', Slug.MaxLength));

        valid.ShouldBeTrue();
    }

    [Fact]
    public void IsValid_OverMaxLength_ReturnsFalse()
    {
        var valid = Slug.IsValid(new string('a', Slug.MaxLength + 1));

        valid.ShouldBeFalse();
    }

    [Fact]
    public void Create_InvalidSlug_Throws()
    {
        Should.Throw<ArgumentException>(() => Slug.Create("Not A Slug"));
    }

    [Fact]
    public void Equals_SameValue_IsEqual()
    {
        var first = Slug.Create("gym");
        var second = Slug.Create("gym");

        first.ShouldBe(second);
    }
}
