using PersonalSite.Domain.Common;

namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Binds a <c>lang</c> query or route value to <see cref="Language"/>, accepting only the lowercase codes
/// <c>fa</c> and <c>en</c> (rules.md §8); anything else fails binding, which answers 400 ProblemDetails.
/// Minimal APIs' built-in enum binding is not used on purpose: it matches the C# names case-sensitively ("Fa", not
/// "fa") and accepts numbers ("5" binds to an undefined <see cref="Language"/>). In the OpenAPI document the
/// parameter is an enum of <see cref="Codes"/> (see AddApi), so the generated TS type is <c>"fa" | "en"</c>.
/// </summary>
public readonly record struct LanguageParameter(Language Value)
{
    public static readonly IReadOnlyList<string> Codes = ["fa", "en"];

    // Minimal APIs look for this signature to bind a custom type from a string.
    public static bool TryParse(string? value, out LanguageParameter result)
    {
        Language? language = value switch
        {
            "fa" => Language.Fa,
            "en" => Language.En,
            _ => null,
        };

        result = language is { } parsed ? new LanguageParameter(parsed) : default;
        return language is not null;
    }
}
