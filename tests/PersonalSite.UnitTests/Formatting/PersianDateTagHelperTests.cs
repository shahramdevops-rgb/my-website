using Microsoft.AspNetCore.Razor.TagHelpers;
using PersonalSite.Web.Infrastructure.TagHelpers;
using static PersonalSite.UnitTests.Formatting.FormattingTestSupport;

namespace PersonalSite.UnitTests.Formatting;

public sealed class PersianDateTagHelperTests
{
    private static readonly DateTimeOffset _now = new(2026, 7, 1, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Process_AbsoluteDate_RendersTimeElementWithIsoDatetime()
    {
        using var _ = UseCulture("fa");
        var output = Run(new PersianDateTagHelper(CreateDateDisplay(_now)) { Value = new DateTimeOffset(2026, 3, 20, 20, 31, 0, TimeSpan.Zero) });

        output.TagName.ShouldBe("time");
        output.Attributes["datetime"].Value.ShouldBe("2026-03-20T20:31:00Z");
        Text(output).ShouldBe("۱ فروردین ۱۴۰۵");
    }

    [Fact]
    public void Process_Relative_PutsExactDateInTitle()
    {
        using var _ = UseCulture("fa");
        var output = Run(new PersianDateTagHelper(CreateDateDisplay(_now)) { Value = _now.AddDays(-3), Relative = true });

        Text(output).ShouldBe("۳ روز پیش");
        output.Attributes["title"].Value.ShouldBe("۷ تیر ۱۴۰۵");
    }

    // Raw text: the default encoder would turn Persian letters into entities (the app configures a Unicode-wide one).
    private static string Text(TagHelperOutput output) => output.Content.GetContent(NullHtmlEncoder.Default);

    private static TagHelperOutput Run(TagHelper tagHelper)
    {
        var context = new TagHelperContext([], new Dictionary<object, object>(), "id");
        var output = new TagHelperOutput("persian-date", [], (_, _) => Task.FromResult<TagHelperContent>(new DefaultTagHelperContent()));
        tagHelper.Process(context, output);
        return output;
    }
}
