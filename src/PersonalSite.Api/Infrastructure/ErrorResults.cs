using Microsoft.AspNetCore.Http.HttpResults;
using PersonalSite.Application.Common.Results;

namespace PersonalSite.Api.Infrastructure;

/// <summary>Turns an Application <see cref="Error"/> into a ProblemDetails response carrying its <c>code</c>.</summary>
public static class ErrorResults
{
    public static ProblemHttpResult ToProblem(this Error error)
    {
        ArgumentNullException.ThrowIfNull(error);
        return TypedResults.Problem(
            statusCode: error.Kind switch
            {
                ErrorKind.NotFound => StatusCodes.Status404NotFound,
                ErrorKind.Conflict => StatusCodes.Status409Conflict,
                ErrorKind.TooLarge => StatusCodes.Status413PayloadTooLarge,
                _ => StatusCodes.Status400BadRequest,
            },
            title: error.Message,
            extensions: new Dictionary<string, object?> { [ErrorCodes.Member] = error.Code });
    }
}
