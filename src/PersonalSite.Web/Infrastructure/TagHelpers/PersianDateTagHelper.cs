using System.Globalization;
using Microsoft.AspNetCore.Razor.TagHelpers;
using PersonalSite.Web.Formatting;

namespace PersonalSite.Web.Infrastructure.TagHelpers;

/// <summary>
/// <c>&lt;persian-date value="@post.PublishedAt" /&gt;</c> → <c>&lt;time datetime="2026-03-20T20:31:00Z"&gt;۱ فروردین ۱۴۰۵&lt;/time&gt;</c>.
/// Despite the name it follows the request culture (English pages will get English dates).
/// The machine-readable <c>datetime</c> attribute is for search engines and assistive tech; with
/// <c>relative</c> the exact date also goes into <c>title</c>, so "۳ روز پیش" can still be checked on hover.
/// </summary>
[HtmlTargetElement("persian-date", Attributes = "value", TagStructure = TagStructure.WithoutEndTag)]
public sealed class PersianDateTagHelper(DateDisplay dates) : TagHelper
{
    /// <summary>A stored instant (UTC in the database).</summary>
    public DateTimeOffset Value { get; set; }

    /// <summary>Show "۳ روز پیش" instead of the date.</summary>
    public bool Relative { get; set; }

    /// <summary>Include the time of day.</summary>
    public bool WithTime { get; set; }

    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        var exact = WithTime ? dates.FormatDateTime(Value) : dates.FormatDate(Value);

        output.TagName = "time";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Attributes.SetAttribute("datetime", Value.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture));
        if (Relative)
        {
            output.Attributes.SetAttribute("title", exact);
        }

        // SetContent HTML-encodes the text.
        output.Content.SetContent(Relative ? dates.FormatRelative(Value) : exact);
    }
}
