using Microsoft.AspNetCore.OpenApi;

namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Descriptions taken from XML doc comments get the OS line ending (<c>\r\n</c> on Windows, <c>\n</c> on Linux),
/// so a document built on Mahdi's machine would never match the one CI builds. These transformers force
/// <c>\n</c>. They must be added after the XML-comment transformers, which the OpenAPI source generator registers
/// before our own options code runs.
/// </summary>
public static class OpenApiLineEndings
{
    public static OpenApiOptions UseUnixLineEndings(this OpenApiOptions options)
    {
        options.AddSchemaTransformer((schema, _, _) =>
        {
            schema.Description = Normalize(schema.Description);
            return Task.CompletedTask;
        });

        options.AddOperationTransformer((operation, _, _) =>
        {
            operation.Summary = Normalize(operation.Summary);
            operation.Description = Normalize(operation.Description);
            return Task.CompletedTask;
        });

        return options;
    }

    private static string? Normalize(string? text) => text?.ReplaceLineEndings("\n");
}
