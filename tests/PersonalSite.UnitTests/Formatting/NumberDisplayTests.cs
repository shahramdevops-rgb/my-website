using System.Globalization;
using PersonalSite.Web.Formatting;
using static PersonalSite.UnitTests.Formatting.FormattingTestSupport;

namespace PersonalSite.UnitTests.Formatting;

public sealed class NumberDisplayTests
{
    private readonly NumberDisplay _numbers = new(Localizer);

    [Fact]
    public void Format_LargeNumberInPersian_UsesPersianDigitsAndSeparators()
    {
        using var _ = UseCulture("fa");

        _numbers.Format(1234567).ShouldBe("۱٬۲۳۴٬۵۶۷");
    }

    [Fact]
    public void Format_DecimalInPersian_UsesPersianDecimalSeparator()
    {
        using var _ = UseCulture("fa");

        _numbers.Format(12.5m, "N1").ShouldBe("۱۲٫۵");
    }

    [Theory]
    [InlineData(5, "۵ دقیقه مطالعه")]
    [InlineData(0, "۱ دقیقه مطالعه")]
    public void FormatReadingTime_Minutes_RendersPersianPhrase(int minutes, string expected)
    {
        using var _ = UseCulture("fa");

        _numbers.FormatReadingTime(minutes).ShouldBe(expected);
    }

    [Theory]
    [InlineData("fa", "1405/1/1", "۱۴۰۵/۱/۱")]
    [InlineData("en", "1405/1/1", "1405/1/1")]
    public void NativeDigitsApply_Culture_UsesThatCulturesDigits(string culture, string input, string expected)
    {
        NativeDigits.Apply(input, CultureInfo.GetCultureInfo(culture)).ShouldBe(expected);
    }
}
