using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using PersonalSite.Api.Auth;
using PersonalSite.Api.Configuration;
using PersonalSite.Api.Infrastructure;

namespace PersonalSite.Api.Endpoints;

public static class AuthEndpoints
{
    /// <summary>
    /// <c>/api/auth/*</c>: sign in, sign out and "who am I" for the admin panel (architecture.md §5.5). The cookie does
    /// the rest: the browser sends it with every same-origin <c>/api</c> request. POSTs also pass the cross-origin
    /// check (403) before they get here.
    /// </summary>
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var auth = endpoints.MapGroup(Routes.Auth).WithTags("Auth");

        auth.MapPost(Routes.Login, LoginAsync)
            .WithName("Login")
            .WithSummary("Signs the admin in and sets the session cookie.")
            .RequireRateLimiting(RateLimitPolicies.Login)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        // No sign-in required: signing out twice, or with an expired cookie, is not an error.
        auth.MapPost(Routes.Logout, LogoutAsync)
            .WithName("Logout")
            .WithSummary("Ends the admin session and clears the cookie.")
            .ProducesProblem(StatusCodes.Status403Forbidden);

        auth.MapGet(Routes.Me, GetMe)
            .WithName("GetCurrentAdmin")
            .WithSummary("The signed-in admin, or 401.")
            .RequireAuthorization(AuthorizationPolicies.Admin)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return endpoints;
    }

    private static async Task<Results<NoContent, ValidationProblem, ProblemHttpResult>> LoginAsync(
        LoginRequest request, AdminSignIn signIn)
    {
        if (request.Validate() is { Count: > 0 } errors)
        {
            return TypedResults.ValidationProblem(errors);
        }

        // The return URL after sign-in is the front-end's business (local paths only), never a query value here:
        // an API that redirects to whatever it is given is an open redirect.
        return await signIn.SignInAsync(request.Email, request.Password)
            ? TypedResults.NoContent()
            : TypedResults.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Invalid credentials.",
                extensions: new Dictionary<string, object?> { [ErrorCodes.Member] = ErrorCodes.InvalidCredentials });
    }

    private static async Task<NoContent> LogoutAsync(AdminSignIn signIn)
    {
        await signIn.SignOutAsync();
        return TypedResults.NoContent();
    }

    // The cookie's principal carries the email claim Identity added at sign-in; no database round trip.
    private static Ok<CurrentAdminDto> GetMe(ClaimsPrincipal user) =>
        TypedResults.Ok(new CurrentAdminDto(user.FindFirstValue(ClaimTypes.Email) ?? user.Identity?.Name ?? string.Empty));
}
