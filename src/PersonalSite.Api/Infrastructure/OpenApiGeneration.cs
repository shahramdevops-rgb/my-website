using System.Reflection;

namespace PersonalSite.Api.Infrastructure;

/// <summary>
/// Build-time OpenAPI generation (<c>Microsoft.Extensions.ApiDescription.Server</c>) runs this app's
/// <c>Program</c> inside its own tool process, <c>GetDocument.Insider</c>, with a no-op server and none of our
/// secrets. It only needs the endpoints and their metadata, so startup work that needs real config or a database
/// is skipped while it runs.
/// </summary>
public static class OpenApiGeneration
{
    public static bool IsRunning { get; } = Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";
}
