namespace PersonalSite.Api.Auth;

/// <summary>Body of <c>POST /api/auth/login</c>.</summary>
public sealed record LoginRequest(string Email, string Password)
{
    /// <summary>The Identity column's length (<c>asp_net_users.email</c>).</summary>
    public const int MaxEmailLength = 256;

    /// <summary>
    /// Far above any real passphrase. Hashing cost grows with the input, so an unbounded password field would let
    /// one request burn CPU on a server shared with another production app.
    /// </summary>
    public const int MaxPasswordLength = 256;

    /// <summary>Shape checks only (empty, too long); whether the credentials are right is the sign-in's job.</summary>
    public Dictionary<string, string[]> Validate()
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(Email) || Email.Length > MaxEmailLength)
        {
            errors["email"] = [$"Required, at most {MaxEmailLength} characters."];
        }

        if (string.IsNullOrEmpty(Password) || Password.Length > MaxPasswordLength)
        {
            errors["password"] = [$"Required, at most {MaxPasswordLength} characters."];
        }

        return errors;
    }
}
