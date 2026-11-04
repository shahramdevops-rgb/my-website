namespace PersonalSite.Application.Common.Results;

/// <summary>What kind of expected failure an <see cref="Error"/> is; the Api turns it into an HTTP status.</summary>
public enum ErrorKind
{
    /// <summary>The input breaks a rule (400).</summary>
    Validation,

    /// <summary>The thing asked for does not exist (404).</summary>
    NotFound,

    /// <summary>The input clashes with existing data, e.g. a slug already taken (409).</summary>
    Conflict,

    /// <summary>The input is bigger than allowed (413).</summary>
    TooLarge,
}

/// <summary>
/// An expected failure (rules.md §6): returned in a <see cref="Result{T}"/>, never thrown. <see cref="Code"/> is
/// stable and the front-end maps it to a localized message; <see cref="Message"/> is English, for developers.
/// </summary>
public sealed record Error(string Code, string Message, ErrorKind Kind);
