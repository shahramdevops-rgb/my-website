using System.Runtime.CompilerServices;

namespace PersonalSite.Domain.Common;

/// <summary>
/// Input checks for entity methods. Admin input is validated in Application before it gets here, so a failed check
/// is a bug in the caller: it throws instead of returning a <c>Result</c> (rules.md §5–6).
/// </summary>
internal static class Guard
{
    /// <summary>Required text: trimmed, not blank, at most <paramref name="maxLength"/> characters.</summary>
    public static string Text(string value, int maxLength, [CallerArgumentExpression(nameof(value))] string? paramName = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value, paramName);
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength
            ? trimmed
            : throw new ArgumentException($"Must be at most {maxLength} characters.", paramName);
    }

    /// <summary>Optional text: trimmed; blank becomes <see langword="null"/>.</summary>
    public static string? OptionalText(string? value, int maxLength, [CallerArgumentExpression(nameof(value))] string? paramName = null) =>
        string.IsNullOrWhiteSpace(value) ? null : Text(value, maxLength, paramName);

    /// <summary>
    /// An absolute web link without credentials (<c>https://user:pass@…</c> would publish them). http is allowed
    /// only when <paramref name="httpsOnly"/> is false.
    /// </summary>
    public static Uri? WebUrl(Uri? url, int maxLength, bool httpsOnly, [CallerArgumentExpression(nameof(url))] string? paramName = null)
    {
        if (url is null)
        {
            return null;
        }

        var schemeAllowed = url.IsAbsoluteUri
            && (url.Scheme == Uri.UriSchemeHttps || (!httpsOnly && url.Scheme == Uri.UriSchemeHttp));
        if (!schemeAllowed)
        {
            throw new ArgumentException(httpsOnly ? "Must be an absolute https URL." : "Must be an absolute http(s) URL.", paramName);
        }

        if (url.UserInfo.Length > 0)
        {
            throw new ArgumentException("Must not contain a user name or password.", paramName);
        }

        return url.OriginalString.Length <= maxLength
            ? url
            : throw new ArgumentException($"Must be at most {maxLength} characters.", paramName);
    }
}
