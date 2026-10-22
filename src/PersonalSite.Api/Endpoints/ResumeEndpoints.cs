using Microsoft.AspNetCore.Http.HttpResults;
using PersonalSite.Api.Infrastructure;
using PersonalSite.Application.Resume;

namespace PersonalSite.Api.Endpoints;

public static class ResumeEndpoints
{
    /// <summary><c>GET /api/resume?lang=fa|en</c>: the structured résumé (ADR-013) in one language.</summary>
    public static IEndpointRouteBuilder MapResumeEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(Routes.Resume, GetResume)
            .WithName("GetResume")
            .WithTags("Resume")
            .WithSummary("The structured résumé in one language.")
            // A missing or unknown ?lang= fails binding before the handler runs; the answer is a ProblemDetails 400.
            .ProducesProblem(StatusCodes.Status400BadRequest);

        return endpoints;
    }

    private static Ok<ResumeProfile> GetResume(LanguageParameter lang, ResumeService resume) =>
        TypedResults.Ok(resume.Get(lang.Value));
}
