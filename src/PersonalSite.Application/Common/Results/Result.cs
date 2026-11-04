namespace PersonalSite.Application.Common.Results;

/// <summary>
/// Either a value or an <see cref="Common.Results.Error"/>. A service returns one for outcomes the caller must
/// handle (not found, invalid input); exceptions stay for bugs and broken infrastructure. Both sides convert
/// implicitly, so a service writes <c>return dto;</c> or <c>return MediaErrors.TooLarge;</c>.
/// </summary>
public sealed class Result<T>
{
    private readonly T? _value;
    private readonly Error? _error;

    private Result(T? value, Error? error)
    {
        _value = value;
        _error = error;
    }

    public bool IsSuccess => _error is null;

    /// <summary>The value; reading it from a failed result is a bug and throws.</summary>
    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException($"A failed result has no value (error {_error!.Code}).");

    /// <summary>The error; reading it from a successful result is a bug and throws.</summary>
    public Error Error => _error ?? throw new InvalidOperationException("A successful result has no error.");

    public static implicit operator Result<T>(T value) => new(value, null);

    public static implicit operator Result<T>(Error error) => new(default, error ?? throw new ArgumentNullException(nameof(error)));
}
