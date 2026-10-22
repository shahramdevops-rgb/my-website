using System.Text.Json;
using System.Text.Json.Serialization;
using PersonalSite.Application.Resume;

namespace PersonalSite.Api.Configuration;

/// <summary>
/// Reads the structured résumé (ADR-013) from <c>Content/resume.{fa,en}.json</c> under the content root into
/// <see cref="ResumeContent"/>. Registered as options with <c>ValidateOnStart</c>: the files are read and checked once,
/// when the app starts, and any problem stops it with a message naming the file and the field.
/// </summary>
public static class ResumeContentLoader
{
    public const string DirectoryName = "Content";

    // Strict on purpose: a typo in a property name, a missing field or a null where text is expected is an error,
    // not a silently empty section on the Resume page.
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web)
    {
        RespectNullableAnnotations = true,
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
    };

    public static IServiceCollection AddResumeContent(this IServiceCollection services)
    {
        services.AddOptions<ResumeContent>()
            .Configure<IHostEnvironment>((content, environment) =>
            {
                var directory = Path.Combine(environment.ContentRootPath, DirectoryName);
                content.Fa = Load(directory, "fa");
                content.En = Load(directory, "en");
            })
            .ValidateOnStart();

        return services;
    }

    private static ResumeProfile Load(string directory, string language)
    {
        var path = Path.Combine(directory, $"resume.{language}.json");

        try
        {
            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<ResumeProfile>(stream, _json)
                ?? throw new JsonException("The file contains null.");
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            throw new InvalidOperationException($"Résumé file {path} could not be read: {ex.Message}", ex);
        }
    }
}
