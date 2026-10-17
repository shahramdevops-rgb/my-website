using static PersonalSite.UnitTests.Formatting.FormattingTestSupport;

namespace PersonalSite.UnitTests.Formatting;

public sealed class DateDisplayTests
{
    private static readonly DateTimeOffset _now = new(2026, 7, 1, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void FormatDate_KnownUtcDate_RendersPersianDateWithPersianDigits()
    {
        using var _ = UseCulture("fa");

        // 2026-03-20 20:00 UTC = 23:30 in Tehran, still the last day of 1404.
        CreateDateDisplay(_now).FormatDate(new DateTimeOffset(2026, 3, 20, 20, 0, 0, TimeSpan.Zero))
            .ShouldBe("۲۹ اسفند ۱۴۰۴");
    }

    [Fact]
    public void FormatDate_UtcBeforeMidnightButTehranAfter_UsesTehranDay()
    {
        using var _ = UseCulture("fa");

        // 20:31 UTC = 00:01 on 21 March in Tehran (UTC+3:30): Nowruz, although the UTC date is still the 20th.
        CreateDateDisplay(_now).FormatDate(new DateTimeOffset(2026, 3, 20, 20, 31, 0, TimeSpan.Zero))
            .ShouldBe("۱ فروردین ۱۴۰۵");
    }

    [Fact]
    public void FormatDateTime_SummerDate_UsesTehranOffsetWithoutDaylightSaving()
    {
        using var _ = UseCulture("fa");

        // Iran dropped daylight saving time in 2022: summer is UTC+3:30 too (12:00 UTC → 15:30, not 16:30).
        CreateDateDisplay(_now).FormatDateTime(new DateTimeOffset(2026, 7, 1, 12, 0, 0, TimeSpan.Zero))
            .ShouldBe("۱۰ تیر ۱۴۰۵، ۱۵:۳۰");
    }

    [Theory]
    [InlineData(30, "همین الان")]
    [InlineData(5 * 60, "۵ دقیقه پیش")]
    [InlineData(3 * 3600, "۳ ساعت پیش")]
    [InlineData(3 * 86400, "۳ روز پیش")]
    [InlineData(40 * 86400, "۱ خرداد ۱۴۰۵")]      // older than 30 days → the date (2026-05-22 12:00 UTC)
    [InlineData(-3600, "۱۰ تیر ۱۴۰۵")]           // future → the date
    public void FormatRelative_ElapsedTime_PicksMatchingPhrase(int secondsAgo, string expected)
    {
        using var _ = UseCulture("fa");

        CreateDateDisplay(_now).FormatRelative(_now.AddSeconds(-secondsAgo)).ShouldBe(expected);
    }
}
