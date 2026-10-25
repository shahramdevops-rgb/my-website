using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace PersonalSite.Domain.Common;

/// <summary>
/// The URL segment of a content item: lowercase latin letters and digits in words joined by single hyphens
/// (<c>gym-management-system</c>). Latin only, even for Persian content, so shared links stay readable instead of
/// percent-encoded (architecture.md §4.2). Unique per language, which the database enforces.
/// </summary>
public sealed partial record Slug
{
    public const int MaxLength = 80;

    private Slug(string value) => Value = value;

    public string Value { get; }

    /// <summary>Whether <paramref name="value"/> is a slug as it is, without trimming or lowercasing it.</summary>
    public static bool IsValid([NotNullWhen(true)] string? value) =>
        value is { Length: > 0 and <= MaxLength } && SlugPattern().IsMatch(value);

    public static bool TryCreate([NotNullWhen(true)] string? value, [NotNullWhen(true)] out Slug? slug)
    {
        slug = IsValid(value) ? new Slug(value) : null;
        return slug is not null;
    }

    /// <summary>
    /// Wraps a value the caller has already validated (admin input goes through a validator first).
    /// An invalid value here is a bug, so it throws.
    /// </summary>
    public static Slug Create(string value) =>
        TryCreate(value, out var slug)
            ? slug
            : throw new ArgumentException($"'{value}' is not a slug: use a-z, 0-9 and single hyphens, at most {MaxLength} characters.", nameof(value));

    public override string ToString() => Value;

    // [0-9], not \d: in .NET \d also matches Persian digits. \z, not $: $ also matches before a trailing newline.
    [GeneratedRegex(@"^[a-z0-9]+(?:-[a-z0-9]+)*\z", RegexOptions.CultureInvariant)]
    private static partial Regex SlugPattern();
}
