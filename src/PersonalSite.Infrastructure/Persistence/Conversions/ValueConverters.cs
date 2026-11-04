using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using PersonalSite.Domain.Common;

namespace PersonalSite.Infrastructure.Persistence.Conversions;

// How domain types that PostgreSQL has no column type for are written to and read from the database. Each converter
// writes the value's canonical text and reads it back through the type's own factory, so a row edited by hand into
// something invalid fails loudly on read instead of producing an entity that breaks the domain rules.

/// <summary><see cref="Language"/> as its lowercase code (<c>fa</c>, <c>en</c>), the same spelling as URLs and JSON.</summary>
internal sealed class LanguageConverter() : ValueConverter<Language, string>(
    language => language.ToString().ToLowerInvariant(),
    code => Enum.Parse<Language>(code, true))
{
    /// <summary>ISO 639-1 codes are two letters.</summary>
    public const int MaxLength = 2;
}

/// <summary><see cref="Slug"/> as its plain value; reading it back re-checks the slug rule.</summary>
internal sealed class SlugConverter() : ValueConverter<Slug, string>(
    slug => slug.Value,
    value => Slug.Create(value));

/// <summary>
/// An absolute <see cref="Uri"/> as the exact text it was created from. <see cref="Uri.OriginalString"/>, not
/// <c>ToString()</c>: the latter unescapes characters, so the stored URL could differ from the one the admin saved,
/// and the domain checks the length of the original string.
/// </summary>
internal sealed class AbsoluteUriConverter() : ValueConverter<Uri, string>(
    uri => uri.OriginalString,
    text => new Uri(text, UriKind.Absolute));
